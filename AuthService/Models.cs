namespace AuthService;

public class UserAccount
{
    public required string Username { get; init; }
    public required string Password { get; init; }
    public required string Role { get; init; } // "manager" | "employee" | "delegation"
    public required string DisplayName { get; init; }
    public string Phone { get; init; } = "";

    /// <summary>Public-facing shape — never includes the password.</summary>
    public object ToPublicDict() => new
    {
        username = Username,
        role = Role,
        display_name = DisplayName,
        phone = Phone,
    };
}
