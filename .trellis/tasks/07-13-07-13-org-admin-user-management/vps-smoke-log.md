# VPS smoke log — org admin `/api/org-users`

> **Status:** ALL PASS (2026-07-13)  
> **Contract:** `WANd.ORG.USER_ADMIN.001`

## Deploy evidence

| Field | Value |
|-------|--------|
| auth/status | `success:true`, `user_count:5` |
| aionorg | `active (running)` after VPS `cargo build --release -p aionui-app` |
| Tarball SHA256 | `043700E1F5667DEF15E84BFB43A9A987A17FF124029AD07B92EB346F95DA2025` (~4 MB slim) |
| VPS build | 2026-07-13 ~13:15 UTC |

## Results

| Check | Expected | Actual | PASS |
|-------|----------|--------|------|
| admin `is_admin` | true | login JSON `user.is_admin: true` | ✅ |
| admin GET `/api/org-users` | 200 | success + user list | ✅ |
| admin POST `/api/org-users` | 201 | created smoke user with department | ✅ |
| new user `me/context` department | 采购部 | matches create payload | ✅ |
| employee GET `/api/org-users` | 403 | yjc → 403 | ✅ |
| manager POST `/api/org-users` | 403 | smoke_mgr → 403 | ✅ |

### Command output

```text
PS> .\scripts\org-phase0\vps-org-users-smoke.ps1
ALL PASS org-users smoke (http://67.216.206.3:13401)
Test users: smoke_org_1783980439 , smoke_mgr_1783980444
```

Note: POST requires CSRF cookie + `x-csrf-token` header (desktop app handles this via org HTTP bridge).
