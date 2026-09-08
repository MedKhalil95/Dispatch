using System.Text.Json;
using DispatchApp.Models;

namespace DispatchApp;

/// <summary>
/// Holds all mutable application data (locations, tasks, live employee
/// positions) in memory, persisted to a single JSON file on every write.
///
/// This replaces SQLAlchemy/SQLite from the original Flask app. That swap
/// was forced by the environment this was built in having no NuGet access
/// (so no Microsoft.Data.Sqlite / EF Core could be installed) — not a
/// design preference. Everything goes through this one class, so wiring
/// up EF Core + a real database later only means rewriting this file; no
/// endpoint code changes. See README for the concrete steps.
///
/// Locking is coarse (one lock for the whole store) — perfectly fine for
/// an internal tool with a handful of concurrent users, and it mirrors the
/// single-process deployment (`-w 1`) the original app already required
/// for Socket.IO-style broadcast correctness.
/// </summary>
public class Store
{
    private readonly string _persistPath;
    private readonly object _lock = new();

    private readonly List<LocationRecord> _locations = new();
    private readonly List<DispatchTask> _tasks = new();
    private readonly Dictionary<string, EmployeeLocation> _employeeLocations = new();

    private int _nextLocationId = 1;
    private int _nextTaskId = 1;

    public Store(string contentRootPath)
    {
        _persistPath = Path.Combine(contentRootPath, "dispatch-data.json");
        Load();
        if (_locations.Count == 0)
        {
            SeedLocations();
            Save();
        }
    }

    private void SeedLocations()
    {
        foreach (var (name, lat, lng) in SeedData.DefaultLocations)
        {
            _locations.Add(new LocationRecord { Id = _nextLocationId++, Name = name, Lat = lat, Lng = lng });
        }
    }

    // ---------------------------------------------------------- persistence

    private class PersistShape
    {
        public List<LocationRecord> Locations { get; set; } = new();
        public List<DispatchTask> Tasks { get; set; } = new();
        public List<EmployeeLocation> EmployeeLocations { get; set; } = new();
        public int NextLocationId { get; set; } = 1;
        public int NextTaskId { get; set; } = 1;
    }

    private void Load()
    {
        if (!File.Exists(_persistPath)) return;
        try
        {
            var json = File.ReadAllText(_persistPath);
            var shape = JsonSerializer.Deserialize<PersistShape>(json);
            if (shape is null) return;
            _locations.AddRange(shape.Locations);
            _tasks.AddRange(shape.Tasks);
            foreach (var el in shape.EmployeeLocations) _employeeLocations[el.Username] = el;
            _nextLocationId = shape.NextLocationId;
            _nextTaskId = shape.NextTaskId;
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"Warning: could not load {_persistPath}: {ex.Message}. Starting fresh.");
        }
    }

    private void Save()
    {
        var shape = new PersistShape
        {
            Locations = _locations,
            Tasks = _tasks,
            EmployeeLocations = _employeeLocations.Values.ToList(),
            NextLocationId = _nextLocationId,
            NextTaskId = _nextTaskId,
        };
        var json = JsonSerializer.Serialize(shape, new JsonSerializerOptions { WriteIndented = true });
        // Write to a temp file then move, so a crash mid-write can't corrupt the store.
        var tmp = _persistPath + ".tmp";
        File.WriteAllText(tmp, json);
        File.Move(tmp, _persistPath, overwrite: true);
    }

    // ------------------------------------------------------------ locations

    public List<LocationRecord> GetLocations()
    {
        lock (_lock) return _locations.OrderBy(l => l.Name, StringComparer.Ordinal).ToList();
    }

    public LocationRecord? FindLocationByName(string name)
    {
        lock (_lock) return _locations.FirstOrDefault(l => l.Name == name);
    }

    /// <returns>null if a location with that name already exists.</returns>
    public LocationRecord? AddLocation(string name, double lat, double lng)
    {
        lock (_lock)
        {
            if (_locations.Any(l => l.Name == name)) return null;
            var loc = new LocationRecord { Id = _nextLocationId++, Name = name, Lat = lat, Lng = lng };
            _locations.Add(loc);
            Save();
            return loc;
        }
    }

    // ---------------------------------------------------------------- tasks

    public List<DispatchTask> GetTasksForDate(DateOnly date, string? onlyEmployeeUsername = null)
    {
        lock (_lock)
        {
            var query = _tasks.Where(t => t.TaskDate == date);
            if (onlyEmployeeUsername is not null) query = query.Where(t => t.EmployeeUsername == onlyEmployeeUsername);
            return query.OrderBy(t => t.CreatedAtUtc).ToList();
        }
    }

    public DispatchTask? GetTask(int id)
    {
        lock (_lock) return _tasks.FirstOrDefault(t => t.Id == id);
    }

    public DispatchTask CreateTask(DispatchTask task)
    {
        lock (_lock)
        {
            task.Id = _nextTaskId++;
            _tasks.Add(task);
            Save();
            return task;
        }
    }

    /// <returns>false if no task with that id exists.</returns>
    public bool UpdateTask(int id, Action<DispatchTask> mutate)
    {
        lock (_lock)
        {
            var task = _tasks.FirstOrDefault(t => t.Id == id);
            if (task is null) return false;
            mutate(task);
            task.UpdatedAtUtc = DateTime.UtcNow;
            Save();
            return true;
        }
    }

    /// <returns>the employee_username of the deleted task, or null if not found.</returns>
    public string? DeleteTask(int id)
    {
        lock (_lock)
        {
            var task = _tasks.FirstOrDefault(t => t.Id == id);
            if (task is null) return null;
            _tasks.Remove(task);
            Save();
            return task.EmployeeUsername;
        }
    }

    // ------------------------------------------------------ employee location

    public EmployeeLocation? GetEmployeeLocation(string username)
    {
        lock (_lock) return _employeeLocations.TryGetValue(username, out var loc) ? loc : null;
    }

    public EmployeeLocation UpsertEmployeeLocation(string username, double lat, double lng)
    {
        lock (_lock)
        {
            var loc = new EmployeeLocation { Username = username, Lat = lat, Lng = lng, UpdatedAtUtc = DateTime.UtcNow };
            _employeeLocations[username] = loc;
            Save();
            return loc;
        }
    }

    public void ClearEmployeeLocation(string username)
    {
        lock (_lock)
        {
            if (_employeeLocations.Remove(username)) Save();
        }
    }
}
