namespace AuthService;

/// <summary>
/// Manager, employee, and delegation accounts. This microservice is the
/// single source of truth for identity — DispatchApp never stores
/// passwords or does its own credential check; it calls this service's
/// /api/authenticate and caches /api/users for display names and phones.
///
/// >>> CHANGE THESE PASSWORDS before putting this in front of real staff. <<<
/// </summary>
public static class SeedData
{
    public static readonly List<UserAccount> Users = new()
    {
        new UserAccount { Username = "manager", Password = "Manager@2026", Role = "manager", DisplayName = "المدير", Phone = "" },
        new UserAccount { Username = "hossam", Password = "Hossam@123", Role = "employee", DisplayName = "حسام", Phone = "+216 20 000 001" },
        new UserAccount { Username = "issam", Password = "issaù@123", Role = "employee", DisplayName = "عصام", Phone = "+216 20 000 002" },
        new UserAccount { Username = "wajdi", Password = "Wajdi@123", Role = "employee", DisplayName = "وجدي", Phone = "+216 20 000 004" },
        new UserAccount { Username = "sadok", Password = "Sadok@123", Role = "employee", DisplayName = "الصادق", Phone = "+216 20 000 005" },
        new UserAccount { Username = "belgacem", Password = "Belgacem@123", Role = "employee", DisplayName = "بلڤاسم", Phone = "+216 20 000 006" },
        new UserAccount { Username = "hosni", Password = "Hosni@123", Role = "employee", DisplayName = "حسني", Phone = "+216 20 000 007" },
        new UserAccount { Username = "moez", Password = "Moez@123", Role = "employee", DisplayName = "معز", Phone = "+216 20 000 008" },
        new UserAccount { Username = "nizar", Password = "Nizar@123", Role = "employee", DisplayName = "نزار", Phone = "+216 20 000 009" },
        new UserAccount { Username = "delegation", Password = "Delegation@2026", Role = "delegation", DisplayName = "الوفد الدبلوماسي", Phone = "" },
        new UserAccount { Username= "Aazzeddine", Password= "Aazzeddine@123", Role= "employee", DisplayName= "عز الدين", Phone= "+216 20 000 010" },
        };

    public const string AgencyLocationName = "CMAI Tunisia (Agency)";
}
