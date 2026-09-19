# Daily Dispatch — .NET port

This replaces the Flask backend with two ASP.NET Core (.NET 8) services,
**with the frontend untouched** (same HTML/CSS/TS, byte-for-byte, aside
from the one explicitly-requested addition: a time picker next to the
date picker on the manager dashboard). If you compare `DispatchApp/Static`
and `DispatchApp/Templates` to the original Flask project's `static/` and
`templates/`, they're the same files.

## Architecture

```
┌─────────────┐  POST /api/authenticate   ┌─────────────┐
│             │  GET  /api/users           │             │
│ DispatchApp │ ──────────────────────────▶│ AuthService │
│  (port 5080)│                            │  (port 5087)│
│             │◀────────────────────────── │             │
└─────────────┘                            └─────────────┘
      │
      │ serves pages, REST API, Socket.IO-compatible
      │ realtime broadcasts
      ▼
   Browser
```

- **AuthService** — a small, standalone microservice that is the single
  source of truth for accounts. It owns the user list (manager, 8
  employees, delegation), checks passwords, and exposes a directory
  (display name, role, phone) with no passwords in it. Nothing else in
  the system stores or checks a password.
- **DispatchApp** — everything else: pages, tasks, locations, live GPS
  tracking, and the realtime layer. On login it calls AuthService's
  `/api/authenticate`; on success it's the one that actually issues the
  session cookie the browser holds (AuthService is a pure service-to-
  service API — the browser never talks to it directly). It also caches
  AuthService's user directory in memory, refreshed every 2 minutes, so
  a brief AuthService blip doesn't take pages down.

This split was **specifically requested** ("continue with using a
microservice for the login") on top of the Flask→.NET port — it's not
incidental to the rewrite.

## Two things worth knowing about this environment

This was built inside a sandbox with **no NuGet registry access**
(`api.nuget.org` isn't reachable) — only what's already on disk via
`apt install dotnet-sdk-8.0`. That constraint shaped two decisions
below. Your own machine will have normal NuGet access, so both are
easy to change if you want to.

**If `dotnet build`/`dotnet run` fails with `NU1100` about
`Microsoft.NETCore.App.Ref` / `Microsoft.AspNetCore.App.Ref`:** an
earlier version of this zip shipped a `nuget.config` with all package
sources cleared (needed only to force a fully offline build in the
sandbox above) — if you still have that file anywhere in this folder
or a parent folder, delete it. A normal machine needs its default
NuGet sources (including nuget.org) intact to resolve the .NET
reference packs. If it still fails after that, it usually means the
installed SDK and runtime are mismatched — check `dotnet --list-sdks`
and `dotnet --list-runtimes` both report a matching 8.0.x, and that
`dotnet nuget list source` shows nuget.org enabled.

**If it builds fine but fails to *launch* with "You must install or
update .NET" / a `Framework: 'Microsoft.AspNetCore.App', version
'8.0.0'` mismatch:** this means only a newer major version (e.g. 9.x)
is installed, not 8.x. Both `.csproj` files already set
`<RollForward>Major</RollForward>`, which tells the app to run on
whatever major .NET version is actually present instead of demanding
exactly 8.0.0 — so this shouldn't happen with the version of the
project in this zip. If you're troubleshooting an older copy, add that
line to the `<PropertyGroup>` in both `.csproj` files, or simply
install the .NET 8 ASP.NET Core Runtime (the failure message includes
a direct download link for that).

**If a page seems to be missing a button, a translation, or any other
recent change:** the browser almost certainly cached an older
`manager.js`/`i18n.js`/etc. from a previous run on the same URL — do a
hard refresh (Ctrl+Shift+R / Cmd+Shift+R), or open DevTools → Network
tab → "Disable cache" while testing. Static assets are now served with
`Cache-Control: no-cache, must-revalidate` (see `Program.cs`'s
`UseStaticFiles` call) specifically so this stops happening — every
load re-checks with the server instead of trusting a stale local copy.
Before that fix landed, this was a real way to end up looking at
old, broken JS while the actual files on disk were already correct.

### 1. No database — a JSON-file-backed store instead of EF Core/SQLite

The original Flask app used SQLAlchemy + SQLite. Without NuGet, there's
no `Microsoft.Data.Sqlite` or EF Core available, so `Store.cs` is a
small thread-safe in-memory store that persists to a single
`dispatch-data.json` file next to the executable (write-through on every
change, atomic via write-to-temp-then-rename). Every data access in the
app goes through this one class.

**To swap in a real database:** rewrite `Store.cs` against EF Core (or
Dapper, or anything else) — no endpoint code changes needed, since
`Program.cs` only calls `Store`'s public methods (`GetTasksForDate`,
`CreateTask`, `AddLocation`, etc.), never touches storage directly.

### 2. No Socket.IO package — a hand-rolled Engine.IO/Socket.IO v4 layer

The frontend can't change, and it loads `socket.io-client` from a CDN
and calls `io({ transports: ["websocket", "polling"] })`. There's no
NuGet-installable server-side Socket.IO implementation for .NET, so
`RealTime/SocketIoHub.cs` implements just enough of the real Engine.IO
v4 / Socket.IO v4 wire protocol — over both WebSocket and HTTP
long-polling — to keep that unmodified client working.

This was **not** left as a guess: it's verified against the actual
`socket.io-client` npm package (not a hand-written test double), for
both transports, receiving real broadcast events end-to-end. See
"Testing" below for the exact commands.

Deliberate scope limit: this app's frontend only ever *listens* for
server-pushed events — it never calls `socket.emit(...)` itself. So the
hub only needs to support connect/heartbeat/disconnect plus
server→client broadcast; it doesn't parse or dispatch custom
client-emitted events, and it doesn't implement the polling→WebSocket
upgrade handshake (a polling connection just stays on polling; a
WebSocket connection — which is what the client attempts first, since
it's listed first in `transports` — is used directly from the start).

**To swap this out:** once you have NuGet access, the more
maintainable path is usually either (a) a community Socket.IO-server
package if one meets your needs, or (b) migrate the frontend's
`connectSocket()` in `Static/ts/common.ts` to a small SignalR client and
run ASP.NET Core's own SignalR — genuinely first-party and far less
code, but does mean touching the frontend, which this task explicitly
avoided.

## Feature parity with the Flask version

Everything from the Flask app carries over 1:1: manager/employee/
delegation roles and permissions, task CRUD with real-time broadcast,
live employee GPS tracking (online vs. "at agency" default), the
manager's live map with the employee's-current-location "From" option,
locations management, and all the role-based 403s (delegation is
view-only server-side, exactly as before).

**New in this port:** a time picker next to the date picker on the
manager's New Task form (`#f-time`), stored as `task_time` on each task
and shown in the manager's board, the delegation's table, and on the
employee's own task cards.

**Also new:** the employee dashboard now has its own day picker
(defaults to today, same `#board-date` pattern as the manager and
delegation boards) — employees can look ahead or back to any day's
duties, not just today's. And the delegation dashboard has a location
filter: a dropdown listing every saved location (every hotel, the
airport, and CMAI Tunisia) sourced from the same `/api/locations` list
the manager uses. It matches a route on **either end** — filtering by
"CMAI Tunisia (Agency)" shows every route that starts *or* ends there,
not just ones ending there, so a CMAI → hotel leg doesn't disappear
just because CMAI is the origin rather than the destination. Both are
plain client-side additions — no new endpoints were needed, since
`/api/tasks?date=...` already existed for the day filter, and the
location filter runs against data already being fetched.

## What's new: GPS-backed place search for the manager

Typing an exact match into the From/To dropdowns only ever worked for
places already saved as a `Location` (the seeded hotels/airport/CMAI).
The manager's **Locations** tab now has a proper search box above the
map picker: type a place name (e.g. "The Residence Tunis"), press
**Enter** or **Search**, and it looks the place up via
[Nominatim](https://nominatim.openstreetmap.org) (OpenStreetMap's free
geocoding search — the same map-tile provider this app already uses,
so no new API key or paid service). Pick the right result from the
list and its name and GPS coordinates fill the form automatically,
with the map panning to show exactly where it landed — no more
guessing where to click on the map. There's also a **"Can't find the
place you need?"** link right on the New Task form's From/To row that
jumps straight to this search box, so the manager doesn't have to go
hunting for the Locations tab mid-task.

Once saved, it's an ordinary `Location` like any other — it broadcasts
over the existing realtime layer exactly like manually-pinned
locations always have, so it shows up immediately in every employee's
and the delegation's location lists too, with no extra plumbing needed.

**One important constraint, deliberately respected:** Nominatim's
usage policy explicitly forbids "search-as-you-type"/autocomplete
against its public API — implementing that client-side is grounds for
being banned from the service. So this is a one-shot search the
manager explicitly triggers (Enter or the button), never fired
automatically while typing, with a ~1.1s client-side cooldown to stay
under the documented 1-request/second cap. Search is biased to Tunisia
(`countrycodes=tn`) since every seeded location already is — drop that
query parameter in `Static/ts/manager.ts`'s `searchPlaces()` if you
ever need to search outside Tunisia. For heavier usage than a small
internal team, consider self-hosting Nominatim or switching to a paid
geocoding provider (Google Places, Mapbox, LocationIQ) instead of the
public instance.

## Running it

Needs the .NET 8 SDK. Two terminals:

```bash
# Terminal 1
cd AuthService
dotnet run

# Terminal 2
cd DispatchApp
dotnet run
```

AuthService listens on `http://localhost:5087`, DispatchApp on
`http://localhost:5080` (override either with the standard
`ASPNETCORE_URLS` env var). DispatchApp finds AuthService via the
`AUTH_SERVICE_URL` env var, defaulting to `http://localhost:5087`.

Open `http://localhost:5080/login`. Accounts are the same as before —
`manager` / `Manager@2026`, `mohamed` / `Mohamed@123`, `delegation` /
`Delegation@2026`, etc. (see `AuthService/SeedData.cs` — **change these
before real use**, same as the Flask version's `data.py` warning).

**Publishing:** `dotnet publish -c Release` in each project folder, then
run the published `.dll` **from its own output directory** — both
`Static/` and `Templates/` are copied there via the `.csproj`'s
`Content` items and are found relative to the process's content root.

### Frontend changes (if you ever touch `Static/ts/*.ts`)

The compiled `Static/js/*.js` is what's actually served — TypeScript is
a dev-time step, not a runtime dependency. Rebuild it with:

```bash
cd DispatchApp
npm install
npm run build
```

## Testing

The most important thing to verify isn't just "does it build" — it's
"does the actual browser Socket.IO client still work against this
hand-rolled server." That was tested for real:

```bash
npm install socket.io-client@4.7.5   # in a throwaway test folder
node -e '
  const { io } = require("socket.io-client");
  const s = io("http://localhost:5080", { transports: ["websocket"] });
  s.on("connect", () => console.log("connected:", s.id));
  s.on("task_created", (t) => console.log("got broadcast:", t));
'
```

...while creating a task from the manager dashboard (or via `curl -X
POST /api/tasks`) in another terminal — the event arrives instantly.
Both `transports: ["websocket"]` and `transports: ["polling"]` were run
this way and both connect and receive broadcasts correctly.

Also manually verified end-to-end: login through AuthService with a
correct/incorrect password (including the 5-attempts-then-429 lockout),
session cookies protecting `/manager`, `/employee`, `/delegation`;
task create/read/update/delete with every role's permission boundary
(employee can only touch their own task's `status`; delegation is
blocked from every write endpoint — `POST/PATCH/DELETE /api/tasks`,
`POST /api/locations` — with 403); employee GPS sharing and logout
correctly reverting them to "at agency"; and that every static asset
(CSS, compiled JS, the background photo) is served correctly.

## What I'd still want before real production use

1. **HTTPS + a real reverse proxy** in front of both services (Kestrel
   directly exposed is fine for LAN/dev, not for the public internet).
2. **Password hashing** in AuthService — currently plain-text comparison
   against `SeedData.Users`, matching the Flask version's original
   simplicity. Same recommendation as the Flask README: hash before
   this holds anything sensitive.
3. **A real database**, per the note above, once you have package
   access — the JSON file is fine for a small team, not for scale or
   for multiple app instances sharing state.
4. **Service discovery / config** beyond an env var, if this ever runs
   behind Docker Compose or Kubernetes (trivial to add — `AUTH_SERVICE_URL`
   is already externalized, just point it at a service DNS name).
5. **Structured auth failures logged/alerted**, beyond AuthService's
   basic in-memory lockout — fine for one instance, not for a
   horizontally-scaled deployment (the lockout state isn't shared).
