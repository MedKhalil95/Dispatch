using System.Collections.Concurrent;
using AuthService;

var builder = WebApplication.CreateBuilder(args);

if (Environment.GetEnvironmentVariable("ASPNETCORE_URLS") is null)
{
    builder.WebHost.UseUrls("http://0.0.0.0:5087");
}

var app = builder.Build();

// ---- simple brute-force protection: 5 failed attempts locks a username
// out for 60s. In-memory only (this service is meant to run as a single
// instance) — swap for a shared cache (Redis, etc.) if you scale it out.
var failedAttempts = new ConcurrentDictionary<string, (int Count, DateTime LockedUntilUtc)>();
const int MaxAttempts = 5;
var lockoutWindow = TimeSpan.FromSeconds(60);

app.MapGet("/healthz", () => Results.Ok(new { status = "ok", service = "auth" }));

app.MapPost("/api/authenticate", (AuthRequest req) =>
{
    var username = (req.Username ?? "").Trim().ToLowerInvariant();
    var password = req.Password ?? "";

    if (failedAttempts.TryGetValue(username, out var state) && state.Count >= MaxAttempts && DateTime.UtcNow < state.LockedUntilUtc)
    {
        var waitSeconds = (int)(state.LockedUntilUtc - DateTime.UtcNow).TotalSeconds;
        return Results.Json(new { error = $"Too many attempts. Try again in {waitSeconds}s." }, statusCode: 429);
    }

    var account = SeedData.Users.FirstOrDefault(u => u.Username == username);
    if (account is null || account.Password != password)
    {
        failedAttempts.AddOrUpdate(
            username,
            _ => (1, DateTime.UtcNow.Add(lockoutWindow)),
            (_, prev) => (prev.Count + 1, DateTime.UtcNow.Add(lockoutWindow)));
        return Results.Json(new { error = "Incorrect username or password." }, statusCode: 401);
    }

    failedAttempts.TryRemove(username, out _);
    return Results.Ok(account.ToPublicDict());
});

app.MapGet("/api/users", () =>
    Results.Ok(SeedData.Users.Select(u => u.ToPublicDict())));

app.MapGet("/api/users/{username}", (string username) =>
{
    var account = SeedData.Users.FirstOrDefault(u => u.Username == username.ToLowerInvariant());
    return account is null ? Results.NotFound() : Results.Ok(account.ToPublicDict());
});

app.Run();

public record AuthRequest(string? Username, string? Password);
