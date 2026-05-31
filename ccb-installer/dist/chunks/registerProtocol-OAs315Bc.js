import{n as e,r as t}from"./chunk-DR8-3Aex.js";import{n,s as r}from"./envUtils-DGIx59wW.js";import{As as i,Us as a,_u as o,ar as s,sr as c,vu as l}from"./growthbook-B0CtxuiD.js";import{B as u,L as d,d as f,s as p}from"./debug-2yq6p0y9.js";import{r as m,t as h}from"./execFileNoThrow-BOiwwche.js";import{n as g,t as _}from"./which-XUBYZRNc.js";import{a as v,r as y,t as b}from"./xdg-DevWejbQ.js";import{n as x,t as S}from"./sanitization-CrKHY6mO.js";import*as C from"os";import*as w from"path";import{promises as T}from"fs";function E(e){for(let t=0;t<e.length;t++){let n=e.charCodeAt(t);if(n<=31||n===127)return!0}return!1}function D(e){let t=e.startsWith(`claude-cli://`)?e:e.startsWith(`claude-cli:`)?e.replace(`${O}:`,`${O}://`):null;if(!t)throw Error(`Invalid deep link: expected ${O}:// scheme, got "${e}"`);let n;try{n=new URL(t)}catch{throw Error(`Invalid deep link URL: "${e}"`)}if(n.hostname!==`open`)throw Error(`Unknown deep link action: "${n.hostname}"`);let r=n.searchParams.get(`cwd`)??void 0,i=n.searchParams.get(`repo`)??void 0,a=n.searchParams.get(`q`);if(r&&!r.startsWith(`/`)&&!/^[a-zA-Z]:[/\\]/.test(r))throw Error(`Invalid cwd in deep link: must be an absolute path, got "${r}"`);if(r&&E(r))throw Error(`Deep link cwd contains disallowed control characters`);if(r&&r.length>j)throw Error(`Deep link cwd exceeds ${j} characters (got ${r.length})`);if(i&&!k.test(i))throw Error(`Invalid repo in deep link: expected "owner/repo", got "${i}"`);let o;if(a&&a.trim().length>0){if(o=x(a.trim()),E(o))throw Error(`Deep link query contains disallowed control characters`);if(o.length>A)throw Error(`Deep link query exceeds ${A} characters (got ${o.length})`)}return{query:o,cwd:r,repo:i}}var O,k,A,j,M=e((()=>{S(),O=`claude-cli`,k=/^[\w.-]+\/[\w.-]+$/,A=5e3,j=4096})),N=t({MACOS_BUNDLE_ID:()=>W,ensureDeepLinkProtocolRegistered:()=>U,isProtocolHandlerCurrent:()=>H,registerProtocolHandler:()=>B});function P(){return w.join(y(),`applications`,K)}function F(e){return`Exec="${e}" --handle-uri %u`}function I(e){return`"${e}" --handle-uri "%1"`}async function L(e){let t=w.join(q,`Contents`);try{await T.rm(q,{recursive:!0})}catch(e){if(d(e)!==`ENOENT`)throw e}await T.mkdir(w.dirname(J),{recursive:!0});let n=`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleIdentifier</key>
  <string>${W}</string>
  <key>CFBundleName</key>
  <string>${G}</string>
  <key>CFBundleExecutable</key>
  <string>claude</string>
  <key>CFBundleVersion</key>
  <string>1.0</string>
  <key>CFBundlePackageType</key>
  <string>APPL</string>
  <key>LSBackgroundOnly</key>
  <true/>
  <key>CFBundleURLTypes</key>
  <array>
    <dict>
      <key>CFBundleURLName</key>
      <string>Claude Code Deep Link</string>
      <key>CFBundleURLSchemes</key>
      <array>
        <string>${O}</string>
      </array>
    </dict>
  </array>
</dict>
</plist>`;await T.writeFile(w.join(t,`Info.plist`),n),await T.symlink(e,J),await h(`/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister`,[`-R`,q],{useCwd:!1}),f(`Registered ${O}:// protocol handler at ${q}`)}async function R(e){await T.mkdir(w.dirname(P()),{recursive:!0});let t=`[Desktop Entry]
Name=${G}
Comment=Handle ${O}:// deep links for Claude Code
${F(e)}
Type=Application
NoDisplay=true
MimeType=x-scheme-handler/${O};
`;await T.writeFile(P(),t);let n=await g(`xdg-mime`);if(n){let{code:e}=await h(n,[`default`,K,`x-scheme-handler/${O}`],{useCwd:!1});if(e!==0)throw Object.assign(Error(`xdg-mime exited with code ${e}`),{code:`XDG_MIME_FAILED`})}f(`Registered ${O}:// protocol handler at ${P()}`)}async function z(e){for(let t of[[`add`,Y,`/ve`,`/d`,`URL:${G}`,`/f`],[`add`,Y,`/v`,`URL Protocol`,`/d`,``,`/f`],[`add`,X,`/ve`,`/d`,I(e),`/f`]]){let{code:e}=await h(`reg`,t,{useCwd:!1});if(e!==0)throw Object.assign(Error(`reg add exited with code ${e}`),{code:`REG_FAILED`})}f(`Registered ${O}:// protocol handler in Windows registry`)}async function B(e){let t=e??await V();switch(process.platform){case`darwin`:await L(t);break;case`linux`:await R(t);break;case`win32`:await z(t);break;default:throw Error(`Unsupported platform: ${process.platform}`)}}async function V(){let e=process.platform===`win32`?`claude.exe`:`claude`,t=w.join(b(),e);try{return await T.realpath(t),t}catch{return process.execPath}}async function H(e){try{switch(process.platform){case`darwin`:return await T.readlink(J)===e;case`linux`:return(await T.readFile(P(),`utf8`)).includes(F(e));case`win32`:{let{stdout:t,code:n}=await h(`reg`,[`query`,X,`/ve`],{useCwd:!1});return n===0&&t.includes(I(e))}default:return!1}}catch{return!1}}async function U(){if(i().disableDeepLinkRegistration===`disable`||!s(`tengu_lodestone_enabled`,!1))return;let e=await V();if(await H(e))return;let t=w.join(n(),`.deep-link-register-failed`);try{let e=await T.stat(t);if(Date.now()-e.mtimeMs<Z)return}catch{}try{await B(e),l(`tengu_deep_link_registered`,{success:!0}),f(`Auto-registered claude-cli:// deep link protocol handler`),await T.rm(t,{force:!0}).catch(()=>{})}catch(e){let n=d(e);l(`tengu_deep_link_registered`,{success:!1,error_code:n}),f(`Failed to auto-register deep link protocol handler: ${e instanceof Error?e.message:String(e)}`,{level:`warn`}),(n===`EACCES`||n===`ENOSPC`)&&await T.writeFile(t,``).catch(()=>{})}}var W,G,K,q,J,Y,X,Z,Q=e((()=>{M(),c(),o(),p(),r(),u(),m(),a(),_(),v(),W=`com.anthropic.claude-code-url-handler`,G=`Claude Code URL Handler`,K=`claude-code-url-handler.desktop`,q=w.join(C.homedir(),`Applications`,`Claude Code URL Handler.app`),J=w.join(q,`Contents`,`MacOS`,`claude`),Y=`HKEY_CURRENT_USER\\Software\\Classes\\${O}`,X=`${Y}\\shell\\open\\command`,Z=1440*60*1e3}));export{D as a,M as i,Q as n,N as r,W as t};