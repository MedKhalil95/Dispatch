using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace DispatchApp;

public class DirectoryUser
{
    [JsonPropertyName("username")] public string Username { get; set; } = "";
    [JsonPropertyName("role")] public string Role { get; set; } = "";
    [JsonPropertyName("display_name")] public string DisplayName { get; set; } = "";
    [JsonPropertyName("phone")] public string Phone { get; set; } = "";
}

/// <summary>
/// Login now lives in the separate AuthService microservice — this app
/// never sees or stores a password. On login, DispatchApp calls
/// AuthService's /api/authenticate and, if it succeeds, starts a local
/// session (the cookie the browser holds is still issued by this app,
/// since AuthService is a stateless service-to-service API, not something
/// the browser talks to directly).
///
/// The user directory (display names, phones, roles — needed all over the
/// app to render tasks/rosters) is fetched from AuthService once at
/// startup and cached in memory, refreshed on a timer. If AuthService is
/// unreachable when this app starts, it retries in the background rather
/// than crashing, so a transient ordering issue on deploy doesn't take
/// the whole app down.
/// </summary>
public class UserDirectory
{
    private readonly HttpClient _http;
    private readonly ILogger<UserDirectory> _logger;
    private volatile Dictionary<string, DirectoryUser> _byUsername = new();

    public UserDirectory(HttpClient http, ILogger<UserDirectory> logger)
    {
        _http = http;
        _logger = logger;
    }

    public async Task RefreshAsync()
    {
        try
        {
            var users = await _http.GetFromJsonAsync<List<DirectoryUser>>("/api/users");
            if (users is not null)
            {
                _byUsername = users.ToDictionary(u => u.Username, u => u);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning("Could not refresh user directory from AuthService: {Message}", ex.Message);
        }
    }

    public DirectoryUser? Get(string username) => _byUsername.TryGetValue(username, out var u) ? u : null;

    public string DisplayNameFor(string username) => Get(username)?.DisplayName ?? username;

    public string PhoneFor(string username) => Get(username)?.Phone ?? "";

    public Dictionary<string, string> EmployeeDirectory() =>
        _byUsername.Values.Where(u => u.Role == "employee").ToDictionary(u => u.Username, u => u.DisplayName);

    public async Task<DirectoryUser?> AuthenticateAsync(string username, string password)
    {
        var response = await _http.PostAsJsonAsync("/api/authenticate", new { username, password });
        if (!response.IsSuccessStatusCode) return null;
        return await response.Content.ReadFromJsonAsync<DirectoryUser>();
    }
}

/// <summary>Background loop that keeps the UserDirectory cache warm.</summary>
public class UserDirectoryRefresher : BackgroundService
{
    private readonly UserDirectory _directory;

    public UserDirectoryRefresher(UserDirectory directory) => _directory = directory;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            await _directory.RefreshAsync();
            try { await Task.Delay(TimeSpan.FromMinutes(2), stoppingToken); }
            catch (TaskCanceledException) { }
        }
    }
}

public static class SessionAuth
{
    public static void SignIn(HttpContext ctx, DirectoryUser user)
    {
        ctx.Session.SetString("username", user.Username);
        ctx.Session.SetString("role", user.Role);
        ctx.Session.SetString("display_name", user.DisplayName);
    }

    public static void SignOut(HttpContext ctx) => ctx.Session.Clear();

    public record CurrentUser(string Username, string Role, string DisplayName);

    public static CurrentUser? GetCurrentUser(HttpContext ctx)
    {
        var username = ctx.Session.GetString("username");
        var role = ctx.Session.GetString("role");
        var displayName = ctx.Session.GetString("display_name");
        if (username is null || role is null) return null;
        return new CurrentUser(username, role, displayName ?? username);
    }
}
