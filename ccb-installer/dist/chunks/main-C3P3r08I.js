import{n as e}from"./chunk-DR8-3Aex.js";import{i as t,o as n,t as r}from"./cliLaunch-CtCvgdpd.js";import{a as i,i as a,n as o,r as s,t as c}from"./state-RTFanWsQ.js";import{resolve as l}from"path";async function u(e){let t=e[0]||`status`;switch(t){case`start`:await h(e.slice(1));break;case`stop`:await p();break;case`status`:case`ps`:await f();break;case`bg`:await(await import(`./bg-BKSHc1r3.js`)).handleBgStart(e.slice(1));break;case`attach`:await(await import(`./bg-BKSHc1r3.js`)).attachHandler(e[1]);break;case`logs`:await(await import(`./bg-BKSHc1r3.js`)).logsHandler(e[1]);break;case`kill`:await(await import(`./bg-BKSHc1r3.js`)).killHandler(e[1]);break;case`--help`:case`-h`:case`help`:d();break;default:console.error(`Unknown daemon subcommand: ${t}`),d(),process.exitCode=1}}function d(){console.log(`
Claude Code Daemon — background process management

USAGE
  claude daemon [subcommand]

SUBCOMMANDS
  status      Show daemon and session status (default)
  start       Start the daemon supervisor
  stop        Stop the daemon
  bg          Start a background session
  attach      Attach to a background session
  logs        Show session logs
  kill        Kill a session
  help        Show this help

REPL
  /daemon [subcommand]    Same commands available in interactive mode

OPTIONS (for start)
  --dir <path>              Working directory (default: current)
  --spawn-mode <mode>       Worker spawn mode: same-dir | worktree (default: same-dir)
  --capacity <N>            Max concurrent sessions per worker (default: 4)
  --permission-mode <mode>  Permission mode for spawned sessions
  --sandbox                 Enable sandbox mode
  --name <name>             Session name
  -h, --help                Show this help
`)}async function f(){let e=o();switch(console.log(`=== Daemon Supervisor ===`),e.status){case`running`:{let t=e.state;console.log(`  Status:  running`),console.log(`  PID:     ${t.pid}`),console.log(`  CWD:     ${t.cwd}`),console.log(`  Started: ${t.startedAt}`),console.log(`  Workers: ${t.workerKinds.join(`, `)}`);break}case`stopped`:console.log(`  Status: stopped`);break;case`stale`:console.log(`  Status: stale (cleaned up)`);break}console.log(`
=== Background Sessions ===`),await(await import(`./bg-BKSHc1r3.js`)).psHandler([])}async function p(){let e=o();if(e.status===`stopped`){console.log(`daemon is not running`);return}if(e.status===`stale`){console.log(`daemon was stale (cleaned up)`);return}console.log(`stopping daemon (PID: ${e.state.pid})...`),await a()?console.log(`daemon stopped`):console.log(`daemon could not be stopped (may have already exited)`)}function m(e){let t={};for(let n=0;n<e.length;n++){let r=e[n];r===`--dir`&&n+1<e.length?t.dir=l(e[++n]):r.startsWith(`--dir=`)?t.dir=l(r.slice(6)):r===`--spawn-mode`&&n+1<e.length?t.spawnMode=e[++n]:r.startsWith(`--spawn-mode=`)?t.spawnMode=r.slice(13):r===`--capacity`&&n+1<e.length?t.capacity=e[++n]:r.startsWith(`--capacity=`)?t.capacity=r.slice(11):r===`--permission-mode`&&n+1<e.length?t.permissionMode=e[++n]:r.startsWith(`--permission-mode=`)?t.permissionMode=r.slice(18):r===`--sandbox`?t.sandbox=`1`:r===`--name`&&n+1<e.length?t.name=e[++n]:r.startsWith(`--name=`)&&(t.name=r.slice(7))}return t}async function h(e){let t=m(e),n=t.dir||l(`.`);console.log(`[daemon] supervisor starting in ${n}`);let r=[{kind:`remoteControl`,process:null,backoffMs:v,failureCount:0,parked:!1,lastStartTime:0,restartTimer:null}];i({pid:process.pid,cwd:n,startedAt:new Date().toISOString(),workerKinds:r.map(e=>e.kind),lastStatus:`running`});let a=new AbortController,o=()=>{console.log(`[daemon] supervisor shutting down...`),a.abort(),s();for(let e of r)e.restartTimer&&(clearTimeout(e.restartTimer),e.restartTimer=null),e.process&&!e.process.killed&&e.process.kill(`SIGTERM`)};process.on(`SIGTERM`,o),process.on(`SIGINT`,o);for(let e of r)a.signal.aborted||g(e,n,t,a.signal);await new Promise(e=>{if(a.signal.aborted){e();return}a.signal.addEventListener(`abort`,()=>e(),{once:!0})}),await Promise.all(r.filter(e=>e.process&&e.process.exitCode===null).map(e=>new Promise(t=>{if(!e.process||e.process.exitCode!==null){t();return}let n=null;e.process.on(`exit`,()=>{n&&(clearTimeout(n),n=null),t()}),n=setTimeout(()=>{e.process&&e.process.exitCode===null&&e.process.kill(`SIGKILL`),t()},3e4),n.unref?.()}))),console.log(`[daemon] supervisor stopped`)}function g(e,t,i,a){if(a.aborted||e.parked)return;e.lastStartTime=Date.now();let o={...process.env,DAEMON_WORKER_DIR:t,DAEMON_WORKER_NAME:i.name,DAEMON_WORKER_SPAWN_MODE:i.spawnMode||`same-dir`,DAEMON_WORKER_CAPACITY:i.capacity||`4`,DAEMON_WORKER_PERMISSION:i.permissionMode,DAEMON_WORKER_SANDBOX:i.sandbox||`0`,DAEMON_WORKER_CREATE_SESSION:`1`,CLAUDE_CODE_SESSION_KIND:`daemon-worker`};console.log(`[daemon] spawning worker '${e.kind}'`);let s=n(r([`--daemon-worker=${e.kind}`],{env:o}),{cwd:t,stdio:[`ignore`,`pipe`,`pipe`]});e.process=s,s.stdout?.on(`data`,e=>{let t=e.toString().trimEnd().split(`
`);for(let e of t)console.log(`  ${e}`)}),s.stderr?.on(`data`,e=>{let t=e.toString().trimEnd().split(`
`);for(let e of t)console.error(`  ${e}`)}),s.on(`exit`,(n,r)=>{if(e.process=null,!a.aborted){if(n===_){console.error(`[daemon] worker '${e.kind}' exited with permanent error — parking`),e.parked=!0;return}if(Date.now()-e.lastStartTime<1e4){if(e.failureCount++,e.failureCount>=x){console.error(`[daemon] worker '${e.kind}' failed ${e.failureCount} times rapidly — parking`),e.parked=!0;return}}else e.failureCount=0,e.backoffMs=v;console.log(`[daemon] worker '${e.kind}' exited (code=${n}, signal=${r}), restarting in ${e.backoffMs}ms`),e.restartTimer=setTimeout(()=>{e.restartTimer=null,!a.aborted&&!e.parked&&g(e,t,i,a)},e.backoffMs),e.restartTimer.unref?.(),e.backoffMs=Math.min(e.backoffMs*b,y)}})}var _,v,y,b,x;e((()=>{t(),c(),_=78,v=2e3,y=12e4,b=2,x=5}))();export{u as daemonMain};