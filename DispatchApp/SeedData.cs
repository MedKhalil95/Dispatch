namespace DispatchApp;

/// <summary>
/// Starting list of pickup/drop-off locations. Accounts used to live here
/// too, but login was split out into the AuthService microservice — see
/// AuthService/SeedData.cs for accounts, and Auth.cs's UserDirectory for
/// how this app reads them without ever touching a password.
/// </summary>
public static class SeedData
{
    public const string AgencyLocationName = "CMAI Tunisia (Agency)";

    // name, latitude, longitude — approximate coordinates; fine-tune from
    // the manager's Locations tab (click-to-pin) once you have exact
    // addresses.
    public static readonly List<(string Name, double Lat, double Lng)> DefaultLocations = new()
    {
        (AgencyLocationName, 36.8065, 10.1815),
        ("Tunis-Carthage Airport", 36.8510, 10.2272),
        ("Golden Tulip Gammarth Hotel", 36.9097, 10.2867),
        ("Radisson Blu Hotel Tunis", 36.9195, 10.2895),
        ("Africa Hotel Tunis", 36.7995, 10.1815),
        ("Laico Tunis Hotel", 36.8020, 10.1790),
        ("Movenpick Hotel Gammarth", 36.9230, 10.2915),
    };
}
