using System.Text.Json.Serialization;

namespace DispatchApp.Models;

public class UserAccount
{
    public required string Username { get; init; }
    public required string Password { get; init; }
    public required string Role { get; init; } // "manager" | "employee" | "delegation"
    public required string DisplayName { get; init; }
    public string Phone { get; init; } = "";
}

public class LocationRecord
{
    public int Id { get; set; }
    public required string Name { get; set; }
    public double Lat { get; set; }
    public double Lng { get; set; }

    public object ToDict() => new { id = Id, name = Name, lat = Lat, lng = Lng };
}

public class EmployeeLocation
{
    public required string Username { get; set; }
    public double Lat { get; set; }
    public double Lng { get; set; }
    public DateTime UpdatedAtUtc { get; set; }
}

/// <summary>Wire shape for an employee marker on the live map — either a
/// real GPS fix (online) or the agency default (offline).</summary>
public class EmployeeLocationDto
{
    public required string Username { get; init; }
    public required string DisplayName { get; init; }
    public string Phone { get; init; } = "";
    public double Lat { get; init; }
    public double Lng { init; get; }
    public string? UpdatedAt { get; init; } // ISO 8601 or null
    public bool Online { get; init; }
}

public static class TaskStatuses
{
    public const string Assigned = "assigned";
    public const string EnRoute = "en_route";
    public const string Done = "done";
    public const string Cancelled = "cancelled";

    public static readonly string[] All = { Assigned, EnRoute, Done, Cancelled };
}

public class DispatchTask
{
    public int Id { get; set; }
    public required string EmployeeUsername { get; set; }
    public required string PersonName { get; set; }
    public required string FromLocation { get; set; }
    public required string ToLocation { get; set; }
    public string Status { get; set; } = TaskStatuses.Assigned;
    public string? Notes { get; set; }
    public DateOnly TaskDate { get; set; }
    public string? TaskTime { get; set; } // "HH:mm", optional
    public required string CreatedBy { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime UpdatedAtUtc { get; set; }

    public object ToDict(string employeeDisplayName, string employeePhone) => new
    {
        id = Id,
        employee_username = EmployeeUsername,
        employee_name = employeeDisplayName,
        employee_phone = employeePhone,
        person_name = PersonName,
        from_location = FromLocation,
        to_location = ToLocation,
        status = Status,
        notes = Notes ?? "",
        task_date = TaskDate.ToString("yyyy-MM-dd"),
        task_time = TaskTime ?? "",
        created_at = CreatedAtUtc.ToString("o"),
        updated_at = UpdatedAtUtc.ToString("o"),
    };
}
