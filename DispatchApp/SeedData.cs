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
        (AgencyLocationName, 36.833167837466156, 10.242287753330718),
        ("Tunis-Carthage Airport", 36.85111, 10.22722),
        ("Golden Tulip Gammarth Hotel", 36.90548980019178, 10.312485782517482),
        ("Africa Hotel Tunis", 36.799551272935744, 10.183197196004256),
        ("Laico Tunis Hotel", 36.807488982176906, 10.187109669021018),
        ("Movenpick Hotel Gammarth", 36.89498655633526, 10.321018497861173),
        ("Movenpick Hotel du Lac Tunis", 36.83549841997933, 10.248399453678092),
        ("Hotel Concorde Les Berges du Lac", 36.83219749457435, 10.236725909497638),
        ("Sheraton Tunis Hotel", 36.818611, 10.203611),
        ("Novotel Tunis", 36.845159782675545, 10.280738464957478),
        ("Hotel Carlton", 36.818611, 10.203611),
        ("Hotel Belvedere Fourati", 36.818611, 10.203611),
        ("Hotel Royal Victoria", 36.818611, 10.203611),
        ("Hotel Majestic", 36.818611, 10.203611),
        ("Hotel La Kasbah", 36.818611, 10.203611),
        ("Hotel El Mouradi Gammarth", 36.921422345030656, 10.288286196009999),
    };
}
