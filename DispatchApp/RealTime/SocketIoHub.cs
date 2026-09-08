using System.Collections.Concurrent;
using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using System.Threading.Channels;

namespace DispatchApp.RealTime;

/// <summary>
/// A from-scratch, protocol-level implementation of just enough of
/// Engine.IO v4 + Socket.IO v4 to keep the existing frontend's
/// socket.io-client (v4.7.5) working unmodified.
///
/// This exists because the environment this was built in has no NuGet
/// access, so no server-side Socket.IO package could be installed — see
/// README for that constraint and what "real" alternative to reach for
/// once you have package access (e.g. a hosted SignalR endpoint plus a
/// small client-side adapter, or a community Socket.IO server package).
///
/// Scope, deliberately: this app's frontend only ever *listens* for
/// server-pushed events (task_created, task_updated, etc.) — it never
/// calls socket.emit(...) itself. So this implementation only needs to
/// support connect/disconnect/heartbeat plus server-to-client broadcast;
/// it does not parse or dispatch client-emitted custom events. It also
/// does not implement the polling→WebSocket upgrade handshake (probe
/// packets) — a polling connection just stays on polling for its
/// lifetime, and a WebSocket connection is used directly from the start
/// when the browser opens one (which is what this frontend's
/// `transports: ["websocket","polling"]` config causes it to attempt
/// first). Both paths broadcast identically.
/// </summary>
public class SocketIoHub
{
    // Engine.IO v4 packet types
    private const char EioOpen = '0';
    private const char EioMessage = '4';
    private const char EioPing = '2';
    private const char EioPong = '3';

    // Socket.IO packet types (follow the Engine.IO '4' message prefix)
    private const char SioConnect = '0';

    private static readonly TimeSpan PingInterval = TimeSpan.FromSeconds(25);
    private static readonly TimeSpan PingTimeout = TimeSpan.FromSeconds(20);

    private class Connection
    {
        public required string Sid { get; init; }
        public WebSocket? Socket { get; set; }
        public Channel<string>? PollingOutbox { get; set; }
        public bool NamespaceConnected { get; set; }
        public DateTime LastSeenUtc { get; set; } = DateTime.UtcNow;
        public readonly SemaphoreSlim SendLock = new(1, 1);
    }

    private readonly ConcurrentDictionary<string, Connection> _connections = new();
    private readonly ILogger<SocketIoHub> _logger;

    public SocketIoHub(ILogger<SocketIoHub> logger) => _logger = logger;

    public int ConnectionCount => _connections.Count;

    public async Task HandleRequestAsync(HttpContext context)
    {
        var sid = context.Request.Query["sid"].ToString();

        if (context.WebSockets.IsWebSocketRequest)
        {
            await HandleWebSocketAsync(context);
            return;
        }

        if (context.Request.Method == "GET")
        {
            await HandlePollingGetAsync(context, sid);
        }
        else if (context.Request.Method == "POST")
        {
            await HandlePollingPostAsync(context, sid);
        }
        else
        {
            context.Response.StatusCode = StatusCodes.Status400BadRequest;
        }
    }

    private static string NewSid() => Guid.NewGuid().ToString("N");

    private static string EioOpenPacket(string sid) =>
        $"{EioOpen}{JsonSerializer.Serialize(new
        {
            sid,
            upgrades = Array.Empty<string>(),
            pingInterval = (int)PingInterval.TotalMilliseconds,
            pingTimeout = (int)PingTimeout.TotalMilliseconds,
            maxPayload = 1_000_000,
        })}";

    private static string SioConnectAckPacket(string sid) =>
        $"{EioMessage}{SioConnect}{JsonSerializer.Serialize(new { sid })}";

    // ---------------------------------------------------------- websocket

    private async Task HandleWebSocketAsync(HttpContext context)
    {
        var socket = await context.WebSockets.AcceptWebSocketAsync();
        var sid = NewSid();
        var conn = new Connection { Sid = sid, Socket = socket };
        _connections[sid] = conn;
        _logger.LogInformation("Socket.IO client connected via websocket ({Sid})", sid);

        using var cts = new CancellationTokenSource();
        try
        {
            await SendAsync(conn, EioOpenPacket(sid));
            _ = PingLoopAsync(conn, cts.Token);

            var buffer = new byte[4096];
            while (socket.State == WebSocketState.Open)
            {
                var result = await socket.ReceiveAsync(buffer, CancellationToken.None);
                if (result.MessageType == WebSocketMessageType.Close) break;
                var text = Encoding.UTF8.GetString(buffer, 0, result.Count);
                await HandleIncomingPacketAsync(conn, text);
            }
        }
        catch (WebSocketException)
        {
            // client disconnected abruptly — normal, just clean up below
        }
        finally
        {
            cts.Cancel();
            _connections.TryRemove(sid, out _);
            if (socket.State != WebSocketState.Closed && socket.State != WebSocketState.Aborted)
            {
                try { await socket.CloseAsync(WebSocketCloseStatus.NormalClosure, null, CancellationToken.None); }
                catch { /* best-effort */ }
            }
            _logger.LogInformation("Socket.IO client disconnected ({Sid})", sid);
        }
    }

    private async Task PingLoopAsync(Connection conn, CancellationToken token)
    {
        try
        {
            while (!token.IsCancellationRequested)
            {
                await Task.Delay(PingInterval, token);
                await SendAsync(conn, EioPing.ToString());
            }
        }
        catch (TaskCanceledException) { }
    }

    // ------------------------------------------------------------ polling

    private async Task HandlePollingGetAsync(HttpContext context, string sid)
    {
        if (string.IsNullOrEmpty(sid) || !_connections.TryGetValue(sid, out var conn))
        {
            // Brand-new polling connection: hand out a sid and the OPEN packet.
            var newSid = NewSid();
            var newConn = new Connection { Sid = newSid, PollingOutbox = Channel.CreateUnbounded<string>() };
            _connections[newSid] = newConn;
            _logger.LogInformation("Socket.IO client connected via polling ({Sid})", newSid);
            context.Response.ContentType = "text/plain; charset=UTF-8";
            await context.Response.WriteAsync(EioOpenPacket(newSid));
            return;
        }

        conn.LastSeenUtc = DateTime.UtcNow;
        using var cts = CancellationTokenSource.CreateLinkedTokenSource(context.RequestAborted);
        cts.CancelAfter(PingInterval);

        string first;
        try
        {
            first = await conn.PollingOutbox!.Reader.ReadAsync(cts.Token);
        }
        catch (OperationCanceledException)
        {
            first = EioPing.ToString(); // nothing queued — send a keepalive ping
        }

        var packets = new List<string> { first };
        while (conn.PollingOutbox!.Reader.TryRead(out var more)) packets.Add(more);

        context.Response.ContentType = "text/plain; charset=UTF-8";
        await context.Response.WriteAsync(string.Join('\u001e', packets));
    }

    private async Task HandlePollingPostAsync(HttpContext context, string sid)
    {
        if (string.IsNullOrEmpty(sid) || !_connections.TryGetValue(sid, out var conn))
        {
            context.Response.StatusCode = StatusCodes.Status400BadRequest;
            return;
        }

        using var reader = new StreamReader(context.Request.Body);
        var body = await reader.ReadToEndAsync();
        foreach (var packet in body.Split('\u001e'))
        {
            if (packet.Length > 0) await HandleIncomingPacketAsync(conn, packet);
        }

        context.Response.ContentType = "text/plain; charset=UTF-8";
        await context.Response.WriteAsync("ok");
    }

    // -------------------------------------------------------- shared logic

    private async Task HandleIncomingPacketAsync(Connection conn, string text)
    {
        conn.LastSeenUtc = DateTime.UtcNow;
        if (text.Length == 0) return;

        var eioType = text[0];
        var rest = text.Length > 1 ? text[1..] : "";

        if (eioType == EioMessage && rest.Length > 0 && rest[0] == SioConnect)
        {
            conn.NamespaceConnected = true;
            await SendAsync(conn, SioConnectAckPacket(conn.Sid));
        }
        // EioPong ('3') and anything else: no action needed beyond the
        // LastSeenUtc bump above. This app never receives custom
        // client-emitted events, so there's nothing further to dispatch.
    }

    private async Task SendAsync(Connection conn, string packet)
    {
        if (conn.Socket is not null)
        {
            if (conn.Socket.State != WebSocketState.Open) return;
            await conn.SendLock.WaitAsync();
            try
            {
                var bytes = Encoding.UTF8.GetBytes(packet);
                await conn.Socket.SendAsync(bytes, WebSocketMessageType.Text, true, CancellationToken.None);
            }
            catch { /* connection likely closing; the read loop will clean up */ }
            finally { conn.SendLock.Release(); }
        }
        else if (conn.PollingOutbox is not null)
        {
            await conn.PollingOutbox.Writer.WriteAsync(packet);
        }
    }

    // ---------------------------------------------------------- broadcast

    /// <summary>Equivalent to Flask-SocketIO's socketio.emit(event, payload)
    /// with no room — sends to every connected client.</summary>
    public void Broadcast(string eventName, object payload)
    {
        var packet = $"{EioMessage}2{JsonSerializer.Serialize(new object[] { eventName, payload })}";
        foreach (var conn in _connections.Values)
        {
            if (!conn.NamespaceConnected) continue;
            _ = SendAsync(conn, packet);
        }
    }
}
