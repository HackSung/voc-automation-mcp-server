# Deployment Checklist

## Before release

- [ ] `npm run build` passes
- [ ] `npx tsc --noEmit` passes
- [ ] No secrets committed (search for real tokens/keys)
- [ ] Cursor config examples (`cursor-mcp-config.json`) up to date

## Environment injection

This project does **not** load env files at runtime.

- [ ] Required variables are injected via `~/.cursor/mcp.json` → `mcpServers.<server>`의 `env` 필드 (or exported env vars)

