import{n as e}from"./chunk-DR8-3Aex.js";import{i as t,n,r}from"./execFileNoThrow-BOiwwche.js";function i(e){if(e<=1)return!1;try{return process.kill(e,0),!0}catch{return!1}}async function a(e,t=10){if(process.platform===`win32`){let r=await n(`powershell.exe`,[`-NoProfile`,`-Command`,`
      $pid = ${String(e)}
      $ancestors = @()
      for ($i = 0; $i -lt ${t}; $i++) {
        $proc = Get-CimInstance Win32_Process -Filter "ProcessId=$pid" -ErrorAction SilentlyContinue
        if (-not $proc -or -not $proc.ParentProcessId -or $proc.ParentProcessId -eq 0) { break }
        $pid = $proc.ParentProcessId
        $ancestors += $pid
      }
      $ancestors -join ','
    `.trim()],{timeout:3e3});return r.code!==0||!r.stdout?.trim()?[]:r.stdout.trim().split(`,`).filter(Boolean).map(e=>parseInt(e,10)).filter(e=>!isNaN(e))}let r=await n(`sh`,[`-c`,`pid=${String(e)}; for i in $(seq 1 ${t}); do ppid=$(ps -o ppid= -p $pid 2>/dev/null | tr -d ' '); if [ -z "$ppid" ] || [ "$ppid" = "0" ] || [ "$ppid" = "1" ]; then break; fi; echo $ppid; pid=$ppid; done`],{timeout:3e3});return r.code!==0||!r.stdout?.trim()?[]:r.stdout.trim().split(`
`).filter(Boolean).map(e=>parseInt(e,10)).filter(e=>!isNaN(e))}function o(e){try{let n=String(e),r=t(process.platform===`win32`?`powershell.exe -NoProfile -Command "(Get-CimInstance Win32_Process -Filter \\"ProcessId=${n}\\").CommandLine"`:`ps -o command= -p ${n}`,{timeout:1e3});return r?r.trim():null}catch{return null}}async function s(e,t=10){if(process.platform===`win32`){let r=await n(`powershell.exe`,[`-NoProfile`,`-Command`,`
      $currentPid = ${String(e)}
      $commands = @()
      for ($i = 0; $i -lt ${t}; $i++) {
        $proc = Get-CimInstance Win32_Process -Filter "ProcessId=$currentPid" -ErrorAction SilentlyContinue
        if (-not $proc) { break }
        if ($proc.CommandLine) { $commands += $proc.CommandLine }
        if (-not $proc.ParentProcessId -or $proc.ParentProcessId -eq 0) { break }
        $currentPid = $proc.ParentProcessId
      }
      $commands -join [char]0
    `.trim()],{timeout:3e3});return r.code!==0||!r.stdout?.trim()?[]:r.stdout.split(`\0`).filter(Boolean)}let r=await n(`sh`,[`-c`,`currentpid=${String(e)}; for i in $(seq 1 ${t}); do cmd=$(ps -o command= -p $currentpid 2>/dev/null); if [ -n "$cmd" ]; then printf '%s\\0' "$cmd"; fi; ppid=$(ps -o ppid= -p $currentpid 2>/dev/null | tr -d ' '); if [ -z "$ppid" ] || [ "$ppid" = "0" ] || [ "$ppid" = "1" ]; then break; fi; currentpid=$ppid; done`],{timeout:3e3});return r.code!==0||!r.stdout?.trim()?[]:r.stdout.split(`\0`).filter(Boolean)}var c=e((()=>{r()}));export{i as a,c as i,a as n,o as r,s as t};