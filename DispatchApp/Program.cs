using System.Text.Json;
using DispatchApp;
using DispatchApp.Models;
using DispatchApp.RealTime;
using Microsoft.Extensions.FileProviders;

var builder = WebApplication.CreateBuilder(args);

if (Environment.GetEnvironmentVariable("ASPNETCORE_URLS") is null)
{
    builder.WebHost.UseUrls("http://0.0.0.0:5080");
}

var authServiceUrl = Environment.GetEnvironmentVariable("AUTH_SERVICE_URL") ?? "http://localhost:5087";

builder.Services.AddDistributedMemoryCache();
builder.Services.AddSession(options =>
{
    options.Cookie.Name = "dispatch_session";
    options.IdleTimeout = TimeSpan.FromDays(7);
    options.Cookie.HttpOnly = true;
    options.Cookie.IsEssential = true;
});

builder.Services.AddSingleton(sp =>
{
    var http = new HttpClient { BaseAddress = new Uri(authServiceUrl), Timeout = TimeSpan.FromSeconds(10) };
    return new UserDirectory(http, sp.GetRequiredService<ILogger<UserDirectory>>());
});
builder.Services.AddHostedService<UserDirectoryRefresher>();

builder.Services.AddSingleton<SocketIoHub>();
builder.Services.AddSingleton(sp => new Store(builder.Environment.ContentRootPath));

var app = builder.Build();

// Warm the user directory cache before accepting traffic, but don't block
// startup forever if AuthService isn't up yet — the background refresher
// will keep retrying.
using (var scope = app.Services.CreateScope())
{
    var directory = scope.ServiceProvider.GetRequiredService<UserDirectory>();
    try { await directory.RefreshAsync().WaitAsync(TimeSpan.FromSeconds(5)); }
    catch { app.Logger.LogWarning("AuthService not reachable at startup ({Url}) — will keep retrying in the background.", authServiceUrl); }
}

app.UseWebSockets();
app.UseSession();

app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(Path.Combine(app.Environment.ContentRootPath, "Static")),
    RequestPath = "/static",
    OnPrepareResponse = ctx =>
    {
        // Force browsers to revalidate on every load instead of caching
        // stale JS/CSS for who-knows-how-long — this is a small internal
        // tool, not a CDN-fronted public site, so "always fresh" wins
        // over the marginal performance gain of aggressive caching.
        ctx.Context.Response.Headers["Cache-Control"] = "no-cache, must-revalidate";
    },
});

var templatesPath = Path.Combine(app.Environment.ContentRootPath, "Templates");
var templates = new Dictionary<string, string>
{
    ["login"] = File.ReadAllText(Path.Combine(templatesPath, "login.html")),
    ["manager"] = File.ReadAllText(Path.Combine(templatesPath, "manager.html")),
    ["employee"] = File.ReadAllText(Path.Combine(templatesPath, "employee.html")),
    ["delegation"] = File.ReadAllText(Path.Combine(templatesPath, "delegation.html")),
};

static IResult Html(string content) => Results.Content(content, "text/html; charset=utf-8");
static string TodayString() => DateOnly.FromDateTime(DateTime.Today).ToString("yyyy-MM-dd");
static DateOnly ParseDateOrToday(string? raw) =>
    !string.IsNullOrEmpty(raw) && DateOnly.TryParse(raw, out var d) ? d : DateOnly.FromDateTime(DateTime.Today);

// ---------------------------------------------------------------- helpers

async Task ClearEmployeeLocationAndBroadcast(string username, Store store, UserDirectory directory, SocketIoHub hub)
{
    store.ClearEmployeeLocation(username);
    var agency = store.FindLocationByName(SeedData.AgencyLocationName);
    hub.Broadcast("employee_location_updated", new
    {
        username,
        display_name = directory.DisplayNameFor(username),
        phone = directory.PhoneFor(username),
        lat = agency?.Lat ?? 36.8065,
        lng = agency?.Lng ?? 10.1815,
        updated_at = (string?)null,
        online = false,
    });
    await Task.CompletedTask;
}

// -------------------------------------------------------------- pages ---

app.MapGet("/healthz", () => Results.Ok(new { status = "ok" }));

app.MapGet("/", (HttpContext ctx) =>
{
    var user = SessionAuth.GetCurrentUser(ctx);
    if (user is null) return Results.Redirect("/login");
    return user.Role switch
    {
        "manager" => Results.Redirect("/manager"),
        "delegation" => Results.Redirect("/delegation"),
        _ => Results.Redirect("/employee"),
    };
});

app.MapGet("/login", (HttpContext ctx) =>
{
    if (SessionAuth.GetCurrentUser(ctx) is not null) return Results.Redirect("/");
    return Html(TemplateEngine.Render(templates["login"], new TemplateContext { Error = null }));
});

app.MapPost("/login", async (HttpContext ctx, UserDirectory directory) =>
{
    var form = await ctx.Request.ReadFormAsync();
    var username = (form["username"].ToString() ?? "").Trim().ToLowerInvariant();
    var password = form["password"].ToString() ?? "";

    var account = await directory.AuthenticateAsync(username, password);
    if (account is null)
    {
        ctx.Response.StatusCode = StatusCodes.Status401Unauthorized;
        return Html(TemplateEngine.Render(templates["login"], new TemplateContext { Error = "Incorrect username or password." }));
    }

    SessionAuth.SignIn(ctx, account);
    return Results.Redirect("/");
});

app.MapGet("/logout", async (HttpContext ctx, Store store, UserDirectory directory, SocketIoHub hub) =>
{
    var user = SessionAuth.GetCurrentUser(ctx);
    if (user is not null && user.Role == "employee")
    {
        await ClearEmployeeLocationAndBroadcast(user.Username, store, directory, hub);
    }
    SessionAuth.SignOut(ctx);
    return Results.Redirect("/login");
});

app.MapGet("/manager", (HttpContext ctx, UserDirectory directory) =>
{
    var user = SessionAuth.GetCurrentUser(ctx);
    if (user is null) return Results.Redirect("/login");
    if (user.Role != "manager") return Results.StatusCode(403);
    return Html(TemplateEngine.Render(templates["manager"], new TemplateContext
    {
        User = user,
        Today = TodayString(),
        Employees = directory.EmployeeDirectory(),
    }));
});

app.MapGet("/employee", (HttpContext ctx) =>
{
    var user = SessionAuth.GetCurrentUser(ctx);
    if (user is null) return Results.Redirect("/login");
    if (user.Role != "employee") return Results.StatusCode(403);
    return Html(TemplateEngine.Render(templates["employee"], new TemplateContext { User = user, Today = TodayString() }));
});

app.MapGet("/delegation", (HttpContext ctx) =>
{
    var user = SessionAuth.GetCurrentUser(ctx);
    if (user is null) return Results.Redirect("/login");
    if (user.Role != "delegation") return Results.StatusCode(403);
    return Html(TemplateEngine.Render(templates["delegation"], new TemplateContext { User = user, Today = TodayString() }));
});

// ---------------------------------------------------------------- API ---

app.MapGet("/api/locations", (HttpContext ctx, Store store) =>
{
    if (SessionAuth.GetCurrentUser(ctx) is null) return Results.Redirect("/login");
    return Results.Ok(store.GetLocations().Select(l => l.ToDict()));
});

app.MapPost("/api/locations", async (HttpContext ctx, Store store, SocketIoHub hub) =>
{
    var user = SessionAuth.GetCurrentUser(ctx);
    if (user is null) return Results.Redirect("/login");
    if (user.Role != "manager") return Results.StatusCode(403);

    var payload = await ctx.Request.ReadFromJsonAsync<JsonElement>();
    var name = payload.TryGetProperty("name", out var n) ? n.GetString()?.Trim() : null;
    double? lat = payload.TryGetProperty("lat", out var latEl) && latEl.ValueKind is JsonValueKind.Number ? latEl.GetDouble() : null;
    double? lng = payload.TryGetProperty("lng", out var lngEl) && lngEl.ValueKind is JsonValueKind.Number ? lngEl.GetDouble() : null;

    if (string.IsNullOrEmpty(name) || lat is null || lng is null)
        return Results.Json(new { error = "name, lat and lng are required" }, statusCode: 400);

    var loc = store.AddLocation(name, lat.Value, lng.Value);
    if (loc is null) return Results.Json(new { error = "A location with that name already exists" }, statusCode: 409);

    hub.Broadcast("locations_changed", loc.ToDict());
    return Results.Json(loc.ToDict(), statusCode: 201);
});

app.MapGet("/api/employee-locations", (HttpContext ctx, Store store, UserDirectory directory) =>
{
    var user = SessionAuth.GetCurrentUser(ctx);
    if (user is null) return Results.Redirect("/login");
    if (user.Role is not ("manager" or "delegation")) return Results.StatusCode(403);

    var agency = store.FindLocationByName(SeedData.AgencyLocationName);
    var results = directory.EmployeeDirectory().Select(kv =>
    {
        var (username, displayName) = (kv.Key, kv.Value);
        var live = store.GetEmployeeLocation(username);
        if (live is not null)
        {
            return (object)new
            {
                username,
                display_name = displayName,
                phone = directory.PhoneFor(username),
                lat = live.Lat,
                lng = live.Lng,
                updated_at = live.UpdatedAtUtc.ToString("o"),
                online = true,
            };
        }
        return new
        {
            username,
            display_name = displayName,
            phone = directory.PhoneFor(username),
            lat = agency?.Lat ?? 36.8065,
            lng = agency?.Lng ?? 10.1815,
            updated_at = (string?)null,
            online = false,
        };
    });
    return Results.Ok(results);
});

app.MapPost("/api/my-location", async (HttpContext ctx, Store store, UserDirectory directory, SocketIoHub hub) =>
{
    var user = SessionAuth.GetCurrentUser(ctx);
    if (user is null) return Results.Redirect("/login");
    if (user.Role != "employee") return Results.StatusCode(403);

    var payload = await ctx.Request.ReadFromJsonAsync<JsonElement>();
    if (!payload.TryGetProperty("lat", out var latEl) || !payload.TryGetProperty("lng", out var lngEl) ||
        latEl.ValueKind is not JsonValueKind.Number || lngEl.ValueKind is not JsonValueKind.Number)
        return Results.Json(new { error = "lat and lng are required" }, statusCode: 400);

    var loc = store.UpsertEmployeeLocation(user.Username, latEl.GetDouble(), lngEl.GetDouble());
    var dto = new
    {
        username = user.Username,
        display_name = directory.DisplayNameFor(user.Username),
        phone = directory.PhoneFor(user.Username),
        lat = loc.Lat,
        lng = loc.Lng,
        updated_at = loc.UpdatedAtUtc.ToString("o"),
        online = true,
    };
    hub.Broadcast("employee_location_updated", dto);
    return Results.Ok(dto);
});

app.MapGet("/api/tasks", (HttpContext ctx, Store store, UserDirectory directory) =>
{
    var user = SessionAuth.GetCurrentUser(ctx);
    if (user is null) return Results.Redirect("/login");

    var date = ParseDateOrToday(ctx.Request.Query["date"]);
    var tasks = user.Role == "employee"
        ? store.GetTasksForDate(date, user.Username)
        : store.GetTasksForDate(date);

    var result = tasks.Select(t => t.ToDict(directory.DisplayNameFor(t.EmployeeUsername), directory.PhoneFor(t.EmployeeUsername)));
    return Results.Ok(result);
});

app.MapPost("/api/tasks", async (HttpContext ctx, Store store, UserDirectory directory, SocketIoHub hub) =>
{
    var user = SessionAuth.GetCurrentUser(ctx);
    if (user is null) return Results.Redirect("/login");
    if (user.Role != "manager") return Results.StatusCode(403);

    var payload = await ctx.Request.ReadFromJsonAsync<JsonElement>();
    string? Str(string prop) => payload.TryGetProperty(prop, out var v) && v.ValueKind == JsonValueKind.String ? v.GetString() : null;

    var employeeUsername = Str("employee_username");
    var personName = Str("person_name")?.Trim();
    var fromLocation = Str("from_location")?.Trim();
    var toLocation = Str("to_location")?.Trim();
    var notes = Str("notes")?.Trim();
    var taskTime = Str("task_time")?.Trim();
    var taskDate = ParseDateOrToday(Str("task_date"));

    if (employeeUsername is null || !directory.EmployeeDirectory().ContainsKey(employeeUsername))
        return Results.Json(new { error = "Unknown employee." }, statusCode: 400);
    if (string.IsNullOrEmpty(personName))
        return Results.Json(new { error = "Person's name is required." }, statusCode: 400);
    if (string.IsNullOrEmpty(fromLocation) || string.IsNullOrEmpty(toLocation))
        return Results.Json(new { error = "Both from and to locations are required." }, statusCode: 400);
    if (fromLocation == toLocation)
        return Results.Json(new { error = "From and to locations can't be the same." }, statusCode: 400);

    var now = DateTime.UtcNow;
    var task = store.CreateTask(new DispatchTask
    {
        EmployeeUsername = employeeUsername,
        PersonName = personName,
        FromLocation = fromLocation,
        ToLocation = toLocation,
        Notes = string.IsNullOrEmpty(notes) ? null : notes,
        TaskTime = string.IsNullOrEmpty(taskTime) ? null : taskTime,
        TaskDate = taskDate,
        CreatedBy = user.Username,
        CreatedAtUtc = now,
        UpdatedAtUtc = now,
    });

    var dict = task.ToDict(directory.DisplayNameFor(employeeUsername), directory.PhoneFor(employeeUsername));
    hub.Broadcast("task_created", dict);
    return Results.Json(dict, statusCode: 201);
});

app.MapMethods("/api/tasks/{id:int}", new[] { "PATCH" }, async (HttpContext ctx, int id, Store store, UserDirectory directory, SocketIoHub hub) =>
{
    var user = SessionAuth.GetCurrentUser(ctx);
    if (user is null) return Results.Redirect("/login");

    var task = store.GetTask(id);
    if (task is null) return Results.NotFound();

    HashSet<string> allowedFields;
    if (user.Role == "employee")
    {
        if (task.EmployeeUsername != user.Username) return Results.StatusCode(403);
        allowedFields = new HashSet<string> { "status" };
    }
    else if (user.Role == "manager")
    {
        allowedFields = new HashSet<string> { "status", "person_name", "from_location", "to_location", "notes", "employee_username", "task_time" };
    }
    else
    {
        return Results.StatusCode(403); // delegation (or any future read-only role) — view only
    }

    var payload = await ctx.Request.ReadFromJsonAsync<JsonElement>();
    if (allowedFields.Contains("status") && payload.TryGetProperty("status", out var statusEl) && statusEl.ValueKind == JsonValueKind.String)
    {
        var status = statusEl.GetString()!;
        if (!TaskStatuses.All.Contains(status))
            return Results.Json(new { error = $"status must be one of [{string.Join(", ", TaskStatuses.All)}]" }, statusCode: 400);
    }

    store.UpdateTask(id, t =>
    {
        foreach (var field in allowedFields)
        {
            if (!payload.TryGetProperty(field, out var value)) continue;
            var str = value.ValueKind == JsonValueKind.String ? value.GetString() : null;
            switch (field)
            {
                case "status": if (str is not null) t.Status = str; break;
                case "person_name": if (str is not null) t.PersonName = str.Trim(); break;
                case "from_location": if (str is not null) t.FromLocation = str.Trim(); break;
                case "to_location": if (str is not null) t.ToLocation = str.Trim(); break;
                case "notes": t.Notes = str; break;
                case "employee_username": if (str is not null) t.EmployeeUsername = str; break;
                case "task_time": t.TaskTime = str; break;
            }
        }
    });

    var updated = store.GetTask(id)!;
    var dict = updated.ToDict(directory.DisplayNameFor(updated.EmployeeUsername), directory.PhoneFor(updated.EmployeeUsername));
    hub.Broadcast("task_updated", dict);
    return Results.Ok(dict);
});

app.MapDelete("/api/tasks/{id:int}", (HttpContext ctx, int id, Store store, SocketIoHub hub) =>
{
    var user = SessionAuth.GetCurrentUser(ctx);
    if (user is null) return Results.Redirect("/login");
    if (user.Role != "manager") return Results.StatusCode(403);

    var employeeUsername = store.DeleteTask(id);
    if (employeeUsername is null) return Results.NotFound();

    hub.Broadcast("task_deleted", new { id, employee_username = employeeUsername });
    return Results.StatusCode(204);
});

// -------------------------------------------------------- realtime hub --

app.Map("/socket.io/{*rest}", async (HttpContext ctx, SocketIoHub hub) => await hub.HandleRequestAsync(ctx));

app.Run();
