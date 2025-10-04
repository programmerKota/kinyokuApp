MCP servers quick setup

What’s included in this repo-level config (mcp_settings.json):

- supabase: project DB admin via @supabase/mcp-server-supabase
- playwright: browser automation
- chrome-devtools: headless Chrome for debugging
- context7: Upstash Context7
- serena: high-level automation (uvx from git repo)
- figma: Figma MCP (placeholder); requires a valid package and API token

Serena (ready):
- Requires uv installed. On Windows, install uv from https://docs.astral.sh/uv/
- Config uses: uvx --from git+https://github.com/oraios/serena serena start-mcp-server --context codex

Figma (placeholder):
- Provide FIGMA_TOKEN (Personal Access Token) and FIGMA_FILE_KEY
- If your environment uses a different package name, edit mcp_settings.json → mcpServers.figma.args accordingly.
- Example file key is the part after /file/ in a Figma URL.

Cursor/Codex IDE
- Restart the IDE after editing mcp_settings.json so new servers are discovered.
- Increase startup_timeout_ms if first-time installs take longer.

