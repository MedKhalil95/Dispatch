using System.Text;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace DispatchApp;

public class TemplateContext
{
    public SessionAuth.CurrentUser? User { get; init; }
    public string? Today { get; init; }
    public string? Error { get; init; }
    public Dictionary<string, string>? Employees { get; init; } // username -> display name, insertion order matters
}

/// <summary>
/// A tiny stand-in for Jinja2, supporting exactly the constructs the
/// existing templates use — nothing more:
///   {{ user.display_name }}   {{ user | tojson }}   {{ today }}   {{ error }}
///   {{ url_for('static', filename='...') }}  {{ url_for('login') }}  {{ url_for('logout') }}
///   {% if error %}...{% endif %}
///   {% for username, name in employees.items() %}...{% endfor %}
/// The templates themselves are untouched — this just knows how to read
/// that specific syntax.
/// </summary>
public static class TemplateEngine
{
    private static readonly Regex ForLoopPattern = new(
        @"\{%\s*for\s+(\w+)\s*,\s*(\w+)\s+in\s+employees\.items\(\)\s*%\}(.*?)\{%\s*endfor\s*%\}",
        RegexOptions.Singleline);

    private static readonly Regex IfErrorPattern = new(
        @"\{%\s*if\s+error\s*%\}(.*?)\{%\s*endif\s*%\}",
        RegexOptions.Singleline);

    private static readonly Regex UrlForStaticPattern = new(
        @"\{\{\s*url_for\('static',\s*filename='([^']+)'\)\s*\}\}");

    public static string Render(string template, TemplateContext ctx)
    {
        var html = template;

        html = ForLoopPattern.Replace(html, m =>
        {
            var keyVar = m.Groups[1].Value;
            var valVar = m.Groups[2].Value;
            var inner = m.Groups[3].Value;
            var sb = new StringBuilder();
            foreach (var (username, displayName) in ctx.Employees ?? new Dictionary<string, string>())
            {
                var piece = inner
                    .Replace("{{ " + keyVar + " }}", HtmlEncoder.Default.Encode(username))
                    .Replace("{{ " + valVar + " }}", HtmlEncoder.Default.Encode(displayName));
                sb.Append(piece);
            }
            return sb.ToString();
        });

        html = IfErrorPattern.Replace(html, m => string.IsNullOrEmpty(ctx.Error) ? "" : m.Groups[1].Value);

        html = UrlForStaticPattern.Replace(html, m => "/static/" + m.Groups[1].Value);
        html = html.Replace("{{ url_for('login') }}", "/login");
        html = html.Replace("{{ url_for('logout') }}", "/logout");

        html = html.Replace("{{ user | tojson }}", JsonSerializer.Serialize(new
        {
            username = ctx.User?.Username ?? "",
            role = ctx.User?.Role ?? "",
            display_name = ctx.User?.DisplayName ?? "",
        }));

        html = html.Replace("{{ user.display_name }}", HtmlEncoder.Default.Encode(ctx.User?.DisplayName ?? ""));
        html = html.Replace("{{ today }}", HtmlEncoder.Default.Encode(ctx.Today ?? ""));
        html = html.Replace("{{ error }}", HtmlEncoder.Default.Encode(ctx.Error ?? ""));

        return html;
    }
}
