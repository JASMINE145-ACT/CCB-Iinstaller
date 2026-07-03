# Dev deploy — supplier + data.Md (2026-06-30)

## Scope (local only; VPS 018 deferred)

| Layer | Change | Dev path |
|-------|--------|----------|
| Vendor data | `data.Md` in sync whitelist | `D:\CCB-Wanding\vendor\wanding\data\data.Md` |
| Vendor data | 42-col price xlsx + supplier | `price_library_cleaned_2026_05_15.xlsx` |
| MCP env | `PRICE_USE_BUNDLED_FIRST=1` | `D:\CCB-Wanding\ccb-mcp.json` → quotation server |
| Python | `match_quotation` payload `price_source` / supplier chain | `vendor\wanding\python` |
| Agent | supplier column in查价表 SOP | `%LOCALAPPDATA%\CCB-Wanding\.claude\agents\quotation-agent.md` |
| Launcher | `start-dev-full` default `-VendorUpdateSettings`; skills + hooks deploy | `ccb-installer/scripts/start-dev-full.ps1` |

## Canonical restart

```powershell
cd D:\Projects\claude-code-best
.\ccb-installer\scripts\start-dev-full.ps1 -VendorSmoke -BuildAioncore:$false
```

Then **new Guid 会话** — old MCP subprocess keeps stale env.

## Verify

1. Settings → Tools → quotation MCP env includes `PRICE_USE_BUNDLED_FIRST=1`
2. `match_quotation` for PVC-U AW DN100 → `8010012697` with `supplier`
3. `get_product_price_tiers` → `data_md_path` Read succeeds (vendor `data.Md` exists)

## Revert (after VPS 018 + publish)

Remove `PRICE_USE_BUNDLED_FIRST` from `ensure-wanding-settings.ps1`; redeploy settings; spot-check `price_source=org_api` + supplier on coded rows.
