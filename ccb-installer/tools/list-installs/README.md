# CCB-Wanding — list install locations (IT bundle)

Give employees **both files** when they do not know where CCB-Wanding is installed:

- `ccb-list-installs.cmd` — double-click
- `find-wanding-installs.ps1` — must sit in `scripts\` next to the cmd **or** use the copy inside any existing install

## Layout for email zip

```text
list-installs/
  ccb-list-installs.cmd
  scripts/
    find-wanding-installs.ps1
```

Employee double-clicks `ccb-list-installs.cmd`. Output + log under `%LOCALAPPDATA%\CCB-Wanding\logs\list-installs-*.log`.

## Full disk scan (slow)

```powershell
.\scripts\find-wanding-installs.ps1 -FullScan
```
