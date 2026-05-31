import{a as e,n as t,r as n}from"./chunk-DR8-3Aex.js";import{B as r,I as i,d as a,s as o}from"./debug-2yq6p0y9.js";import{r as s,t as c}from"./execFileNoThrow-BOiwwche.js";import{n as l,t as u}from"./sleep-C6koP5Ka.js";import{a as ee,n as te,o as ne,t as re}from"./common-DVPINZSi.js";import{a as ie,o as ae,t as oe}from"./src-DkMoNhDs.js";import{a as d,c as f,n as se,o as ce,s as le,t as ue}from"./escHotkey-B9JDbemH.js";import*as de from"path";import{extname as fe}from"path";import*as p from"fs";import{promisify as pe}from"util";import{execFile as me,execFileSync as he}from"child_process";var ge=n({getFrontmostAppInfo:()=>ke,key:()=>Ce,keys:()=>we,mouseButton:()=>Ee,mouseLocation:()=>Te,mouseScroll:()=>De,moveMouse:()=>Se,typeText:()=>Oe});async function _e(e){let{stdout:t}=await ye(`osascript`,[`-e`,e],{encoding:`utf-8`});return t.trim()}async function m(e){let{stdout:t}=await ye(`osascript`,[`-l`,`JavaScript`,`-e`,e],{encoding:`utf-8`});return t.trim()}function ve(e,t,n,r,i){let a=`ObjC.import("CoreGraphics"); var p = $.CGPointMake(${t},${n}); var e = $.CGEventCreateMouseEvent(null, $.${e}, p, ${r});`;return i!==void 0&&(a+=` $.CGEventSetIntegerValueField(e, $.kCGMouseEventClickState, ${i});`),a+=` $.CGEventPost($.kCGHIDEventTap, e);`,a}var ye,be,xe,Se,Ce,we,Te,Ee,De,Oe,ke,Ae=t((()=>{ye=pe(me),be={return:36,enter:36,tab:48,space:49,delete:51,backspace:51,escape:53,esc:53,left:123,right:124,down:125,up:126,f1:122,f2:120,f3:99,f4:118,f5:96,f6:97,f7:98,f8:100,f9:101,f10:109,f11:103,f12:111,home:115,end:119,pageup:116,pagedown:121},xe={command:`command down`,cmd:`command down`,meta:`command down`,super:`command down`,shift:`shift down`,option:`option down`,alt:`option down`,control:`control down`,ctrl:`control down`},Se=async(e,t,n)=>{await m(ve(`kCGEventMouseMoved`,e,t,0))},Ce=async(e,t)=>{if(t===`release`)return;let n=e.toLowerCase(),r=be[n];r===void 0?await _e(`tell application "System Events" to keystroke "${e.length===1?e:n}"`):await _e(`tell application "System Events" to key code ${r}`)},we=async e=>{let t=[],n=null;for(let r of e){let e=xe[r.toLowerCase()];e?t.push(e):n=r}if(!n)return;let r=n.toLowerCase(),i=be[r],a=t.length>0?` using {${t.join(`, `)}}`:``;i===void 0?await _e(`tell application "System Events" to keystroke "${n.length===1?n:r}"${a}`):await _e(`tell application "System Events" to key code ${i}${a}`)},Te=async()=>{let[e,t]=(await m(`ObjC.import("CoreGraphics"); var e = $.CGEventCreate(null); var p = $.CGEventGetLocation(e); p.x + "," + p.y`)).split(`,`);return{x:Math.round(Number(e)),y:Math.round(Number(t))}},Ee=async(e,t,n)=>{let r=await Te(),i=e===`left`?0:e===`right`?1:2,a=i===0?`kCGEventLeftMouseDown`:i===1?`kCGEventRightMouseDown`:`kCGEventOtherMouseDown`,o=i===0?`kCGEventLeftMouseUp`:i===1?`kCGEventRightMouseUp`:`kCGEventOtherMouseUp`;if(t===`click`)for(let e=0;e<(n??1);e++)await m(ve(a,r.x,r.y,i,e+1)),await m(ve(o,r.x,r.y,i,e+1));else t===`press`?await m(ve(a,r.x,r.y,i)):await m(ve(o,r.x,r.y,i))},De=async(e,t)=>{await m(t===`vertical`?`ObjC.import("CoreGraphics"); var e = $.CGEventCreateScrollWheelEvent(null, 0, 1, ${e}); $.CGEventPost($.kCGHIDEventTap, e);`:`ObjC.import("CoreGraphics"); var e = $.CGEventCreateScrollWheelEvent(null, 0, 2, 0, ${e}); $.CGEventPost($.kCGHIDEventTap, e);`)},Oe=async e=>{await _e(`tell application "System Events" to keystroke "${e.replace(/\\/g,`\\\\`).replace(/"/g,`\\"`)}"`)},ke=()=>{try{let e=he(`osascript`,[`-e`,`
      tell application "System Events"
        set frontApp to first application process whose frontmost is true
        set appName to name of frontApp
        set bundleId to bundle identifier of frontApp
        return bundleId & "|" & appName
      end tell
    `],{encoding:`utf-8`,stdio:[`pipe`,`pipe`,`ignore`]}).trim();if(!e||!e.includes(`|`))return null;let[t,n]=e.split(`|`,2);return{bundleId:t,appName:n}}catch{return null}}})),je=n({getFrontmostAppInfo:()=>Ve,key:()=>Re,keys:()=>ze,mouseButton:()=>Ie,mouseLocation:()=>Fe,mouseScroll:()=>Le,moveMouse:()=>Pe,typeText:()=>Be});function h(e){let t=Bun.spawnSync({cmd:[`powershell`,`-NoProfile`,`-NonInteractive`,`-Command`,e],stdout:`pipe`,stderr:`pipe`});return new TextDecoder().decode(t.stdout).trim()}var g,Me,Ne,Pe,Fe,Ie,Le,Re,ze,Be,Ve,He=t((()=>{g=`
Add-Type -Language CSharp @'
using System;
using System.Runtime.InteropServices;
using System.Text;
using System.Diagnostics;

public class CuWin32 {
    // --- Cursor ---
    [DllImport("user32.dll")] public static extern bool SetCursorPos(int X, int Y);
    [DllImport("user32.dll")] public static extern bool GetCursorPos(out POINT p);
    [StructLayout(LayoutKind.Sequential)] public struct POINT { public int X; public int Y; }

    // --- SendInput ---
    [StructLayout(LayoutKind.Sequential)] public struct MOUSEINPUT {
        public int dx; public int dy; public int mouseData; public uint dwFlags; public uint time; public IntPtr dwExtraInfo;
    }
    [StructLayout(LayoutKind.Explicit)] public struct INPUT {
        [FieldOffset(0)] public uint type;
        [FieldOffset(4)] public MOUSEINPUT mi;
    }
    [StructLayout(LayoutKind.Sequential)] public struct KEYBDINPUT {
        public ushort wVk; public ushort wScan; public uint dwFlags; public uint time; public IntPtr dwExtraInfo;
    }
    [StructLayout(LayoutKind.Explicit)] public struct KINPUT {
        [FieldOffset(0)] public uint type;
        [FieldOffset(4)] public KEYBDINPUT ki;
    }
    [DllImport("user32.dll", SetLastError=true)] public static extern uint SendInput(uint n, INPUT[] i, int cb);
    [DllImport("user32.dll", SetLastError=true)] public static extern uint SendInput(uint n, KINPUT[] i, int cb);

    // --- Keyboard ---
    [DllImport("user32.dll")] public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);
    [DllImport("user32.dll")] public static extern short VkKeyScan(char ch);

    // --- Window ---
    [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint pid);
    [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr hWnd, StringBuilder sb, int max);

    // Constants
    public const uint INPUT_MOUSE = 0, INPUT_KEYBOARD = 1;
    public const uint MOUSEEVENTF_LEFTDOWN = 0x0002, MOUSEEVENTF_LEFTUP = 0x0004;
    public const uint MOUSEEVENTF_RIGHTDOWN = 0x0008, MOUSEEVENTF_RIGHTUP = 0x0010;
    public const uint MOUSEEVENTF_MIDDLEDOWN = 0x0020, MOUSEEVENTF_MIDDLEUP = 0x0040;
    public const uint MOUSEEVENTF_WHEEL = 0x0800, MOUSEEVENTF_HWHEEL = 0x1000;
    public const uint KEYEVENTF_KEYUP = 0x0002;
}
'@
`,Me={return:13,enter:13,tab:9,space:32,backspace:8,delete:46,escape:27,esc:27,left:37,up:38,right:39,down:40,home:36,end:35,pageup:33,pagedown:34,f1:112,f2:113,f3:114,f4:115,f5:116,f6:117,f7:118,f8:119,f9:120,f10:121,f11:122,f12:123,shift:160,lshift:160,rshift:161,control:162,ctrl:162,lcontrol:162,rcontrol:163,alt:164,option:164,lalt:164,ralt:165,win:91,meta:91,command:91,cmd:91,super:91,insert:45,printscreen:44,pause:19,numlock:144,capslock:20,scrolllock:145},Ne=new Set([`shift`,`lshift`,`rshift`,`control`,`ctrl`,`lcontrol`,`rcontrol`,`alt`,`option`,`lalt`,`ralt`,`win`,`meta`,`command`,`cmd`,`super`]),Pe=async(e,t,n)=>{h(`${g}; [CuWin32]::SetCursorPos(${Math.round(e)}, ${Math.round(t)}) | Out-Null`)},Fe=async()=>{let[e,t]=h(`${g}; $p = New-Object CuWin32+POINT; [CuWin32]::GetCursorPos([ref]$p) | Out-Null; "$($p.X),$($p.Y)"`).split(`,`);return{x:Number(e),y:Number(t)}},Ie=async(e,t,n)=>{let r=e===`left`?`MOUSEEVENTF_LEFTDOWN`:e===`right`?`MOUSEEVENTF_RIGHTDOWN`:`MOUSEEVENTF_MIDDLEDOWN`,i=e===`left`?`MOUSEEVENTF_LEFTUP`:e===`right`?`MOUSEEVENTF_RIGHTUP`:`MOUSEEVENTF_MIDDLEUP`;if(t===`click`){let e=n??1,t=``;for(let n=0;n<e;n++)t+=`$i.mi.dwFlags=[CuWin32]::${r}; [CuWin32]::SendInput(1, @($i), [Runtime.InteropServices.Marshal]::SizeOf($i)) | Out-Null; $i.mi.dwFlags=[CuWin32]::${i}; [CuWin32]::SendInput(1, @($i), [Runtime.InteropServices.Marshal]::SizeOf($i)) | Out-Null; `;h(`${g}; $i = New-Object CuWin32+INPUT; $i.type=[CuWin32]::INPUT_MOUSE; ${t}`)}else h(t===`press`?`${g}; $i = New-Object CuWin32+INPUT; $i.type=[CuWin32]::INPUT_MOUSE; $i.mi.dwFlags=[CuWin32]::${r}; [CuWin32]::SendInput(1, @($i), [Runtime.InteropServices.Marshal]::SizeOf($i)) | Out-Null`:`${g}; $i = New-Object CuWin32+INPUT; $i.type=[CuWin32]::INPUT_MOUSE; $i.mi.dwFlags=[CuWin32]::${i}; [CuWin32]::SendInput(1, @($i), [Runtime.InteropServices.Marshal]::SizeOf($i)) | Out-Null`)},Le=async(e,t)=>{h(`${g}; $i = New-Object CuWin32+INPUT; $i.type=[CuWin32]::INPUT_MOUSE; $i.mi.dwFlags=[CuWin32]::${t===`vertical`?`MOUSEEVENTF_WHEEL`:`MOUSEEVENTF_HWHEEL`}; $i.mi.mouseData=${e*120}; [CuWin32]::SendInput(1, @($i), [Runtime.InteropServices.Marshal]::SizeOf($i)) | Out-Null`)},Re=async(e,t)=>{let n=Me[e.toLowerCase()],r=t===`release`?`2`:`0`;n===void 0?e.length===1&&h(`${g}; $vk = [CuWin32]::VkKeyScan([char]${e.charCodeAt(0)}) -band 0xFF; [CuWin32]::keybd_event([byte]$vk, 0, ${r}, [UIntPtr]::Zero)`):h(`${g}; [CuWin32]::keybd_event(${n}, 0, ${r}, [UIntPtr]::Zero)`)},ze=async e=>{let t=[],n=null;for(let r of e){let e=r.toLowerCase();if(Ne.has(e)){let n=Me[e];n!==void 0&&t.push(n)}else n=r}if(!n)return;let r=g+`; `;for(let e of t)r+=`[CuWin32]::keybd_event(${e}, 0, 0, [UIntPtr]::Zero); `;let i=Me[n.toLowerCase()];if(i!==void 0)r+=`[CuWin32]::keybd_event(${i}, 0, 0, [UIntPtr]::Zero); [CuWin32]::keybd_event(${i}, 0, 2, [UIntPtr]::Zero); `;else if(n.length===1){let e=n.charCodeAt(0);r+=`$vk = [CuWin32]::VkKeyScan([char]${e}) -band 0xFF; [CuWin32]::keybd_event([byte]$vk, 0, 0, [UIntPtr]::Zero); [CuWin32]::keybd_event([byte]$vk, 0, 2, [UIntPtr]::Zero); `}for(let e of t.reverse())r+=`[CuWin32]::keybd_event(${e}, 0, 2, [UIntPtr]::Zero); `;h(r)},Be=async e=>{h(`Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('${e.replace(/'/g,`''`)}')`)},Ve=()=>{try{let e=h(`${g}
$hwnd = [CuWin32]::GetForegroundWindow()
$procId = [uint32]0
[CuWin32]::GetWindowThreadProcessId($hwnd, [ref]$procId) | Out-Null
$proc = Get-Process -Id $procId -ErrorAction SilentlyContinue
"$($proc.MainModule.FileName)|$($proc.ProcessName)"`);if(!e||!e.includes(`|`))return null;let[t,n]=e.split(`|`,2);return{bundleId:t,appName:n}}catch{return null}}})),Ue=n({getFrontmostAppInfo:()=>tt,key:()=>Qe,keys:()=>$e,mouseButton:()=>Xe,mouseLocation:()=>Ye,mouseScroll:()=>Ze,moveMouse:()=>Je,typeText:()=>et});function _(e){let t=Bun.spawnSync({cmd:e,stdout:`pipe`,stderr:`pipe`});return new TextDecoder().decode(t.stdout).trim()}function We(e){return Ke[e.toLowerCase()]??e}function Ge(e){return e===`left`?`1`:e===`right`?`3`:`2`}var Ke,qe,Je,Ye,Xe,Ze,Qe,$e,et,tt,nt=t((()=>{Ke={return:`Return`,enter:`Return`,tab:`Tab`,space:`space`,backspace:`BackSpace`,delete:`Delete`,escape:`Escape`,esc:`Escape`,left:`Left`,up:`Up`,right:`Right`,down:`Down`,home:`Home`,end:`End`,pageup:`Prior`,pagedown:`Next`,f1:`F1`,f2:`F2`,f3:`F3`,f4:`F4`,f5:`F5`,f6:`F6`,f7:`F7`,f8:`F8`,f9:`F9`,f10:`F10`,f11:`F11`,f12:`F12`,shift:`shift`,lshift:`shift`,rshift:`shift`,control:`ctrl`,ctrl:`ctrl`,lcontrol:`ctrl`,rcontrol:`ctrl`,alt:`alt`,option:`alt`,lalt:`alt`,ralt:`alt`,win:`super`,meta:`super`,command:`super`,cmd:`super`,super:`super`,insert:`Insert`,printscreen:`Print`,pause:`Pause`,numlock:`Num_Lock`,capslock:`Caps_Lock`,scrolllock:`Scroll_Lock`},qe=new Set([`shift`,`lshift`,`rshift`,`control`,`ctrl`,`lcontrol`,`rcontrol`,`alt`,`option`,`lalt`,`ralt`,`win`,`meta`,`command`,`cmd`,`super`]),Je=async(e,t,n)=>{_([`xdotool`,`mousemove`,`--sync`,String(Math.round(e)),String(Math.round(t))])},Ye=async()=>{let e=_([`xdotool`,`getmouselocation`]),t=e.match(/x:(\d+)/),n=e.match(/y:(\d+)/);return{x:t?Number(t[1]):0,y:n?Number(n[1]):0}},Xe=async(e,t,n)=>{let r=Ge(e);_(t===`click`?[`xdotool`,`click`,`--repeat`,String(n??1),r]:t===`press`?[`xdotool`,`mousedown`,r]:[`xdotool`,`mouseup`,r])},Ze=async(e,t)=>{if(t===`vertical`){let t=e>=0?`5`:`4`,n=Math.abs(Math.round(e));n>0&&_([`xdotool`,`click`,`--repeat`,String(n),t])}else{let t=e>=0?`7`:`6`,n=Math.abs(Math.round(e));n>0&&_([`xdotool`,`click`,`--repeat`,String(n),t])}},Qe=async(e,t)=>{let n=We(e);_(t===`press`?[`xdotool`,`keydown`,n]:[`xdotool`,`keyup`,n])},$e=async e=>{let t=[],n=null;for(let r of e)qe.has(r.toLowerCase())?t.push(We(r)):n=r;n&&_([`xdotool`,`key`,[...t,We(n)].join(`+`)])},et=async e=>{_([`xdotool`,`type`,`--delay`,`12`,e])},tt=()=>{try{let e=_([`xdotool`,`getactivewindow`]);if(!e)return null;let t=_([`xdotool`,`getwindowpid`,e]);if(!t)return null;let n=t.trim(),r=``;try{r=_([`readlink`,`-f`,`/proc/${n}/exe`])}catch{}let i=``;try{i=_([`cat`,`/proc/${n}/comm`])}catch{}return!r&&!i?null:{bundleId:r||`/proc/${n}/exe`,appName:i||`unknown`}}catch{return null}}})),rt=n({ComputerUseInputAPI:()=>mt,getFrontmostAppInfo:()=>pt,isSupported:()=>at,key:()=>st,keys:()=>ct,mouseButton:()=>ut,mouseLocation:()=>lt,mouseScroll:()=>dt,moveMouse:()=>ot,typeText:()=>ft});function it(){try{if(process.platform===`darwin`)return Ae(),e(ge);if(process.platform===`win32`)return He(),e(je);if(process.platform===`linux`)return nt(),e(Ue)}catch{return null}return null}var v,at,ot,st,ct,lt,ut,dt,ft,pt,mt,ht=t((()=>{v=it(),at=v!==null,ot=v?.moveMouse,st=v?.key,ct=v?.keys,lt=v?.mouseLocation,ut=v?.mouseButton,dt=v?.mouseScroll,ft=v?.typeText,pt=v?.getFrontmostAppInfo??(()=>null),mt=class{}}));function y(){if(gt)return gt;let t=(ht(),e(rt));if(!t.isSupported)throw Error(`@ant/computer-use-input is not supported on this platform`);return gt=t}var gt,_t=t((()=>{})),vt=n({MODIFIER_KEYS:()=>St,VK_MAP:()=>xt,getTmpDir:()=>bt,ps:()=>x,psAsync:()=>yt,runPs:()=>S,validateHwnd:()=>b});function b(e){if(!/^\d+$/.test(e))throw Error(`Invalid HWND: "${e}" — must be numeric`);return e}function x(e){let t=Bun.spawnSync({cmd:[`powershell`,`-NoProfile`,`-NonInteractive`,`-Command`,e],stdout:`pipe`,stderr:`pipe`});return new TextDecoder().decode(t.stdout).trim()}function S(e){try{let t=Bun.spawnSync({cmd:[`powershell`,`-NoProfile`,`-NonInteractive`,`-Command`,e],stdout:`pipe`,stderr:`pipe`});return t.exitCode===0?new TextDecoder().decode(t.stdout).trim():null}catch{return null}}async function yt(e){let t=Bun.spawn([`powershell`,`-NoProfile`,`-NonInteractive`,`-Command`,e],{stdout:`pipe`,stderr:`pipe`}),n=await new Response(t.stdout).text();return await t.exited,n.trim()}function bt(){return process.env.TEMP||process.env.TMP||`/tmp`}var xt,St,C=t((()=>{xt={backspace:8,tab:9,enter:13,return:13,shift:16,lshift:160,rshift:161,ctrl:17,control:17,lcontrol:162,rcontrol:163,alt:18,option:18,menu:18,lalt:164,ralt:165,pause:19,capslock:20,escape:27,esc:27,space:32,pageup:33,pagedown:34,end:35,home:36,left:37,up:38,right:39,down:40,insert:45,delete:46,win:91,meta:91,command:91,cmd:91,super:91,numlock:144,scrolllock:145,printscreen:44,f1:112,f2:113,f3:114,f4:115,f5:116,f6:117,f7:118,f8:119,f9:120,f10:121,f11:122,f12:123},St=new Set([`shift`,`lshift`,`rshift`,`control`,`ctrl`,`lcontrol`,`rcontrol`,`alt`,`option`,`lalt`,`ralt`,`win`,`meta`,`command`,`cmd`,`super`])})),Ct=n({platform:()=>Ot}),wt,Tt,Et,Dt,Ot,kt=t((()=>{_t(),le(),wt={async moveMouse(e,t){await y().moveMouse(e,t,!1)},async click(e,t,n){let r=y();await r.moveMouse(e,t,!1),await r.mouseButton(n,`click`,1)},async typeText(e){await y().typeText(e)},async key(e,t){await y().key(e,t)},async keys(e){await y().keys(e)},async scroll(e,t){await y().mouseScroll(e,t)},async mouseLocation(){return y().mouseLocation()}},Tt={async captureScreen(e){return f().screenshot.captureExcluding([],void 0,void 0,void 0,e)},async captureRegion(e,t,n,r){return f().screenshot.captureRegion([],e,t,n,r)}},Et={listAll(){return f().display.listAll()},getSize(e){return f().display.getSize(e)}},Dt={listRunning(){return f().apps.listRunning().map(e=>({id:e.bundleId??``,pid:0,title:e.displayName??``}))},async listInstalled(){return(await f().apps.listInstalled()).map(e=>({id:e.bundleId??``,displayName:e.displayName??``,path:e.path??``}))},async open(e){await f().apps.open(e)},getFrontmostApp(){let e=y().getFrontmostAppInfo();return e?{id:e.bundleId,appName:e.appName}:null},findWindowByTitle(e){return this.listRunning().find(t=>t.title.includes(e))??null}},Ot={input:wt,screenshot:Tt,display:Et,apps:Dt}})),At=n({listWindows:()=>jt});function jt(){let e=Bun.spawnSync({cmd:[`powershell`,`-NoProfile`,`-NonInteractive`,`-Command`,Mt],stdout:`pipe`,stderr:`pipe`}),t=new TextDecoder().decode(e.stdout).trim();return t?t.split(`
`).filter(Boolean).map(e=>{let t=e.trim(),n=t.indexOf(`|`),r=t.indexOf(`|`,n+1);if(n===-1||r===-1)return null;let i=t.slice(0,n),a=Number(t.slice(n+1,r)),o=t.slice(r+1);return!i||isNaN(a)||!o?null:{hwnd:i,pid:a,title:o}}).filter(e=>e!==null):[]}var Mt,w=t((()=>{Mt=`
Add-Type @'
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Text;
public class WinEnum {
    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

    [DllImport("user32.dll")]
    public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);
    [DllImport("user32.dll")]
    public static extern bool IsWindowVisible(IntPtr hWnd);
    [DllImport("user32.dll", CharSet=CharSet.Unicode)]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);
    [DllImport("user32.dll")]
    public static extern int GetWindowTextLength(IntPtr hWnd);
    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);

    public static List<string> results = new List<string>();

    public static void Run() {
        results.Clear();
        EnumWindows(delegate(IntPtr hWnd, IntPtr lParam) {
            if (!IsWindowVisible(hWnd)) return true;
            int len = GetWindowTextLength(hWnd);
            if (len == 0) return true;
            StringBuilder sb = new StringBuilder(len + 1);
            GetWindowText(hWnd, sb, sb.Capacity);
            string title = sb.ToString();
            if (string.IsNullOrWhiteSpace(title)) return true;
            uint pid = 0;
            GetWindowThreadProcessId(hWnd, out pid);
            results.Add(hWnd.ToInt64() + "|" + pid + "|" + title);
            return true;
        }, IntPtr.Zero);
    }
}
'@
[WinEnum]::Run()
[WinEnum]::results | ForEach-Object { $_ }
`})),Nt=n({closeExcel:()=>Ut,createExcel:()=>Ht,openExcel:()=>Ft,readCell:()=>It,readRange:()=>Lt,saveExcel:()=>Vt,setFormula:()=>Bt,writeCell:()=>Rt,writeRange:()=>zt});function T(e){let t=Bun.spawnSync({cmd:[`powershell`,`-NoProfile`,`-NonInteractive`,`-Command`,e],stdout:`pipe`,stderr:`pipe`}),n=new TextDecoder().decode(t.stderr).trim();if(t.exitCode!==0&&n)throw Error(`PowerShell error: ${n}`);return new TextDecoder().decode(t.stdout).trim()}function E(e){return e.replace(/'/g,`''`)}function Pt(e,t){return typeof t==`number`?`$${e} = $wb.Sheets.Item(${t})`:`$${e} = $wb.Sheets.Item('${t.replace(/'/g,`''`)}')`}function D(e=!0){let t=[];return e&&t.push(`if ($wb) { $wb.Close($false) }`),t.push(`$excel.Quit()`),t.push(`[System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel) | Out-Null`),t.join(`
    `)}function Ft(e){let t=T(`
${O}
try {
    $wb = $excel.Workbooks.Open('${E(e)}')
    $result = @{ sheets = @(); sheetNames = @() }
    foreach ($sheet in $wb.Sheets) {
        $result.sheetNames += $sheet.Name
        $ur = $sheet.UsedRange
        $rows = $ur.Rows.Count
        $cols = $ur.Columns.Count
        $cells = @()
        $count = 0
        for ($r = 1; $r -le $rows -and $count -lt 1000; $r++) {
            for ($c = 1; $c -le $cols -and $count -lt 1000; $c++) {
                $cell = $sheet.Cells.Item($r, $c)
                $val = $cell.Value2
                if ($null -ne $val) {
                    $f = $null
                    if ($cell.HasFormula) { $f = $cell.Formula }
                    $entry = @{ row = $r; col = $c; value = $val }
                    if ($f) { $entry.formula = $f }
                    $cells += $entry
                    $count++
                }
            }
        }
        $result.sheets += @{
            name = $sheet.Name
            usedRange = @{ rows = $rows; cols = $cols }
            cells = $cells
        }
    }
    $result | ConvertTo-Json -Depth 5 -Compress
} finally {
    ${D()}
}
`);if(!t)throw Error(`No output from openExcel`);let n=JSON.parse(t),r=Array.isArray(n.sheets)?n.sheets:[n.sheets],i=Array.isArray(n.sheetNames)?n.sheetNames:[n.sheetNames];return{sheets:r.map(e=>({name:e.name,usedRange:e.usedRange,cells:Array.isArray(e.cells)?e.cells:e.cells?[e.cells]:[]})),sheetNames:i}}function It(e,t,n,r){let i=T(`
${O}
try {
    $wb = $excel.Workbooks.Open('${E(e)}')
    ${Pt(`sheet`,t)}
    $val = $sheet.Cells.Item(${n}, ${r}).Value2
    if ($null -eq $val) { Write-Output 'null' } else { Write-Output ($val | ConvertTo-Json -Compress) }
} finally {
    ${D()}
}
`);return i===`null`||i===``?null:JSON.parse(i)}function Lt(e,t,n,r,i,a){let o=T(`
${O}
try {
    $wb = $excel.Workbooks.Open('${E(e)}')
    ${Pt(`sheet`,t)}
    $rows = @()
    for ($r = ${n}; $r -le ${i}; $r++) {
        $row = @()
        for ($c = ${r}; $c -le ${a}; $c++) {
            $val = $sheet.Cells.Item($r, $c).Value2
            $row += if ($null -eq $val) { '__NULL__' } else { $val }
        }
        $rows += ,@($row)
    }
    $rows | ConvertTo-Json -Depth 3 -Compress
} finally {
    ${D()}
}
`);if(!o)return[];let s=JSON.parse(o);return(Array.isArray(s[0])?s:[s]).map(e=>e.map(e=>e===`__NULL__`?null:e))}function Rt(e,t,n,r,i){let a=JSON.stringify(i);return T(`
${O}
try {
    $wb = $excel.Workbooks.Open('${E(e)}')
    ${Pt(`sheet`,t)}
    $sheet.Cells.Item(${n}, ${r}).Value2 = (ConvertFrom-Json '${a.replace(/'/g,`''`)}')
    $wb.Save()
    Write-Output 'true'
} finally {
    ${D()}
}
`)===`true`}function zt(e,t,n,r,i){let a=JSON.stringify(i).replace(/'/g,`''`);return T(`
${O}
try {
    $wb = $excel.Workbooks.Open('${E(e)}')
    ${Pt(`sheet`,t)}
    $data = ConvertFrom-Json '${a}'
    for ($r = 0; $r -lt $data.Count; $r++) {
        $row = $data[$r]
        for ($c = 0; $c -lt $row.Count; $c++) {
            $val = $row[$c]
            if ($null -ne $val) {
                if ($val -is [int] -or $val -is [long] -or $val -is [double] -or $val -is [decimal]) {
                    $sheet.Cells.Item(${n} + $r, ${r} + $c).Value2 = [double]$val
                } else {
                    $sheet.Cells.Item(${n} + $r, ${r} + $c).Value2 = [string]$val
                }
            }
        }
    }
    $wb.Save()
    Write-Output 'true'
} finally {
    ${D()}
}
`)===`true`}function Bt(e,t,n,r,i){return T(`
${O}
try {
    $wb = $excel.Workbooks.Open('${E(e)}')
    ${Pt(`sheet`,t)}
    $sheet.Cells.Item(${n}, ${r}).Formula = '${i.replace(/'/g,`''`)}'
    $wb.Save()
    Write-Output 'true'
} finally {
    ${D()}
}
`)===`true`}function Vt(e,t){let n=t?`$wb.SaveAs('${E(t)}')`:`$wb.Save()`;return T(`
${O}
try {
    $wb = $excel.Workbooks.Open('${E(e)}')
    ${n}
    Write-Output 'true'
} finally {
    ${D()}
}
`)===`true`}function Ht(e){return T(`
${O}
try {
    $wb = $excel.Workbooks.Add()
    $wb.SaveAs('${E(e)}')
    Write-Output 'true'
} finally {
    ${D()}
}
`)===`true`}function Ut(e){}var O,Wt=t((()=>{O=`$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false`})),Gt=n({appendText:()=>Xt,closeWord:()=>rn,createWord:()=>nn,findReplace:()=>Qt,insertTable:()=>$t,insertText:()=>Zt,openWord:()=>Jt,readText:()=>Yt,saveAsPdf:()=>tn,saveWord:()=>en});function k(e){let t=Bun.spawnSync({cmd:[`powershell`,`-NoProfile`,`-NonInteractive`,`-Command`,e],stdout:`pipe`,stderr:`pipe`});return new TextDecoder().decode(t.stdout).trim()}function A(e,t){if(!e)return t;try{return JSON.parse(e)}catch{return t}}function j(e){return e.replace(/'/g,`''`)}function Kt(e,t){return`
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
try {
    ${t?`$doc = $word.Documents.Open('${j(t)}')`:`$doc = $word.Documents.Add()`}
    ${e}
} finally {
    if ($doc -ne $null) { $doc.Close($false); }
    if ($word -ne $null) { $word.Quit(); }
    if ($word -ne $null) { [System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null }
}
`}function qt(e,t){return`
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
try {
    $doc = $word.Documents.Open('${j(t)}')
    ${e}
    $doc.Save()
    Write-Output '{"ok":true}'
} catch {
    Write-Output ('{"ok":false,"error":"' + ($_.Exception.Message -replace '"','\\"') + '"}')
} finally {
    if ($doc -ne $null) { $doc.Close($false); }
    if ($word -ne $null) { $word.Quit(); }
    if ($word -ne $null) { [System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null }
}
`}async function Jt(e){return A(k(Kt(`
    # Paragraphs (limit 500)
    $paras = @()
    $paraCount = $doc.Paragraphs.Count
    $limit = [Math]::Min($paraCount, 500)
    for ($i = 1; $i -le $limit; $i++) {
        $p = $doc.Paragraphs.Item($i)
        $r = $p.Range
        $paras += @{
            text    = $r.Text -replace '\\r$',''
            bold    = [bool]($r.Font.Bold -eq -1)
            italic  = [bool]($r.Font.Italic -eq -1)
            fontSize = $r.Font.Size
        }
    }

    # Tables
    $tables = @()
    foreach ($table in $doc.Tables) {
        $rows = $table.Rows.Count
        $cols = $table.Columns.Count
        $data = @()
        for ($r = 1; $r -le $rows; $r++) {
            $row = @()
            for ($c = 1; $c -le $cols; $c++) {
                try {
                    $cellText = $table.Cell($r, $c).Range.Text
                    # Trim trailing \\r\\a that Word adds to cell text
                    $cellText = $cellText -replace '[\\r\\n\\a]+$',''
                    $row += $cellText
                } catch {
                    $row += ''
                }
            }
            $data += ,@($row)
        }
        $tables += @{ rows = $rows; cols = $cols; data = $data }
    }

    # Counts: wdStatisticWords=0, wdStatisticPages=2
    $wordCount = $doc.ComputeStatistics(0)
    $pageCount = $doc.ComputeStatistics(2)

    $result = @{
        text       = $doc.Content.Text
        paragraphs = $paras
        tables     = $tables
        wordCount  = $wordCount
        pageCount  = $pageCount
    }
    Write-Output (ConvertTo-Json $result -Depth 5 -Compress)
`,e)),{text:``,paragraphs:[],tables:[],wordCount:0,pageCount:0})}async function Yt(e){return k(Kt(`Write-Output $doc.Content.Text`,e))}async function Xt(e,t,n){return A(k(qt(`
    $sel = $word.Selection
    $sel.EndKey(6) | Out-Null
    ${n?[n.bold===void 0?``:`$sel.Font.Bold = ${n.bold?`-1`:`0`}`,n.italic===void 0?``:`$sel.Font.Italic = ${n.italic?`-1`:`0`}`,n.fontSize===void 0?``:`$sel.Font.Size = ${n.fontSize}`,n.fontName?`$sel.Font.Name = '${j(n.fontName)}'`:``].filter(Boolean).join(`
    `):``}
    $sel.TypeText('${j(t)}')
`,e)),{ok:!1}).ok}async function Zt(e,t,n){return A(k(qt(`
    $doc.Paragraphs.Item(${t}).Range.InsertBefore('${j(n)}')
`,e)),{ok:!1}).ok}async function Qt(e,t,n,r){let i=r===!1?1:2,a=`
    $content = $doc.Content
    $findObj = $content.Find
    $findObj.ClearFormatting()
    $findObj.Replacement.ClearFormatting()

    # Count replacements by iterating
    $count = 0
    $findObj.Text = '${j(t)}'
    $findObj.Replacement.Text = '${j(n)}'
    $findObj.Forward = $true
    $findObj.Wrap = 0
    $findObj.Format = $false
    $findObj.MatchCase = $false
    $findObj.MatchWholeWord = $false
    $findObj.MatchWildcards = $false

    if (${i} -eq 2) {
        # Count occurrences first using a clone of content
        $range2 = $doc.Content.Duplicate
        while ($range2.Find.Execute('${j(t)}')) { $count++ }
        # Now do the actual replace
        $findObj.Execute('${j(t)}', $false, $false, $false, $false, $false, $true, 0, $false, '${j(n)}', 2)
    } else {
        $found = $findObj.Execute('${j(t)}', $false, $false, $false, $false, $false, $true, 0, $false, '${j(n)}', 1)
        if ($found) { $count = 1 }
    }
`;return A(k(`
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
try {
    $doc = $word.Documents.Open('${j(e)}')
    ${a}
    $doc.Save()
    Write-Output ('{"count":' + $count + '}')
} catch {
    Write-Output '{"count":0}'
} finally {
    if ($doc -ne $null) { $doc.Close($false); }
    if ($word -ne $null) { $word.Quit(); }
    if ($word -ne $null) { [System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null }
}
`),{count:0}).count}async function $t(e,t,n,r){return A(k(qt(`
    $sel = $word.Selection
    $sel.EndKey(6) | Out-Null
    $table = $doc.Tables.Add($sel.Range, ${t}, ${n})
    $data = @(${r.map(e=>`,@(`+e.map(e=>`'${j(e)}'`).join(`,`)+`)`).join(`
    `)})
    for ($r = 0; $r -lt $data.Count; $r++) {
        for ($c = 0; $c -lt $data[$r].Count; $c++) {
            $table.Cell($r + 1, $c + 1).Range.Text = $data[$r][$c]
        }
    }
`,e)),{ok:!1}).ok}async function en(e,t){if(!t||t===e)return A(k(qt(``,e)),{ok:!1}).ok;let n=`$doc.SaveAs('${j(t)}')`;return A(k(`
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
try {
    $doc = $word.Documents.Open('${j(e)}')
    ${n}
    Write-Output '{"ok":true}'
} catch {
    Write-Output ('{"ok":false,"error":"' + ($_.Exception.Message -replace '"','\\"') + '"}')
} finally {
    if ($doc -ne $null) { $doc.Close($false); }
    if ($word -ne $null) { $word.Quit(); }
    if ($word -ne $null) { [System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null }
}
`),{ok:!1}).ok}async function tn(e,t){let n=`$doc.SaveAs2('${j(t)}', 17)`;return A(k(`
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
try {
    $doc = $word.Documents.Open('${j(e)}')
    ${n}
    Write-Output '{"ok":true}'
} catch {
    Write-Output ('{"ok":false,"error":"' + ($_.Exception.Message -replace '"','\\"') + '"}')
} finally {
    if ($doc -ne $null) { $doc.Close($false); }
    if ($word -ne $null) { $word.Quit(); }
    if ($word -ne $null) { [System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null }
}
`),{ok:!1}).ok}async function nn(e){return A(k(`
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
try {
    $doc = $word.Documents.Add()
    $doc.SaveAs('${j(e)}')
    Write-Output '{"ok":true}'
} catch {
    Write-Output ('{"ok":false,"error":"' + ($_.Exception.Message -replace '"','\\"') + '"}')
} finally {
    if ($doc -ne $null) { $doc.Close($false); }
    if ($word -ne $null) { $word.Quit(); }
    if ($word -ne $null) { [System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null }
}
`),{ok:!1}).ok}function rn(e){}var an=t((()=>{}));function on(e){let t=e.toLowerCase(),n=fe(t);if(n){if(cn.has(n))return`excel`;if(ln.has(n))return`word`;if(un.has(n))return`text`}let r=t.replace(/\.exe$/,``).split(/[/\\]/).pop()??``;return r===`excel`||r.includes(`excel`)?`excel`:r===`winword`||r===`word`||r.includes(`word`)?`word`:r===`notepad`||r===`notepad++`||r===`code`?`text`:dn.has(r)?`browser`:`generic`}async function sn(t){let n=on(t);switch(n){case`excel`:{let{createExcel:n,openExcel:r}=(Wt(),e(Nt));if(t.match(/\.(xlsx|xls|csv|xlsm|xlsb)$/i))try{return r(t),{type:`excel`,filePath:t}}catch{return{type:`excel`,filePath:t}}let i=`${process.env.TEMP||`/tmp`}\\cu_new_${Date.now()}.xlsx`;return n(i),{type:`excel`,filePath:i}}case`word`:{let{createWord:n,openWord:r}=(an(),e(Gt));if(t.match(/\.(docx|doc|rtf)$/i))try{return r(t),{type:`word`,filePath:t}}catch{return{type:`word`,filePath:t}}let i=`${process.env.TEMP||`/tmp`}\\cu_new_${Date.now()}.docx`;return n(i),{type:`word`,filePath:i}}default:return{type:n}}}var cn,ln,un,dn,fn=t((()=>{cn=new Set([`.xlsx`,`.xls`,`.csv`,`.xlsm`,`.xlsb`]),ln=new Set([`.docx`,`.doc`,`.rtf`]),un=new Set([`.txt`,`.log`,`.md`,`.json`,`.xml`,`.yaml`,`.yml`,`.ini`,`.cfg`,`.conf`]),dn=new Set([`chrome`,`msedge`,`firefox`,`brave`,`opera`])}));function pn(e){return e=b(e),x(`Add-Type @'
using System;
using System.Runtime.InteropServices;
public class CuDwm {
    [DllImport("dwmapi.dll")]
    public static extern int DwmSetWindowAttribute(IntPtr hwnd, int attr, ref uint val, int size);
}
'@
$color = [uint32]0x0000C800
[CuDwm]::DwmSetWindowAttribute([IntPtr]::new([long]${e}), 34, [ref]$color, 4)`)===`0`}function mn(e){return e=b(e),x(`Add-Type @'
using System;
using System.Runtime.InteropServices;
public class CuDwm {
    [DllImport("dwmapi.dll")]
    public static extern int DwmSetWindowAttribute(IntPtr hwnd, int attr, ref uint val, int size);
}
'@
$color = [uint32]0xFFFFFFFF
[CuDwm]::DwmSetWindowAttribute([IntPtr]::new([long]${e}), 34, [ref]$color, 4)`)===`0`}var hn=t((()=>{C()})),gn=n({hideVirtualCursor:()=>bn,isVirtualCursorActive:()=>xn,moveVirtualCursor:()=>yn,showVirtualCursor:()=>vn});function _n(e,t){return`
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
Add-Type @'
using System;
using System.Runtime.InteropServices;
using System.Drawing;
using System.Drawing.Drawing2D;

public class VCursor {
    [DllImport("user32.dll")]
    public static extern bool IsWindow(IntPtr hWnd);

    [DllImport("user32.dll", SetLastError = true)]
    public static extern int SetWindowLong(IntPtr hWnd, int nIndex, int dwNewLong);

    [DllImport("user32.dll", SetLastError = true)]
    public static extern int GetWindowLong(IntPtr hWnd, int nIndex);

    [DllImport("user32.dll")]
    public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hAfter, int X, int Y, int cx, int cy, uint f);

    [DllImport("user32.dll")]
    public static extern bool GetWindowRect(IntPtr h, out RECT r);

    [StructLayout(LayoutKind.Sequential)]
    public struct RECT { public int L, T, R, B; }

    public const int GWL_EXSTYLE = -20;
    public const int WS_EX_LAYERED = 0x80000;
    public const int WS_EX_TRANSPARENT = 0x20;
    public const int WS_EX_TOOLWINDOW = 0x80;
    public const int WS_EX_NOACTIVATE = 0x08000000;
    public static readonly IntPtr HWND_TOPMOST = new IntPtr(-1);
    public const uint SWP_NOACTIVATE = 0x0010;
    public const uint SWP_SHOWWINDOW = 0x0040;
    public const uint SWP_NOSIZE = 0x0001;

    public static void MakeOverlay(IntPtr h) {
        int ex = GetWindowLong(h, GWL_EXSTYLE);
        ex |= WS_EX_LAYERED | WS_EX_TRANSPARENT | WS_EX_TOOLWINDOW | WS_EX_NOACTIVATE;
        SetWindowLong(h, GWL_EXSTYLE, ex);
    }
}
'@

$targetHwnd = [IntPtr]::new([long]${e})
$stopFile = '${t.replace(/\\/g,`\\\\`)}'
$cursorSize = ${Sn}

# Create cursor form with arrow shape
$cursor = New-Object System.Windows.Forms.Form
$cursor.FormBorderStyle = [System.Windows.Forms.FormBorderStyle]::None
$cursor.ShowInTaskbar = $false
$cursor.TopMost = $true
$cursor.StartPosition = [System.Windows.Forms.FormStartPosition]::Manual
$cursor.Size = New-Object System.Drawing.Size($cursorSize, $cursorSize)
$cursor.Location = New-Object System.Drawing.Point(-32000, -32000)
$cursor.Opacity = ${En}
$cursor.BackColor = [System.Drawing.Color]::Magenta
$cursor.TransparencyKey = [System.Drawing.Color]::Magenta

# Draw arrow cursor shape
$bmp = New-Object System.Drawing.Bitmap($cursorSize, $cursorSize)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
# Arrow polygon (pointing top-left)
$points = @(
    (New-Object System.Drawing.Point(1, 1)),
    (New-Object System.Drawing.Point(1, 16)),
    (New-Object System.Drawing.Point(5, 12)),
    (New-Object System.Drawing.Point(9, 18)),
    (New-Object System.Drawing.Point(12, 16)),
    (New-Object System.Drawing.Point(8, 10)),
    (New-Object System.Drawing.Point(13, 10)),
    (New-Object System.Drawing.Point(1, 1))
)
$brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(${Cn}, ${wn}, ${Tn}))
$g.FillPolygon($brush, $points)
$pen = New-Object System.Drawing.Pen([System.Drawing.Color]::White, 1)
$g.DrawPolygon($pen, $points)
$g.Dispose()
$cursor.BackgroundImage = $bmp

$cursor.Show()
[VCursor]::MakeOverlay($cursor.Handle)

# Position file: the TS side writes "x,y" or "x,y,click" to this file
$posFile = $stopFile + '.pos'

$script:lastCX = -32000
$script:lastCY = -32000
$script:clickFlash = 0

$timer = New-Object System.Windows.Forms.Timer
$timer.Interval = 16  # ~60fps

$timer.Add_Tick({
    if (-not [VCursor]::IsWindow($targetHwnd)) {
        $timer.Stop(); $cursor.Close()
        [System.Windows.Forms.Application]::ExitThread()
        return
    }
    # Check stop
    if (Test-Path $stopFile) {
        $timer.Stop(); $cursor.Close()
        try { Remove-Item $stopFile -ErrorAction SilentlyContinue } catch {}
        try { Remove-Item $posFile -ErrorAction SilentlyContinue } catch {}
        [System.Windows.Forms.Application]::ExitThread()
        return
    }
    # Read position updates
    if (Test-Path $posFile) {
        try {
            $data = Get-Content $posFile -Raw -ErrorAction SilentlyContinue
            if ($data) {
                $parts = $data.Trim().Split(',')
                if ($parts.Length -ge 2) {
                    $script:lastCX = [int]$parts[0]
                    $script:lastCY = [int]$parts[1]
                    if ($parts.Length -ge 3 -and $parts[2] -eq 'click') {
                        $script:clickFlash = 6  # flash for 6 frames (~100ms)
                    }
                }
                Remove-Item $posFile -ErrorAction SilentlyContinue
            }
        } catch {}
    }

    # Get window position to convert client coords to screen coords
    $wr = New-Object VCursor+RECT
    [VCursor]::GetWindowRect($targetHwnd, [ref]$wr) | Out-Null
    $screenX = $wr.L + $script:lastCX
    $screenY = $wr.T + $script:lastCY

    # Click flash: briefly change color
    if ($script:clickFlash -gt 0) {
        $cursor.Opacity = 1.0
        $script:clickFlash--
        if ($script:clickFlash -eq 0) {
            $cursor.Opacity = ${En}
        }
    }

    [VCursor]::SetWindowPos($cursor.Handle, [VCursor]::HWND_TOPMOST,
        $screenX, $screenY, 0, 0,
        [VCursor]::SWP_NOSIZE -bor [VCursor]::SWP_NOACTIVATE -bor [VCursor]::SWP_SHOWWINDOW) | Out-Null
    $cursor.Visible = $true
})

$timer.Start()
[System.Windows.Forms.Application]::Run()
`}function vn(e){e=b(e),bn();try{let t=bt(),n=Date.now(),r=de.join(t,`cu_vcursor_stop_${n}`),i=de.join(t,`cu_vcursor_${n}.ps1`),a=_n(e,r);return p.writeFileSync(i,a,`utf-8`),Dn=Bun.spawn([`powershell`,`-NoProfile`,`-ExecutionPolicy`,`Bypass`,`-File`,i],{stdout:`ignore`,stderr:`ignore`}),M=r,On=i,!0}catch{return!1}}function yn(e,t,n=!1){if(!M)return;let r=M+`.pos`;try{let i=n?`${Math.round(e)},${Math.round(t)},click`:`${Math.round(e)},${Math.round(t)}`;p.writeFileSync(r,i,`utf-8`)}catch{}}function bn(){if(M){try{p.writeFileSync(M,`STOP`,`utf-8`)}catch{}setTimeout(()=>{try{Dn?.kill()}catch{}try{On&&p.unlinkSync(On)}catch{}try{M&&p.unlinkSync(M)}catch{}},2e3)}Dn=null,M=null,On=null}function xn(){return Dn!==null}var Sn,Cn,wn,Tn,En,Dn,M,On,kn=t((()=>{C(),Sn=20,Cn=255,wn=50,Tn=50,En=.9,Dn=null,M=null,On=null})),An=n({hideIndicator:()=>Pn,indicateClick:()=>Ln,indicateDone:()=>zn,indicateKey:()=>In,indicateScroll:()=>Rn,indicateTyping:()=>Fn,showIndicator:()=>Mn,updateIndicator:()=>Nn});function jn(e,t){return`
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
Add-Type @'
using System;
using System.Runtime.InteropServices;
public class Indicator {
    [DllImport("user32.dll")] public static extern bool IsWindow(IntPtr h);
    [DllImport("user32.dll",SetLastError=true)] public static extern int SetWindowLong(IntPtr h, int i, int v);
    [DllImport("user32.dll",SetLastError=true)] public static extern int GetWindowLong(IntPtr h, int i);
    [DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr h, IntPtr a, int x, int y, int w, int h2, uint f);
    [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
    [StructLayout(LayoutKind.Sequential)] public struct RECT { public int L,T,R,B; }
    public const int GWL_EXSTYLE = -20;
    public const int WS_EX_LAYERED = 0x80000;
    public const int WS_EX_TRANSPARENT = 0x20;
    public const int WS_EX_TOOLWINDOW = 0x80;
    public const int WS_EX_NOACTIVATE = 0x08000000;
    public static readonly IntPtr HWND_TOPMOST = new IntPtr(-1);
    public const uint SWP_NOACTIVATE = 0x0010;
    public const uint SWP_SHOWWINDOW = 0x0040;
    public static void MakeOverlay(IntPtr h) {
        int ex = GetWindowLong(h, GWL_EXSTYLE);
        ex |= WS_EX_LAYERED | WS_EX_TRANSPARENT | WS_EX_TOOLWINDOW | WS_EX_NOACTIVATE;
        SetWindowLong(h, GWL_EXSTYLE, ex);
    }
}
'@

$targetHwnd = [IntPtr]::new([long]${e})
$stopFile = '${t.replace(/\\/g,`\\\\`)}'
$msgFile = $stopFile + '.msg'

$form = New-Object System.Windows.Forms.Form
$form.FormBorderStyle = [System.Windows.Forms.FormBorderStyle]::None
$form.ShowInTaskbar = $false
$form.TopMost = $true
$form.StartPosition = [System.Windows.Forms.FormStartPosition]::Manual
$form.Size = New-Object System.Drawing.Size(${Bn}, ${Vn})
$form.Location = New-Object System.Drawing.Point(-32000, -32000)
$form.BackColor = [System.Drawing.Color]::FromArgb(240, ${Hn})
$form.Opacity = 0.92

$label = New-Object System.Windows.Forms.Label
$label.Dock = [System.Windows.Forms.DockStyle]::Fill
$label.ForeColor = [System.Drawing.Color]::FromArgb(${Un})
$label.Font = New-Object System.Drawing.Font("Segoe UI", 10, [System.Drawing.FontStyle]::Regular)
$label.TextAlign = [System.Drawing.ContentAlignment]::MiddleLeft
$label.Padding = New-Object System.Windows.Forms.Padding(8, 0, 8, 0)
$label.Text = ""
$form.Controls.Add($label)

$form.Show()
[Indicator]::MakeOverlay($form.Handle)

$script:lastMsg = ""
$script:lastMsgTime = [DateTime]::MinValue
$script:visible = $false

$timer = New-Object System.Windows.Forms.Timer
$timer.Interval = 50  # 20fps

$timer.Add_Tick({
    if (-not [Indicator]::IsWindow($targetHwnd)) {
        $timer.Stop(); $form.Close()
        [System.Windows.Forms.Application]::ExitThread()
        return
    }
    if (Test-Path $stopFile) {
        $timer.Stop(); $form.Close()
        try { Remove-Item $stopFile -ErrorAction SilentlyContinue } catch {}
        try { Remove-Item $msgFile -ErrorAction SilentlyContinue } catch {}
        [System.Windows.Forms.Application]::ExitThread()
        return
    }

    # Read new message
    if (Test-Path $msgFile) {
        try {
            $msg = Get-Content $msgFile -Raw -Encoding UTF8 -ErrorAction SilentlyContinue
            if ($msg) {
                $script:lastMsg = $msg.Trim()
                $script:lastMsgTime = [DateTime]::Now
                Remove-Item $msgFile -ErrorAction SilentlyContinue
            }
        } catch {}
    }

    # Fade logic: hide after ${N}ms of no updates
    $elapsed = ([DateTime]::Now - $script:lastMsgTime).TotalMilliseconds
    if ($elapsed -gt ${N} -and $script:visible) {
        $form.Visible = $false
        $script:visible = $false
        return
    }
    if ($elapsed -le ${N} -and $script:lastMsg -ne "") {
        # Position at bottom-center of the bound window
        $wr = New-Object Indicator+RECT
        [Indicator]::GetWindowRect($targetHwnd, [ref]$wr) | Out-Null
        $ww = $wr.R - $wr.L
        $fx = $wr.L + [int](($ww - ${Bn}) / 2)
        $fy = $wr.B - ${Vn} - 8
        $label.Text = $script:lastMsg
        [Indicator]::SetWindowPos($form.Handle, [Indicator]::HWND_TOPMOST,
            $fx, $fy, 0, 0,
            0x0001 -bor [Indicator]::SWP_NOACTIVATE -bor [Indicator]::SWP_SHOWWINDOW) | Out-Null
        $form.Visible = $true
        $script:visible = $true
        # Fade opacity near end
        if ($elapsed -gt ${N*.7}) {
            $form.Opacity = [Math]::Max(0.3, 0.92 * (1.0 - ($elapsed - ${N*.7}) / ${N*.3}))
        } else {
            $form.Opacity = 0.92
        }
    }
})

$timer.Start()
[System.Windows.Forms.Application]::Run()
`}function Mn(e){e=b(e),Pn();try{let t=bt(),n=Date.now();return P=de.join(t,`cu_indicator_stop_${n}`),F=de.join(t,`cu_indicator_${n}.ps1`),I=P+`.msg`,p.writeFileSync(F,jn(e,P),`utf-8`),Wn=Bun.spawn([`powershell`,`-NoProfile`,`-ExecutionPolicy`,`Bypass`,`-File`,F],{stdout:`ignore`,stderr:`ignore`}),!0}catch{return!1}}function Nn(e){if(I)try{p.writeFileSync(I,e,`utf-8`)}catch{}}function Pn(){if(P){try{p.writeFileSync(P,`STOP`,`utf-8`)}catch{}setTimeout(()=>{try{Wn?.kill()}catch{}try{F&&p.unlinkSync(F)}catch{}try{P&&p.unlinkSync(P)}catch{}try{I&&p.unlinkSync(I)}catch{}},2e3)}Wn=null,P=null,F=null,I=null}function Fn(e){Nn(`\u2328 Typing "${e.length>30?e.slice(0,30)+`...`:e}"`)}function In(e){Nn(`\u2328 ${e}`)}function Ln(e,t,n=`left`){Nn(`\uD83D\uDDB1 ${n===`right`?`Right-click`:`Click`} (${e}, ${t})`)}function Rn(e,t){Nn(`\uD83D\uDCDC Scroll ${e===`up`?`↑`:e===`down`?`↓`:e===`left`?`←`:`→`} ${t}`)}function zn(){Nn(`✅ Done`)}var Bn,Vn,N,Hn,Un,Wn,P,F,I,Gn=t((()=>{C(),Bn=350,Vn=28,N=2e3,Hn=`30, 30, 30`,Un=`220, 220, 220`,Wn=null,P=null,F=null,I=null})),Kn=n({call:()=>Jn,callSync:()=>Yn,ensureBridge:()=>qn,stopBridge:()=>Xn});function qn(){if(L)return!0;try{let e=de.join(__dirname,`bridge.py`);L=Bun.spawn([`python`,`-u`,e],{stdin:`pipe`,stdout:`pipe`,stderr:`ignore`,env:{...process.env,PYTHONIOENCODING:`utf-8`,PYTHONUNBUFFERED:`1`}});let t=L.stdout.getReader();return(async()=>{try{for(;;){let{done:e,value:n}=await t.read();if(e)break;z+=new TextDecoder().decode(n);let r;for(;(r=z.indexOf(`
`))!==-1;){let e=z.slice(0,r).trim();if(z=z.slice(r+1),e)try{let t=JSON.parse(e),n=R.get(t.id);n&&(R.delete(t.id),t.error?n.reject(Error(t.error)):n.resolve(t.result))}catch{}}}}catch{}})(),!0}catch{return L=null,!1}}async function Jn(e,t={},n=1e4){if(!qn())throw Error(`Python bridge not available`);let r=++Zn,i={id:r,method:e,params:t};return new Promise((t,a)=>{R.set(r,{resolve:t,reject:a});let o=setTimeout(()=>{R.delete(r),a(Error(`Bridge call ${e} timed out after ${n}ms`))},n),s=t,c=a;R.set(r,{resolve:e=>{clearTimeout(o),s(e)},reject:e=>{clearTimeout(o),c(e)}});try{let e=L.stdin;if(e){let t=e;t.write(JSON.stringify(i)+`
`),typeof t.flush==`function`&&t.flush()}}catch(e){clearTimeout(o),R.delete(r),a(Error(`Bridge write failed: ${e}`))}})}function Yn(e,t={},n=1e4){try{let r=de.join(__dirname,`bridge.py`),i=JSON.stringify({id:1,method:e,params:t}),a=Bun.spawnSync({cmd:[`python`,`-u`,r],stdin:Buffer.from(i+`
`),stdout:`pipe`,stderr:`pipe`,env:{...process.env,PYTHONIOENCODING:`utf-8`},timeout:n}),o=new TextDecoder().decode(a.stdout).trim();if(!o)return null;let s=JSON.parse(o);if(s.error)throw Error(s.error);return s.result}catch{return null}}function Xn(){if(L){try{let e=L.stdin;if(e){let t=e;typeof t.end==`function`&&t.end()}L.kill()}catch{}L=null}R.clear(),z=``}var L,Zn,R,z,Qn=t((()=>{L=null,Zn=0,R=new Map,z=``})),B=n({clearEditChildCache:()=>$n,consoleKey:()=>or,consoleText:()=>sr,findEditChild:()=>er,resolveInputHwnd:()=>V,sendChar:()=>tr,sendClick:()=>cr,sendKey:()=>ir,sendKeys:()=>ar,sendMouseDown:()=>lr,sendMouseMove:()=>dr,sendMouseUp:()=>ur,sendMouseWheel:()=>fr,sendText:()=>rr});function $n(e){e?H.delete(e):H.clear()}function V(e){return e=b(e),er(e)??e}function er(e){if(e=b(e),H.has(e))return H.get(e);let t=S(`${U}
[WinMsg]::FindChildren([IntPtr]::new([long]${e}))
[WinMsg]::childResults | ForEach-Object { $_ }
`);if(t){let n=t.split(`
`).filter(Boolean).map(e=>{let t=e.trim(),n=t.indexOf(`|`);return n===-1?null:{hwnd:t.slice(0,n),className:t.slice(n+1)}}).filter(e=>e!==null);for(let t of pr){let r=n.find(e=>e.className===t);if(r)return H.set(e,r.hwnd),r.hwnd}}let n=S(`
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
Add-Type @'
using System;
using System.Runtime.InteropServices;
public class UiaHelper {
    [DllImport("user32.dll")]
    public static extern bool IsWindow(IntPtr hWnd);
}
'@
try {
    $el = [System.Windows.Automation.AutomationElement]::FromHandle([IntPtr]::new([long]${e}))
    if ($el -eq $null) { Write-Output 'NONE'; exit }

    # Search for Edit or Document control types (covers text editors)
    $editCond = [System.Windows.Automation.PropertyCondition]::new(
        [System.Windows.Automation.AutomationElement]::ControlTypeProperty,
        [System.Windows.Automation.ControlType]::Edit)
    $docCond = [System.Windows.Automation.PropertyCondition]::new(
        [System.Windows.Automation.AutomationElement]::ControlTypeProperty,
        [System.Windows.Automation.ControlType]::Document)
    $orCond = [System.Windows.Automation.OrCondition]::new($editCond, $docCond)

    $found = $el.FindFirst([System.Windows.Automation.TreeScope]::Descendants, $orCond)
    if ($found -eq $null) { Write-Output 'NONE'; exit }

    $nativeHwnd = $found.Current.NativeWindowHandle
    if ($nativeHwnd -ne 0) {
        Write-Output $nativeHwnd
    } else {
        Write-Output 'NONE'
    }
} catch {
    Write-Output 'NONE'
}
`);if(n&&n!==`NONE`){let t=n.trim();if(t&&t!==`0`)return H.set(e,t),t}return H.set(e,null),null}function tr(e,t){e=b(e);let n=t.codePointAt(0);if(n===void 0)return!1;let r=`[IntPtr]::new([long]${e})`;return n<=65535?S(`${U}
[WinMsg]::SendMessage(${r}, [WinMsg]::WM_CHAR, [IntPtr]${n}, [IntPtr]0)
`)!==null:S(`${U}
[WinMsg]::SendMessage(${r}, [WinMsg]::WM_CHAR, [IntPtr]${Math.floor((n-65536)/1024)+55296}, [IntPtr]0)
[WinMsg]::SendMessage(${r}, [WinMsg]::WM_CHAR, [IntPtr]${(n-65536)%1024+56320}, [IntPtr]0)
`)!==null}function nr(e,t){let n=`[IntPtr]::new([long]${e})`,r=[];for(let e of t){let t=e.codePointAt(0);if(t<=65535)r.push(`[WinMsg]::SendMessage(${n}, [WinMsg]::WM_CHAR, [IntPtr]${t}, [IntPtr]0)`);else{let e=Math.floor((t-65536)/1024)+55296,i=(t-65536)%1024+56320;r.push(`[WinMsg]::SendMessage(${n}, [WinMsg]::WM_CHAR, [IntPtr]${e}, [IntPtr]0)`),r.push(`[WinMsg]::SendMessage(${n}, [WinMsg]::WM_CHAR, [IntPtr]${i}, [IntPtr]0)`)}}return r}function rr(e,t){return S(`${U}
${nr(V(e),t).join(`
`)}
`)!==null}function ir(e,t,n){return e=b(e),S(`${U}
[WinMsg]::PostMessage([IntPtr]::new([long]${e}), ${n===`down`?`0x0100`:`0x0101`}, [IntPtr]${t}, [WinMsg]::${n===`down`?`KeyDownLParam`:`KeyUpLParam`}(${t}))
`)!==null}function ar(e,t){if(e=V(e),t.length===0)return!1;let n=[],r;for(let e of t){let t=e.toLowerCase(),i=xt[t];if(i!==void 0)St.has(t)?n.push(i):r=i;else if(t.length===1)r=t.toUpperCase().charCodeAt(0);else return!1}if(r===void 0)return!1;let i=`[IntPtr]::new([long]${e})`,a=[];for(let e of n)a.push(`[WinMsg]::PostMessage(${i}, [WinMsg]::WM_KEYDOWN, [IntPtr]${e}, [WinMsg]::KeyDownLParam(${e}))`);a.push(`[WinMsg]::PostMessage(${i}, [WinMsg]::WM_KEYDOWN, [IntPtr]${r}, [WinMsg]::KeyDownLParam(${r}))`),a.push(`[WinMsg]::PostMessage(${i}, [WinMsg]::WM_KEYUP, [IntPtr]${r}, [WinMsg]::KeyUpLParam(${r}))`);for(let e of[...n].reverse())a.push(`[WinMsg]::PostMessage(${i}, [WinMsg]::WM_KEYUP, [IntPtr]${e}, [WinMsg]::KeyUpLParam(${e}))`);return S(`${U}
${a.join(`
`)}
`)!==null}function or(e,t,n=`\0`){e=b(e);let r=n.charCodeAt(0);return S(`${mr}
[ConsoleInput]::SendKeyToConsole([IntPtr]::new([long]${e}), ${t}, [char]${r})
`)!==null}function sr(e,t){e=b(e);let n=t.replace(/'/g,`''`);return S(`${mr}
[ConsoleInput]::SendTextToConsole([IntPtr]::new([long]${e}), '${n}')
`)!==null}function cr(e,t,n,r){e=V(e);let i=r===`left`?`0x0201`:`0x0204`,a=r===`left`?`0x0202`:`0x0205`,o=`[IntPtr]::new([long]${e})`;return S(`${U}
$lp = [WinMsg]::MakeLParam(${t}, ${n})
[WinMsg]::SendMessage(${o}, ${i}, [IntPtr]0, $lp)
[WinMsg]::SendMessage(${o}, ${a}, [IntPtr]0, $lp)
`)!==null}function lr(e,t,n){return e=V(e),S(`${U}
$lp = [WinMsg]::MakeLParam(${t}, ${n})
[WinMsg]::SendMessage([IntPtr]::new([long]${e}), [WinMsg]::WM_LBUTTONDOWN, [IntPtr]1, $lp)
`)!==null}function ur(e,t,n){return e=V(e),S(`${U}
$lp = [WinMsg]::MakeLParam(${t}, ${n})
[WinMsg]::SendMessage([IntPtr]::new([long]${e}), [WinMsg]::WM_LBUTTONUP, [IntPtr]0, $lp)
`)!==null}function dr(e,t,n){return e=V(e),S(`${U}
$lp = [WinMsg]::MakeLParam(${t}, ${n})
[WinMsg]::SendMessage([IntPtr]::new([long]${e}), 0x0200, [IntPtr]1, $lp)
`)!==null}function fr(e,t,n,r,i=!1){e=V(e);let a=i?`0x020E`:`0x020A`,o=Math.round(r)*120;return S(`${U}
# WM_MOUSEWHEEL/WM_MOUSEHWHEEL require screen coords in lParam
# and wheel delta in high word of wParam
Add-Type @'
using System;
using System.Runtime.InteropServices;
public class WheelHelper {
    [DllImport("user32.dll")] public static extern bool ClientToScreen(IntPtr hWnd, ref POINT p);
    [StructLayout(LayoutKind.Sequential)] public struct POINT { public int X, Y; }

    [DllImport("user32.dll", CharSet=CharSet.Unicode, EntryPoint="SendMessageW")]
    public static extern IntPtr SendMsg(IntPtr hWnd, uint msg, IntPtr wParam, IntPtr lParam);

    public static void Scroll(IntPtr hWnd, int clientX, int clientY, int delta, uint msg) {
        POINT pt; pt.X = clientX; pt.Y = clientY;
        ClientToScreen(hWnd, ref pt);
        IntPtr wParam = (IntPtr)(delta << 16);
        IntPtr lParam = (IntPtr)((pt.Y << 16) | (pt.X & 0xFFFF));
        SendMsg(hWnd, msg, wParam, lParam);
    }
}
'@
[WheelHelper]::Scroll([IntPtr]::new([long]${e}), ${t}, ${n}, ${o}, ${a})
`)!==null}var H,U,pr,mr,W=t((()=>{C(),H=new Map,U=`
Add-Type @'
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Text;

public class WinMsg {
    public delegate bool EnumChildProc(IntPtr hWnd, IntPtr lParam);

    [DllImport("user32.dll")]
    public static extern bool EnumChildWindows(IntPtr parent, EnumChildProc proc, IntPtr lParam);

    [DllImport("user32.dll", CharSet=CharSet.Unicode)]
    public static extern int GetClassName(IntPtr h, StringBuilder sb, int max);

    // CRITICAL: CharSet.Unicode → resolves to SendMessageW
    // SendMessageW sends Unicode WM_CHAR (full UTF-16 codepoints including CJK)
    [DllImport("user32.dll", CharSet=CharSet.Unicode, EntryPoint="SendMessageW")]
    public static extern IntPtr SendMessage(IntPtr hWnd, uint msg, IntPtr wParam, IntPtr lParam);

    [DllImport("user32.dll", CharSet=CharSet.Unicode, EntryPoint="PostMessageW")]
    public static extern bool PostMessage(IntPtr hWnd, uint msg, IntPtr wParam, IntPtr lParam);

    [DllImport("user32.dll")]
    public static extern uint MapVirtualKeyW(uint uCode, uint uMapType);

    public static IntPtr MakeLParam(int lo, int hi) {
        return (IntPtr)((hi << 16) | (lo & 0xFFFF));
    }

    // Build lParam for WM_KEYDOWN / WM_KEYUP with correct scan code
    // lParam bits: 0-15 repeat count, 16-23 scan code, 24 extended, 30 prev state, 31 transition
    public static IntPtr KeyDownLParam(uint vk) {
        uint scanCode = MapVirtualKeyW(vk, 0); // MAPVK_VK_TO_VSC = 0
        return (IntPtr)(1 | (scanCode << 16));  // repeat=1, scanCode in bits 16-23
    }
    public static IntPtr KeyUpLParam(uint vk) {
        uint scanCode = MapVirtualKeyW(vk, 0);
        return (IntPtr)(1 | (scanCode << 16) | (1 << 30) | (1u << 31)); // prev=1, transition=1
    }

    public const uint WM_CHAR = 0x0102;
    public const uint WM_KEYDOWN = 0x0100;
    public const uint WM_KEYUP = 0x0101;
    public const uint WM_LBUTTONDOWN = 0x0201;
    public const uint WM_LBUTTONUP = 0x0202;
    public const uint WM_RBUTTONDOWN = 0x0204;
    public const uint WM_RBUTTONUP = 0x0205;

    public static List<string> childResults = new List<string>();

    public static void FindChildren(IntPtr parent) {
        childResults.Clear();
        EnumChildWindows(parent, delegate(IntPtr hWnd, IntPtr lParam) {
            StringBuilder sb = new StringBuilder(256);
            GetClassName(hWnd, sb, sb.Capacity);
            childResults.Add(hWnd.ToInt64() + "|" + sb.ToString());
            return true;
        }, IntPtr.Zero);
    }
}
'@
`,pr=[`Windows.UI.Input.InputSite.WindowClass`,`RichEditD2DPT`,`RichEdit20W`,`Edit`,`Scintilla`,`Chrome_RenderWidgetHostHWND`,`TextBox`,`RichTextBox`,`Windows.UI.Core.CoreWindow`],mr=`
Add-Type @'
using System;
using System.Runtime.InteropServices;

public class ConsoleInput {
    [DllImport("kernel32.dll", SetLastError=true)]
    public static extern bool AttachConsole(uint dwProcessId);

    [DllImport("kernel32.dll", SetLastError=true)]
    public static extern bool FreeConsole();

    [DllImport("kernel32.dll", SetLastError=true)]
    public static extern IntPtr GetStdHandle(int nStdHandle);

    [DllImport("kernel32.dll", CharSet=CharSet.Unicode, SetLastError=true)]
    public static extern bool WriteConsoleInput(
        IntPtr hConsoleInput,
        INPUT_RECORD[] lpBuffer,
        uint nLength,
        out uint lpNumberOfEventsWritten);

    [DllImport("kernel32.dll")]
    public static extern uint MapVirtualKeyW(uint uCode, uint uMapType);

    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);

    public const int STD_INPUT_HANDLE = -10;

    [StructLayout(LayoutKind.Explicit)]
    public struct INPUT_RECORD {
        [FieldOffset(0)] public ushort EventType;
        [FieldOffset(4)] public KEY_EVENT_RECORD KeyEvent;
    }

    [StructLayout(LayoutKind.Explicit, CharSet=CharSet.Unicode)]
    public struct KEY_EVENT_RECORD {
        [FieldOffset(0)]  public bool bKeyDown;
        [FieldOffset(4)]  public ushort wRepeatCount;
        [FieldOffset(6)]  public ushort wVirtualKeyCode;
        [FieldOffset(8)]  public ushort wVirtualScanCode;
        [FieldOffset(10)] public char UnicodeChar;
        [FieldOffset(12)] public uint dwControlKeyState;
    }

    public static bool SendKeyToConsole(IntPtr hwnd, ushort vk, char ch) {
        uint pid;
        GetWindowThreadProcessId(hwnd, out pid);
        if (pid == 0) return false;

        FreeConsole();
        if (!AttachConsole(pid)) return false;

        try {
            IntPtr hInput = GetStdHandle(STD_INPUT_HANDLE);
            if (hInput == IntPtr.Zero || hInput == (IntPtr)(-1)) return false;

            ushort scanCode = (ushort)MapVirtualKeyW(vk, 0);
            INPUT_RECORD[] records = new INPUT_RECORD[2];

            // Key down
            records[0].EventType = 1; // KEY_EVENT
            records[0].KeyEvent.bKeyDown = true;
            records[0].KeyEvent.wRepeatCount = 1;
            records[0].KeyEvent.wVirtualKeyCode = vk;
            records[0].KeyEvent.wVirtualScanCode = scanCode;
            records[0].KeyEvent.UnicodeChar = ch;
            records[0].KeyEvent.dwControlKeyState = 0;

            // Key up
            records[1].EventType = 1;
            records[1].KeyEvent.bKeyDown = false;
            records[1].KeyEvent.wRepeatCount = 1;
            records[1].KeyEvent.wVirtualKeyCode = vk;
            records[1].KeyEvent.wVirtualScanCode = scanCode;
            records[1].KeyEvent.UnicodeChar = ch;
            records[1].KeyEvent.dwControlKeyState = 0;

            uint written;
            return WriteConsoleInput(hInput, records, 2, out written);
        } finally {
            FreeConsole();
        }
    }

    public static bool SendTextToConsole(IntPtr hwnd, string text) {
        uint pid;
        GetWindowThreadProcessId(hwnd, out pid);
        if (pid == 0) return false;

        FreeConsole();
        if (!AttachConsole(pid)) return false;

        try {
            IntPtr hInput = GetStdHandle(STD_INPUT_HANDLE);
            if (hInput == IntPtr.Zero || hInput == (IntPtr)(-1)) return false;

            INPUT_RECORD[] records = new INPUT_RECORD[text.Length * 2];
            for (int i = 0; i < text.Length; i++) {
                char c = text[i];
                ushort vk = 0;
                ushort sc = 0;

                // Key down
                records[i * 2].EventType = 1;
                records[i * 2].KeyEvent.bKeyDown = true;
                records[i * 2].KeyEvent.wRepeatCount = 1;
                records[i * 2].KeyEvent.wVirtualKeyCode = vk;
                records[i * 2].KeyEvent.wVirtualScanCode = sc;
                records[i * 2].KeyEvent.UnicodeChar = c;
                records[i * 2].KeyEvent.dwControlKeyState = 0;

                // Key up
                records[i * 2 + 1].EventType = 1;
                records[i * 2 + 1].KeyEvent.bKeyDown = false;
                records[i * 2 + 1].KeyEvent.wRepeatCount = 1;
                records[i * 2 + 1].KeyEvent.wVirtualKeyCode = vk;
                records[i * 2 + 1].KeyEvent.wVirtualScanCode = sc;
                records[i * 2 + 1].KeyEvent.UnicodeChar = c;
                records[i * 2 + 1].KeyEvent.dwControlKeyState = 0;
            }

            uint written;
            return WriteConsoleInput(hInput, records, (uint)records.Length, out written);
        } finally {
            FreeConsole();
        }
    }
}
'@
`})),G=n({bindFile:()=>br,bindWindow:()=>yr,getBoundAppType:()=>vr,getBoundHwnd:()=>_r,platform:()=>Pr,unbindWindow:()=>xr});function hr(){if(!wr)try{wr=(Qn(),e(Kn))}catch{}return wr}function gr(e,t={}){try{let n=hr();return n?n.callSync(e,t):null}catch{return null}}function _r(){return q}function vr(){return Er}function yr(e,t){e=b(e),q&&(mn(q),bn(),Pn()),q=e,Er=`generic`,Dr=null,x(`
Add-Type @'
using System;
using System.Runtime.InteropServices;
public class CuActivate {
    [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
    [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr h);
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int cmd);
}
'@
$prev = [CuActivate]::GetForegroundWindow()
$target = [IntPtr]::new([long]${e})
if ([CuActivate]::IsIconic($target)) { [CuActivate]::ShowWindow($target, 9) | Out-Null }
[CuActivate]::SetForegroundWindow($target) | Out-Null
Start-Sleep -Milliseconds 100
if ($prev -ne [IntPtr]::Zero -and $prev -ne $target) {
    [CuActivate]::SetForegroundWindow($prev) | Out-Null
}
`),pn(e),vn(e),Mn(e)}function br(e,t){q=null,Er=t,Dr=e}function xr(){q&&mn(q),bn(),Pn(),K().clearEditChildCache(),q=null,Er=null,Dr=null}function K(){return Or??(Or=(W(),e(B)))}function Sr(e){let t=jt(),n=e.toLowerCase();for(let e of t)if((e.title??``).toLowerCase().includes(n))return{hwnd:e.hwnd,pid:e.pid};return null}function Cr(){bn(),Pn();try{hr()?.stopBridge()}catch{}}var wr,Tr,q,Er,Dr,Or,kr,Ar,jr,Mr,J,Nr,Pr,Y=t((()=>{w(),fn(),hn(),kn(),Gn(),C(),Tr=`
Add-Type -Language CSharp @'
using System;
using System.Runtime.InteropServices;
using System.Text;
using System.Diagnostics;

public class CuWin32 {
    // --- Cursor ---
    [DllImport("user32.dll")] public static extern bool SetCursorPos(int X, int Y);
    [DllImport("user32.dll")] public static extern bool GetCursorPos(out POINT p);
    [StructLayout(LayoutKind.Sequential)] public struct POINT { public int X; public int Y; }

    // --- SendInput ---
    [StructLayout(LayoutKind.Sequential)] public struct MOUSEINPUT {
        public int dx; public int dy; public int mouseData; public uint dwFlags; public uint time; public IntPtr dwExtraInfo;
    }
    [StructLayout(LayoutKind.Explicit)] public struct INPUT {
        [FieldOffset(0)] public uint type;
        [FieldOffset(4)] public MOUSEINPUT mi;
    }
    [StructLayout(LayoutKind.Sequential)] public struct KEYBDINPUT {
        public ushort wVk; public ushort wScan; public uint dwFlags; public uint time; public IntPtr dwExtraInfo;
    }
    [StructLayout(LayoutKind.Explicit)] public struct KINPUT {
        [FieldOffset(0)] public uint type;
        [FieldOffset(4)] public KEYBDINPUT ki;
    }
    [DllImport("user32.dll", SetLastError=true)] public static extern uint SendInput(uint n, INPUT[] i, int cb);
    [DllImport("user32.dll", SetLastError=true)] public static extern uint SendInput(uint n, KINPUT[] i, int cb);

    // --- Keyboard ---
    [DllImport("user32.dll")] public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);
    [DllImport("user32.dll")] public static extern short VkKeyScan(char ch);

    // --- Window ---
    [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint pid);
    [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr hWnd, StringBuilder sb, int max);

    // Constants
    public const uint INPUT_MOUSE = 0, INPUT_KEYBOARD = 1;
    public const uint MOUSEEVENTF_LEFTDOWN = 0x0002, MOUSEEVENTF_LEFTUP = 0x0004;
    public const uint MOUSEEVENTF_RIGHTDOWN = 0x0008, MOUSEEVENTF_RIGHTUP = 0x0010;
    public const uint MOUSEEVENTF_MIDDLEDOWN = 0x0020, MOUSEEVENTF_MIDDLEUP = 0x0040;
    public const uint MOUSEEVENTF_WHEEL = 0x0800, MOUSEEVENTF_HWHEEL = 0x1000;
    public const uint KEYEVENTF_KEYUP = 0x0002;
}
'@
`,q=null,Er=null,Dr=null,kr={async moveMouse(e,t){if(q){yn(Math.round(e),Math.round(t));return}x(`${Tr}; [CuWin32]::SetCursorPos(${Math.round(e)}, ${Math.round(t)}) | Out-Null`)},async click(e,t,n){if(q){yn(Math.round(e),Math.round(t),!0);let r=K().findEditChild(q)??q;K().sendClick(r,Math.round(e),Math.round(t),n)||K().sendClick(q,Math.round(e),Math.round(t),n);return}x(`${Tr}; [CuWin32]::SetCursorPos(${Math.round(e)}, ${Math.round(t)}) | Out-Null; $i = New-Object CuWin32+INPUT; $i.type=[CuWin32]::INPUT_MOUSE; $i.mi.dwFlags=[CuWin32]::${n===`left`?`MOUSEEVENTF_LEFTDOWN`:n===`right`?`MOUSEEVENTF_RIGHTDOWN`:`MOUSEEVENTF_MIDDLEDOWN`}; [CuWin32]::SendInput(1, @($i), [Runtime.InteropServices.Marshal]::SizeOf($i)) | Out-Null; $i.mi.dwFlags=[CuWin32]::${n===`left`?`MOUSEEVENTF_LEFTUP`:n===`right`?`MOUSEEVENTF_RIGHTUP`:`MOUSEEVENTF_MIDDLEUP`}; [CuWin32]::SendInput(1, @($i), [Runtime.InteropServices.Marshal]::SizeOf($i)) | Out-Null`)},async typeText(t){if(Er===`word`&&Dr){let{appendText:n}=(an(),e(Gt));n(Dr,t);return}if(q){if(!K().sendText(q,t))throw Error(`typeText failed: SendMessage to HWND ${q} returned false. The edit control may not have been found (findEditChild returned null).`);return}throw Error(`typeText requires a bound window or file. Call open() first.`)},async key(e,t){if(q){let n=xt[e.toLowerCase()]??(e.length===1?e.charCodeAt(0):0);n&&K().sendKey(q,n,t===`release`?`up`:`down`);return}throw Error(`key requires a bound window HWND. Call open() first.`)},async keys(e){if(q){if(!K().sendKeys(q,e))throw Error(`keys [${e.join(`+`)}] failed on HWND ${q}`);return}throw Error(`keys requires a bound window HWND. Call open() first.`)},async scroll(e,t){if(q){let n=t===`vertical`?`0x0115`:`0x0114`,r=e>0?`1`:`0`,i=Math.abs(Math.round(e)),a=`
Add-Type @'
using System;
using System.Runtime.InteropServices;
public class WScroll {
    [DllImport("user32.dll", CharSet=CharSet.Unicode, EntryPoint="SendMessageW")]
    public static extern IntPtr SendMessage(IntPtr h, uint m, IntPtr w, IntPtr l);
}
'@
`;for(let e=0;e<i;e++)a+=`[WScroll]::SendMessage([IntPtr]::new([long]${q}), ${n}, [IntPtr]${r}, [IntPtr]::Zero) | Out-Null; `;x(a);return}x(`${Tr}; $i = New-Object CuWin32+INPUT; $i.type=[CuWin32]::INPUT_MOUSE; $i.mi.dwFlags=[CuWin32]::${t===`vertical`?`MOUSEEVENTF_WHEEL`:`MOUSEEVENTF_HWHEEL`}; $i.mi.mouseData=${e*120}; [CuWin32]::SendInput(1, @($i), [Runtime.InteropServices.Marshal]::SizeOf($i)) | Out-Null`)},async mouseLocation(){let[e,t]=x(`${Tr}; $p = New-Object CuWin32+POINT; [CuWin32]::GetCursorPos([ref]$p) | Out-Null; "$($p.X),$($p.Y)"`).split(`,`);return{x:Number(e),y:Number(t)}},async sendChar(e,t){K().sendChar(String(e),t)},async sendKey(e,t,n){K().sendKey(String(e),t,n)},async sendClick(e,t,n,r){K().sendClick(String(e),t,n,r)},async sendText(e,t){K().sendText(String(e),t)}},Ar={async captureScreen(e){if(q){let e=await this.captureWindow?.(String(q));if(e)return e}let t=gr(`screenshot`,{display_id:e??0});if(t&&t.base64)return t;throw Error(`[computer-use] Screenshot failed: Python bridge returned no data. Ensure python3 + mss + Pillow are installed (pip install mss Pillow).`)},async captureRegion(e,t,n,r){if(q){let e=await this.captureWindow?.(String(q));if(e)return e}return this.captureScreen()},async captureWindow(e){let t=gr(`screenshot_window`,{hwnd:String(e)});if(t&&t.base64)return t;throw Error(`[computer-use] Window screenshot failed for HWND ${e}: Python bridge returned no data.`)}},jr={listAll(){try{return x(`
Add-Type -AssemblyName System.Windows.Forms
$result = @()
$idx = 0
foreach ($s in [System.Windows.Forms.Screen]::AllScreens) {
  $result += "$($s.Bounds.Width),$($s.Bounds.Height),$idx,$($s.Primary)"
  $idx++
}
$result -join "|"
`).split(`|`).filter(Boolean).map(e=>{let[t,n,r]=e.split(`,`);return{width:Number(t),height:Number(n),scaleFactor:1,displayId:Number(r)}})}catch{return[{width:1920,height:1080,scaleFactor:1,displayId:0}]}},getSize(e){let t=this.listAll();if(e!==void 0){let n=t.find(t=>t.displayId===e);if(n)return n}return t[0]??{width:1920,height:1080,scaleFactor:1,displayId:0}}},Mr={listRunning(){return jt().map(e=>({id:String(e.hwnd),pid:e.pid,title:e.title}))},async listInstalled(){try{return(await yt(`
$apps = @()

# Traditional Win32 apps from registry
$paths = @(
  'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*',
  'HKLM:\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*',
  'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*'
)
foreach ($p in $paths) {
  Get-ItemProperty $p -ErrorAction SilentlyContinue | Where-Object { $_.DisplayName } | ForEach-Object {
    $apps += "$($_.DisplayName)|$($_.InstallLocation)|$($_.PSChildName)"
  }
}

# UWP/MSIX apps (Windows 10/11 Store apps)
Get-AppxPackage -ErrorAction SilentlyContinue | Where-Object { $_.IsFramework -eq $false -and $_.SignatureKind -eq 'Store' } | ForEach-Object {
  $cleanName = $_.Name -replace '^Microsoft\\.Windows', '' -replace '^Microsoft\\.', ''
  $apps += "$cleanName|$($_.InstallLocation)|$($_.PackageFamilyName)"
}

$apps | Select-Object -Unique | Select-Object -First 300
`)).split(`
`).filter(Boolean).map(e=>{let[t,n,r]=e.trim().split(`|`,3);return{id:(r??t??``).trim(),displayName:(t??``).trim(),path:(n??``).trim()}})}catch{return[]}},async open(e){let t=on(e);if(t===`excel`||t===`word`){let t=await sn(e);t.filePath&&br(t.filePath,t.type);return}let n=e;if(e.includes(`_`)&&e.includes(`.`)){let t=e.split(`_`)[0]?.split(`.`)??[],r=t[t.length-1]??e;n=r.replace(/^Windows/,``)||r}let r=Sr(n);if(r){yr(r.hwnd,r.pid);return}let i=n.replace(/'/g,`''`),a=await yt(`
${Tr}
Add-Type @'
using System;
using System.Runtime.InteropServices;
using System.Text;
public class CuLaunch {
    public delegate bool EnumProc(IntPtr h, IntPtr lp);
    [DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc cb, IntPtr lp);
    [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
    [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
    [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr h, StringBuilder sb, int n);
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int cmd);
    public const int SW_SHOWMINNOACTIVE = 7;
    // Get all visible window HWNDs as array
    public static long[] GetAllVisibleHwnds() {
        var list = new System.Collections.Generic.List<long>();
        EnumWindows((h, _) => {
            if (IsWindowVisible(h)) list.Add(h.ToInt64());
            return true;
        }, IntPtr.Zero);
        return list.ToArray();
    }
    // Get PID for a single HWND
    public static uint GetPidForHwnd(long hwnd) {
        uint pid; GetWindowThreadProcessId((IntPtr)hwnd, out pid);
        return pid;
    }
    // Get title for a single HWND
    public static string GetTitle(long hwnd) {
        var sb = new StringBuilder(256);
        GetWindowText((IntPtr)hwnd, sb, 256);
        return sb.ToString();
    }
}
'@
# Launch strategy: all exe-based, no GUI dialogs.
# 1) exact path  2) exe in PATH  3) registry install dir  4) raw name
$target = '${i}'
$proc = $null

# 1. Exact file path
if (Test-Path $target) {
    $proc = Start-Process $target -PassThru -ErrorAction SilentlyContinue
}

# 2. exe name in PATH (notepad.exe, code.exe, chrome.exe, etc.)
if (-not $proc) {
    # Try with .exe suffix if not already
    $tryExe = if ($target -notmatch '[.]exe$') { "$target.exe" } else { $target }
    $found = Get-Command $tryExe -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $found) { $found = Get-Command $target -ErrorAction SilentlyContinue | Select-Object -First 1 }
    if ($found) { $proc = Start-Process $found.Source -PassThru -ErrorAction SilentlyContinue }
}

# 3. Search registry for install location by display name → find .exe
if (-not $proc) {
    $regPaths = @('HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*','HKLM:\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*','HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*')
    foreach ($p in $regPaths) {
        $app = Get-ItemProperty $p -ErrorAction SilentlyContinue | Where-Object {
            $_.DisplayName -and $_.DisplayName -match [regex]::Escape($target)
        } | Select-Object -First 1
        if ($app) {
            # Try DisplayIcon (often the exe path), then InstallLocation
            $exePath = $null
            if ($app.DisplayIcon -and $app.DisplayIcon -match '[.]exe') {
                $exePath = ($app.DisplayIcon -split ',')[0].Trim('"')
            }
            if (-not $exePath -and $app.InstallLocation) {
                $exeFile = Get-ChildItem $app.InstallLocation -Filter '*.exe' -ErrorAction SilentlyContinue | Select-Object -First 1
                if ($exeFile) { $exePath = $exeFile.FullName }
            }
            if ($exePath -and (Test-Path $exePath)) {
                $proc = Start-Process $exePath -PassThru -ErrorAction SilentlyContinue
                break
            }
        }
    }
}

# 4. Last resort: direct Start-Process (Windows may resolve it)
if (-not $proc) { $proc = Start-Process -FilePath $target -PassThru -ErrorAction SilentlyContinue }

if (-not $proc) { Write-Host "LAUNCH_FAILED"; exit }

# Snapshot ALL visible window HWNDs before the new window appears
$beforeHwnds = [CuLaunch]::GetAllVisibleHwnds()

# Wait for a NEW window from our process PID
$hwnd = 0
for ($i = 0; $i -lt 50; $i++) {
    Start-Sleep -Milliseconds 200
    $afterHwnds = [CuLaunch]::GetAllVisibleHwnds()
    # Find new windows (in after but not in before)
    foreach ($h in $afterHwnds) {
        if ($beforeHwnds -contains $h) { continue }
        # New window found — check PID
        $wPid = [CuLaunch]::GetPidForHwnd($h)
        if ($wPid -eq [uint32]$proc.Id) {
            $hwnd = $h; break  # exact PID match
        }
    }
    if ($hwnd -ne 0) { break }
    # PID didn't match (process redirect) — accept new window matching title hint
    if ($i -gt 10) {
        $hint = '${i}'.Split('\\')[-1].Replace('.exe','')
        foreach ($h in $afterHwnds) {
            if ($beforeHwnds -contains $h) { continue }
            $title = [CuLaunch]::GetTitle($h)
            if ($title -and $title.IndexOf($hint, [StringComparison]::OrdinalIgnoreCase) -ge 0) {
                $hwnd = $h; break
            }
        }
        if ($hwnd -ne 0) { break }
    }
}
if ($hwnd -eq 0) { Write-Host "HWND_NOT_FOUND|$($proc.Id)"; exit }
# Move offscreen instead of minimizing — keeps window restored so
# PrintWindow and SendMessage work without needing restore/re-minimize.
# User cannot see the window at -32000,-32000.
Add-Type @'
using System;
using System.Runtime.InteropServices;
public class CuPos {
    [DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr h, IntPtr a, int x, int y, int w, int h2, uint f);
    public const uint SWP_NOSIZE = 0x0001;
    public const uint SWP_NOZORDER = 0x0004;
    public const uint SWP_NOACTIVATE = 0x0010;
}
'@
[CuPos]::SetWindowPos([IntPtr]::new([long]$hwnd), [IntPtr]::Zero, -32000, -32000, 0, 0, [CuPos]::SWP_NOSIZE -bor [CuPos]::SWP_NOZORDER -bor [CuPos]::SWP_NOACTIVATE) | Out-Null
Write-Host "$hwnd|$($proc.Id)"
`);if(!a)throw Error(`open(): failed to launch '${e}' — no output from launcher script`);if(a.startsWith(`LAUNCH_FAILED`))throw Error(`open(): failed to launch '${e}' — process did not start (${a})`);if(a.startsWith(`HWND_NOT_FOUND`))throw Error(`open(): launched '${e}' but could not find its window HWND (${a})`);let o=a.trim().split(`|`),s=o[0].trim(),c=Number(o[1]);s&&s!==`0`&&yr(s,c)},getFrontmostApp(){try{let e=x(`${Tr}
$hwnd = [CuWin32]::GetForegroundWindow()
$procId = [uint32]0
[CuWin32]::GetWindowThreadProcessId($hwnd, [ref]$procId) | Out-Null
$proc = Get-Process -Id $procId -ErrorAction SilentlyContinue
"$($proc.MainModule.FileName)|$($proc.ProcessName)"`);if(!e||!e.includes(`|`))return null;let[t,n]=e.split(`|`,2);return{id:t,appName:n}}catch{return null}},findWindowByTitle(e){let t=jt().find(t=>t.title.includes(e));return t?{id:String(t.hwnd),pid:t.pid,title:t.title}:null}},J=`
Add-Type @'
using System;
using System.Runtime.InteropServices;

public class CuWinMgmt {
    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

    [DllImport("user32.dll")]
    public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hAfter, int X, int Y, int cx, int cy, uint uFlags);

    [DllImport("user32.dll")]
    public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);

    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern bool BringWindowToTop(IntPtr hWnd);

    [DllImport("user32.dll", CharSet=CharSet.Unicode, EntryPoint="SendMessageW")]
    public static extern IntPtr SendMessage(IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam);

    [DllImport("user32.dll")]
    public static extern bool IsIconic(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern bool IsZoomed(IntPtr hWnd);

    [StructLayout(LayoutKind.Sequential)]
    public struct RECT {
        public int Left; public int Top; public int Right; public int Bottom;
    }

    // ShowWindow constants
    public const int SW_MINIMIZE = 6;
    public const int SW_MAXIMIZE = 3;
    public const int SW_RESTORE = 9;
    public const int SW_SHOWNOACTIVATE = 4;
    public const int SW_SHOWMINNOACTIVE = 7;

    // SetWindowPos flags
    public const uint SWP_NOSIZE = 0x0001;
    public const uint SWP_NOMOVE = 0x0002;
    public const uint SWP_NOZORDER = 0x0004;
    public const uint SWP_NOACTIVATE = 0x0010;
    public const uint SWP_SHOWWINDOW = 0x0040;

    // WM_CLOSE
    public const uint WM_CLOSE = 0x0010;
    // WM_SYSCOMMAND
    public const uint WM_SYSCOMMAND = 0x0112;
    public const int SC_MINIMIZE = 0xF020;
    public const int SC_MAXIMIZE = 0xF030;
    public const int SC_RESTORE = 0xF120;
    public const int SC_CLOSE = 0xF060;
}
'@
`,Nr={manageWindow(e,t){if(!q)return!1;let n=q;switch(e){case`minimize`:return x(`${J}; [CuWinMgmt]::ShowWindow([IntPtr]::new([long]${n}), [CuWinMgmt]::SW_SHOWMINNOACTIVE)`)!==``;case`maximize`:return x(`${J}; [CuWinMgmt]::ShowWindow([IntPtr]::new([long]${n}), [CuWinMgmt]::SW_MAXIMIZE)`)!==``;case`restore`:return x(`${J}; [CuWinMgmt]::ShowWindow([IntPtr]::new([long]${n}), [CuWinMgmt]::SW_RESTORE)`)!==``;case`close`:return mn(n),x(`${J}; [CuWinMgmt]::SendMessage([IntPtr]::new([long]${n}), [CuWinMgmt]::WM_CLOSE, [IntPtr]::Zero, [IntPtr]::Zero)`),xr(),!0;case`focus`:return x(`${J}
$h = [IntPtr]::new([long]${n})
if ([CuWinMgmt]::IsIconic($h)) {
    [CuWinMgmt]::ShowWindow($h, [CuWinMgmt]::SW_RESTORE) | Out-Null
}
[CuWinMgmt]::SetForegroundWindow($h) | Out-Null
[CuWinMgmt]::BringWindowToTop($h) | Out-Null
`),!0;case`move_offscreen`:return x(`${J}; [CuWinMgmt]::SetWindowPos([IntPtr]::new([long]${n}), [IntPtr]::Zero, -32000, -32000, 0, 0, [CuWinMgmt]::SWP_NOSIZE -bor [CuWinMgmt]::SWP_NOZORDER -bor [CuWinMgmt]::SWP_NOACTIVATE)`),!0;case`move_resize`:return t?.x!==void 0&&t?.y!==void 0&&this.moveResize(t.x,t.y,t.width,t.height),!0;case`get_rect`:return!0;default:return!1}},moveResize(e,t,n,r){if(!q)return!1;let i=q;return x(n!==void 0&&r!==void 0?`${J}; [CuWinMgmt]::SetWindowPos([IntPtr]::new([long]${i}), [IntPtr]::Zero, ${e}, ${t}, ${n}, ${r}, [CuWinMgmt]::SWP_NOZORDER -bor [CuWinMgmt]::SWP_NOACTIVATE)`:`${J}; [CuWinMgmt]::SetWindowPos([IntPtr]::new([long]${i}), [IntPtr]::Zero, ${e}, ${t}, 0, 0, [CuWinMgmt]::SWP_NOSIZE -bor [CuWinMgmt]::SWP_NOZORDER -bor [CuWinMgmt]::SWP_NOACTIVATE)`),!0},getWindowRect(){if(!q)return null;let e=x(`${J}
$rect = New-Object CuWinMgmt+RECT
if ([CuWinMgmt]::GetWindowRect([IntPtr]::new([long]${q}), [ref]$rect)) {
    "$($rect.Left),$($rect.Top),$($rect.Right),$($rect.Bottom)"
} else { "FAIL" }
`);if(!e||e===`FAIL`)return null;let[t,n,r,i]=e.split(`,`).map(Number);return{x:t,y:n,width:r-t,height:i-n}}},process.on(`exit`,Cr),process.on(`SIGINT`,()=>{Cr(),process.exit()}),process.on(`SIGTERM`,()=>{Cr(),process.exit()}),Pr={input:kr,screenshot:Ar,display:jr,apps:Mr,windowManagement:Nr}})),Fr=n({platform:()=>Yr});function X(e){let t=Bun.spawnSync({cmd:e,stdout:`pipe`,stderr:`pipe`});return new TextDecoder().decode(t.stdout).trim()}async function Ir(e){let t=Bun.spawn(e,{stdout:`pipe`,stderr:`pipe`}),n=await new Response(t.stdout).text();return await t.exited,n.trim()}function Lr(e){return Bun.spawnSync({cmd:[`which`,e],stdout:`pipe`,stderr:`pipe`}).exitCode===0}function Rr(e){return Vr[e.toLowerCase()]??e}function zr(e){return e===`left`?`1`:e===`right`?`3`:`2`}async function Br(e,t,n){if(Lr(`convert`)){await Ir([`convert`,e,`-quality`,`75`,Gr]);let r=await Bun.file(Gr).arrayBuffer();return{base64:Buffer.from(r).toString(`base64`),width:t,height:n}}if(Lr(`ffmpeg`)){await Ir([`ffmpeg`,`-y`,`-i`,e,`-q:v`,`5`,Gr]);let r=await Bun.file(Gr).arrayBuffer();return{base64:Buffer.from(r).toString(`base64`),width:t,height:n}}let r=await Bun.file(e).arrayBuffer();return{base64:Buffer.from(r).toString(`base64`),width:t,height:n}}var Vr,Hr,Ur,Wr,Gr,Kr,qr,Jr,Yr,Xr=t((()=>{Vr={return:`Return`,enter:`Return`,tab:`Tab`,space:`space`,backspace:`BackSpace`,delete:`Delete`,escape:`Escape`,esc:`Escape`,left:`Left`,up:`Up`,right:`Right`,down:`Down`,home:`Home`,end:`End`,pageup:`Prior`,pagedown:`Next`,f1:`F1`,f2:`F2`,f3:`F3`,f4:`F4`,f5:`F5`,f6:`F6`,f7:`F7`,f8:`F8`,f9:`F9`,f10:`F10`,f11:`F11`,f12:`F12`,shift:`shift`,lshift:`shift`,rshift:`shift`,control:`ctrl`,ctrl:`ctrl`,lcontrol:`ctrl`,rcontrol:`ctrl`,alt:`alt`,option:`alt`,lalt:`alt`,ralt:`alt`,win:`super`,meta:`super`,command:`super`,cmd:`super`,super:`super`,insert:`Insert`,printscreen:`Print`,pause:`Pause`,numlock:`Num_Lock`,capslock:`Caps_Lock`,scrolllock:`Scroll_Lock`},Hr=new Set([`shift`,`lshift`,`rshift`,`control`,`ctrl`,`lcontrol`,`rcontrol`,`alt`,`option`,`lalt`,`ralt`,`win`,`meta`,`command`,`cmd`,`super`]),Ur={async moveMouse(e,t){X([`xdotool`,`mousemove`,`--sync`,String(Math.round(e)),String(Math.round(t))])},async click(e,t,n){X([`xdotool`,`mousemove`,`--sync`,String(Math.round(e)),String(Math.round(t))]),X([`xdotool`,`click`,zr(n)])},async typeText(e){X([`xdotool`,`type`,`--delay`,`12`,e])},async key(e,t){let n=Rr(e);X(t===`press`?[`xdotool`,`keydown`,n]:[`xdotool`,`keyup`,n])},async keys(e){let t=[],n=null;for(let r of e)Hr.has(r.toLowerCase())?t.push(Rr(r)):n=r;n&&X([`xdotool`,`key`,[...t,Rr(n)].join(`+`)])},async scroll(e,t){if(t===`vertical`){let t=e>=0?`5`:`4`,n=Math.abs(Math.round(e));n>0&&X([`xdotool`,`click`,`--repeat`,String(n),t])}else{let t=e>=0?`7`:`6`,n=Math.abs(Math.round(e));n>0&&X([`xdotool`,`click`,`--repeat`,String(n),t])}},async mouseLocation(){let e=X([`xdotool`,`getmouselocation`]),t=e.match(/x:(\d+)/),n=e.match(/y:(\d+)/);return{x:t?Number(t[1]):0,y:n?Number(n[1]):0}}},Wr=`/tmp/cu-screenshot-tmp.png`,Gr=`/tmp/cu-screenshot.jpg`,Kr={async captureScreen(e){try{await Ir([`scrot`,`-o`,Wr]);let t=qr.getSize(e);return Br(Wr,t.width,t.height)}catch{return{base64:``,width:0,height:0}}},async captureRegion(e,t,n,r){try{return await Ir([`scrot`,`-a`,`${e},${t},${n},${r}`,`-o`,Wr]),Br(Wr,n,r)}catch{return{base64:``,width:n,height:r}}},async captureWindow(e){try{if(Lr(`import`)){let t=`/tmp/cu-window-capture.jpg`;await Ir([`import`,`-window`,e,`-quality`,`75`,t]);let n=X([`xdotool`,`getwindowgeometry`,`--shell`,e]),r=n.match(/WIDTH=(\d+)/),i=n.match(/HEIGHT=(\d+)/),a=r?Number(r[1]):0,o=i?Number(i[1]):0,s=await Bun.file(t).arrayBuffer();return{base64:Buffer.from(s).toString(`base64`),width:a,height:o}}return null}catch{return null}}},qr={listAll(){try{let e=X([`xrandr`,`--query`]),t=[],n=0,r=/^\S+\s+connected\s+(?:primary\s+)?(\d+)x(\d+)\+\d+\+\d+/gm,i;for(;(i=r.exec(e))!==null;)t.push({width:Number(i[1]),height:Number(i[2]),scaleFactor:1,displayId:n++});return t.length===0?[{width:1920,height:1080,scaleFactor:1,displayId:0}]:t}catch{return[{width:1920,height:1080,scaleFactor:1,displayId:0}]}},getSize(e){let t=this.listAll();if(e!==void 0){let n=t.find(t=>t.displayId===e);if(n)return n}return t[0]??{width:1920,height:1080,scaleFactor:1,displayId:0}}},Jr={listRunning(){try{if(Lr(`wmctrl`)){let e=X([`wmctrl`,`-l`,`-p`]),t=[];for(let n of e.split(`
`).filter(Boolean)){let e=n.split(/\s+/),r=e[0],i=Number(e[2]);if(!i)continue;let a=e.slice(4).join(` `),o=``;try{o=X([`readlink`,`-f`,`/proc/${i}/exe`])}catch{}t.push({id:r??``,pid:i,title:a,exePath:o||void 0})}let n=new Set;return t.filter(e=>n.has(e.id)?!1:(n.add(e.id),!0)).slice(0,50)}let e=X([`xdotool`,`search`,`--name`,``]),t=[];for(let n of e.split(`
`).filter(Boolean).slice(0,50)){let e=X([`xdotool`,`getwindowname`,n]),r=0;try{r=Number(X([`xdotool`,`getwindowpid`,n]))}catch{}e&&t.push({id:n,pid:r,title:e})}return t}catch{return[]}},async listInstalled(){try{let e=[`/usr/share/applications`,`/usr/local/share/applications`,`${process.env.HOME}/.local/share/applications`],t=[];for(let n of e){let e;try{e=X([`find`,n,`-name`,`*.desktop`,`-maxdepth`,`1`])}catch{continue}for(let n of e.split(`
`).filter(Boolean))try{let e=X([`cat`,n]),r=e.match(/^Name=(.+)$/m),i=e.match(/^Exec=(.+)$/m);if(e.match(/^NoDisplay=true$/m))continue;let a=r?.[1]??``,o=i?.[1]??``;if(!a)continue;t.push({id:n.split(`/`).pop()?.replace(`.desktop`,``)??``,displayName:a,path:o.split(/\s+/)[0]??``})}catch{}}return t.slice(0,200)}catch{return[]}},async open(e){try{let t=e.endsWith(`.desktop`)?e:`${e}.desktop`;if(Lr(`gtk-launch`)){await Ir([`gtk-launch`,t]);return}}catch{}await Ir([`xdg-open`,e])},getFrontmostApp(){try{let e=X([`xdotool`,`getactivewindow`]);if(!e)return null;let t=X([`xdotool`,`getwindowpid`,e]);if(!t)return null;let n=``;try{n=X([`readlink`,`-f`,`/proc/${t}/exe`])}catch{}let r=``;try{r=X([`cat`,`/proc/${t}/comm`])}catch{}return!n&&!r?null:{id:n||`/proc/${t}/exe`,appName:r||`unknown`}}catch{return null}},findWindowByTitle(e){try{let t=X([`xdotool`,`search`,`--name`,e]).split(`
`)[0];if(!t)return null;let n=X([`xdotool`,`getwindowname`,t]),r=0;try{r=Number(X([`xdotool`,`getwindowpid`,t]))}catch{}return{id:t,pid:r,title:n}}catch{return null}}},Yr={input:Ur,screenshot:Kr,display:qr,apps:Jr}}));function Zr(){if(Qr)return Qr;switch(process.platform){case`darwin`:Qr=(kt(),e(Ct)).platform;break;case`win32`:Qr=(Y(),e(G)).platform;break;case`linux`:Qr=(Xr(),e(Fr)).platform;break;default:throw Error(`Computer Use not supported on ${process.platform}`)}return Qr}var Qr,$r=t((()=>{})),ei=n({captureAccessibilitySnapshot:()=>ti,findNodeInSnapshot:()=>ai});function ti(e,t=4,n=!0){e=b(e);let r=`
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
Add-Type -AssemblyName WindowsBase
${n?`
    # Interactive control types only
    $interactiveTypes = @(
      'Button','Edit','ComboBox','CheckBox','RadioButton',
      'MenuItem','Menu','MenuBar','Link','Slider','Spinner',
      'Tab','TabItem','List','ListItem','Tree','TreeItem',
      'DataGrid','DataItem','Document','ScrollBar','ToolBar',
      'SplitButton','ToggleButton','Hyperlink'
    )
    function Is-Interactive($ct) {
      $typeName = $ct -replace 'ControlType\\.', ''
      return $interactiveTypes -contains $typeName
    }`:`
    function Is-Interactive($ct) { return $true }`}

function Get-Tree($el, $depth, $maxDepth) {
    if ($depth -ge $maxDepth) { return @() }
    $result = @()
    $children = $el.FindAll(
        [System.Windows.Automation.TreeScope]::Children,
        [System.Windows.Automation.Condition]::TrueCondition)
    foreach ($child in $children) {
        $ct = $child.Current.ControlType.ProgrammaticName
        $typeName = $ct -replace 'ControlType\\.', ''
        $name = [string]$child.Current.Name
        $autoId = [string]$child.Current.AutomationId
        $rect = $child.Current.BoundingRectangle
        $enabled = $child.Current.IsEnabled

        # Skip invisible/offscreen elements
        if ($rect.Width -le 0 -or $rect.Height -le 0) { continue }
        if ($rect.X -lt -10000) { continue }

        $val = $null
        try {
            $vp = $child.GetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern)
            if ($vp -ne $null) { $val = $vp.Current.Value }
        } catch {}

        $isInteractive = Is-Interactive $ct
        $sub = Get-Tree $child ($depth + 1) $maxDepth

        if ($isInteractive -or $sub.Count -gt 0) {
            $node = @{
                role = $typeName
                name = $name
                id = $autoId
                x = [int]$rect.X; y = [int]$rect.Y
                w = [int]$rect.Width; h = [int]$rect.Height
                on = $enabled
            }
            if ($val -ne $null -and $val -ne '') { $node['v'] = $val }
            if ($sub.Count -gt 0) { $node['c'] = $sub }
            $result += $node
        }
    }
    return $result
}

try {
    $root = [System.Windows.Automation.AutomationElement]::FromHandle([IntPtr]::new([long]${e}))
    if ($root -eq $null) { Write-Output '[]'; exit }
    $tree = Get-Tree $root 0 ${t}
    if ($tree -eq $null -or $tree.Count -eq 0) {
        Write-Output '[]'
    } else {
        $tree | ConvertTo-Json -Depth 20 -Compress
    }
} catch {
    Write-Output '[]'
}
`;try{let e=x(r);if(!e||e===`[]`)return null;let t=JSON.parse(e),n=Array.isArray(t)?t.map(ni):[ni(t)];return{text:ri(n),nodes:n,timestamp:Date.now()}}catch{return null}}function ni(e){return{role:e.role||``,name:e.name||``,automationId:e.id||``,bounds:{x:e.x||0,y:e.y||0,w:e.w||0,h:e.h||0},enabled:e.on!==!1,value:e.v,children:e.c?Array.isArray(e.c)?e.c.map(ni):[ni(e.c)]:void 0}}function ri(e,t=0){let n=[],r=`  `.repeat(t);for(let i of e){let e=`${r}[${i.role}]`;i.name&&(e+=` "${ii(i.name,40)}"`),e+=` (${i.bounds.x},${i.bounds.y} ${i.bounds.w}x${i.bounds.h})`,i.enabled||(e+=` DISABLED`),i.value&&(e+=` value="${ii(i.value,30)}"`),i.automationId&&(e+=` id=${i.automationId}`),n.push(e),i.children&&n.push(ri(i.children,t+1))}return n.join(`
`)}function ii(e,t){return e.length>t?e.slice(0,t-1)+`…`:e}function ai(e,t){for(let n of e){let e=!0;if(t.name&&!n.name.toLowerCase().includes(t.name.toLowerCase())&&(e=!1),t.role&&n.role.toLowerCase()!==t.role.toLowerCase()&&(e=!1),t.automationId&&n.automationId!==t.automationId&&(e=!1),e&&(t.name||t.role||t.automationId))return n;if(n.children){let e=ai(n.children,t);if(e)return e}}return null}var oi=t((()=>{C()})),si=n({clickElement:()=>di,elementAtPoint:()=>pi,findElement:()=>ui,getUITree:()=>li,setValue:()=>fi});function ci(e,t){try{return e?JSON.parse(e):t}catch{return t}}function li(e,t=3){let n=ci(x(`
${hi}
$title = '${e.replace(/'/g,`''`)}'
${gi}
if ($window -eq $null) {
  Write-Output '[]'
  exit
}

function Get-UIChildren($parent, $currentDepth, $maxDepth) {
  if ($currentDepth -ge $maxDepth) { return @() }
  $children = $parent.FindAll(
    [System.Windows.Automation.TreeScope]::Children,
    [System.Windows.Automation.Condition]::TrueCondition)
  $result = @()
  foreach ($el in $children) {
    $rect = $el.Current.BoundingRectangle
    $obj = @{
      name = [string]$el.Current.Name
      controlType = $el.Current.ControlType.ProgrammaticName -replace 'ControlType\\.', ''
      automationId = [string]$el.Current.AutomationId
      boundingRect = @{
        x = [int]$rect.X
        y = [int]$rect.Y
        w = [int]$rect.Width
        h = [int]$rect.Height
      }
      isEnabled = $el.Current.IsEnabled
    }
    try {
      $vp = $el.GetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern)
      if ($vp -ne $null) { $obj['value'] = $vp.Current.Value }
    } catch {}
    $sub = Get-UIChildren $el ($currentDepth + 1) $maxDepth
    if ($sub.Count -gt 0) { $obj['children'] = $sub }
    $result += $obj
  }
  return $result
}

$tree = Get-UIChildren $window 0 ${t}
if ($tree -eq $null -or $tree.Count -eq 0) {
  Write-Output '[]'
} else {
  $tree | ConvertTo-Json -Depth 20 -Compress
}
`),[]);return Array.isArray(n)?n:[n]}function ui(e,t){let n=e.replace(/'/g,`''`),r=[];if(t.name){let e=t.name.replace(/'/g,`''`);r.push(`[System.Windows.Automation.PropertyCondition]::new([System.Windows.Automation.AutomationElement]::NameProperty, '${e}')`)}if(t.controlType){if(!mi.has(t.controlType))return null;let e=t.controlType.replace(/'/g,`''`);r.push(`[System.Windows.Automation.PropertyCondition]::new([System.Windows.Automation.AutomationElement]::ControlTypeProperty, [System.Windows.Automation.ControlType]::${e})`)}if(t.automationId){let e=t.automationId.replace(/'/g,`''`);r.push(`[System.Windows.Automation.PropertyCondition]::new([System.Windows.Automation.AutomationElement]::AutomationIdProperty, '${e}')`)}if(r.length===0)return null;let i;return i=r.length===1?r[0]:`[System.Windows.Automation.AndCondition]::new(@(${r.join(`, `)}))`,ci(x(`
${hi}
$title = '${n}'
${gi}
if ($window -eq $null) {
  Write-Output 'null'
  exit
}
$cond = ${i}
$el = $window.FindFirst([System.Windows.Automation.TreeScope]::Descendants, $cond)
if ($el -eq $null) {
  Write-Output 'null'
  exit
}
$rect = $el.Current.BoundingRectangle
$obj = @{
  name = [string]$el.Current.Name
  controlType = $el.Current.ControlType.ProgrammaticName -replace 'ControlType\\.', ''
  automationId = [string]$el.Current.AutomationId
  boundingRect = @{
    x = [int]$rect.X
    y = [int]$rect.Y
    w = [int]$rect.Width
    h = [int]$rect.Height
  }
  isEnabled = $el.Current.IsEnabled
}
try {
  $vp = $el.GetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern)
  if ($vp -ne $null) { $obj['value'] = $vp.Current.Value }
} catch {}
$obj | ConvertTo-Json -Compress
`),null)}function di(e,t){return x(`
${hi}
$title = '${e.replace(/'/g,`''`)}'
${gi}
if ($window -eq $null) {
  Write-Output 'false'
  exit
}
$cond = [System.Windows.Automation.PropertyCondition]::new(
  [System.Windows.Automation.AutomationElement]::AutomationIdProperty, '${t.replace(/'/g,`''`)}')
$el = $window.FindFirst([System.Windows.Automation.TreeScope]::Descendants, $cond)
if ($el -eq $null) {
  Write-Output 'false'
  exit
}
try {
  $ip = $el.GetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern)
  $ip.Invoke()
  Write-Output 'true'
} catch {
  Write-Output 'false'
}
`)===`true`}function fi(e,t,n){return x(`
${hi}
$title = '${e.replace(/'/g,`''`)}'
${gi}
if ($window -eq $null) {
  Write-Output 'false'
  exit
}
$cond = [System.Windows.Automation.PropertyCondition]::new(
  [System.Windows.Automation.AutomationElement]::AutomationIdProperty, '${t.replace(/'/g,`''`)}')
$el = $window.FindFirst([System.Windows.Automation.TreeScope]::Descendants, $cond)
if ($el -eq $null) {
  Write-Output 'false'
  exit
}
try {
  $vp = $el.GetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern)
  $vp.SetValue('${n.replace(/'/g,`''`)}')
  Write-Output 'true'
} catch {
  Write-Output 'false'
}
`)===`true`}function pi(e,t){return ci(x(`
${hi}
try {
  $point = [System.Windows.Point]::new(${e}, ${t})
  $el = [System.Windows.Automation.AutomationElement]::FromPoint($point)
  if ($el -eq $null) {
    Write-Output 'null'
    exit
  }
  $rect = $el.Current.BoundingRectangle
  $obj = @{
    name = [string]$el.Current.Name
    controlType = $el.Current.ControlType.ProgrammaticName -replace 'ControlType\\.', ''
    automationId = [string]$el.Current.AutomationId
    boundingRect = @{
      x = [int]$rect.X
      y = [int]$rect.Y
      w = [int]$rect.Width
      h = [int]$rect.Height
    }
    isEnabled = $el.Current.IsEnabled
  }
  try {
    $vp = $el.GetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern)
    if ($vp -ne $null) { $obj['value'] = $vp.Current.Value }
  } catch {}
  $obj | ConvertTo-Json -Compress
} catch {
  Write-Output 'null'
}
`),null)}var mi,hi,gi,_i=t((()=>{C(),mi=new Set(`Button.Calendar.CheckBox.ComboBox.Custom.DataGrid.DataItem.Document.Edit.Group.Header.HeaderItem.Hyperlink.Image.List.ListItem.Menu.MenuBar.MenuItem.Pane.ProgressBar.RadioButton.ScrollBar.Separator.Slider.Spinner.SplitButton.StatusBar.Tab.TabItem.Table.Text.Thumb.TitleBar.ToolBar.ToolTip.Tree.TreeItem.Window`.split(`.`)),hi=`
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
Add-Type -AssemblyName WindowsBase
`,gi=`
$root = [System.Windows.Automation.AutomationElement]::RootElement
$window = $root.FindFirst(
  [System.Windows.Automation.TreeScope]::Children,
  [System.Windows.Automation.PropertyCondition]::new(
    [System.Windows.Automation.AutomationElement]::NameProperty, $title))
if ($window -eq $null) {
  $all = $root.FindAll(
    [System.Windows.Automation.TreeScope]::Children,
    [System.Windows.Automation.Condition]::TrueCondition)
  foreach ($el in $all) {
    if ($el.Current.Name -and $el.Current.Name.Contains($title)) {
      $window = $el
      break
    }
  }
}
`})),vi=n({createCrossPlatformExecutor:()=>wi,unhideComputerUseAppsCrossPlatform:()=>Ti});function yi(){if(process.platform!==`win32`)return null;try{let{getBoundHwnd:t}=(Y(),e(G));return t()}catch{return null}}function Z(){return yi()!==null}function bi(){if(process.platform!==`win32`)return{dx:0,dy:0};try{let{getBoundHwnd:t}=(Y(),e(G)),n=t();if(!n)return{dx:0,dy:0};b(n);let r=Bun.spawnSync({cmd:[`powershell`,`-NoProfile`,`-NonInteractive`,`-Command`,`
Add-Type @'
using System;
using System.Runtime.InteropServices;
public class NcCalc {
    [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
    [DllImport("user32.dll")] public static extern bool GetClientRect(IntPtr h, out RECT r);
    [DllImport("user32.dll")] public static extern bool ClientToScreen(IntPtr h, ref POINT p);
    [StructLayout(LayoutKind.Sequential)] public struct RECT { public int L, T, R, B; }
    [StructLayout(LayoutKind.Sequential)] public struct POINT { public int X, Y; }
}
'@
$h = [IntPtr]::new([long]${n})
$wr = New-Object NcCalc+RECT
$cr = New-Object NcCalc+RECT
[NcCalc]::GetWindowRect($h, [ref]$wr) | Out-Null
[NcCalc]::GetClientRect($h, [ref]$cr) | Out-Null
$pt = New-Object NcCalc+POINT
$pt.X = 0; $pt.Y = 0
[NcCalc]::ClientToScreen($h, [ref]$pt) | Out-Null
"$($pt.X - $wr.L),$($pt.Y - $wr.T)"
`],stdout:`pipe`,stderr:`pipe`}),[i,a]=new TextDecoder().decode(r.stdout).trim().split(`,`);return{dx:Number(i)||0,dy:Number(a)||0}}catch{return{dx:0,dy:0}}}function xi(){if(process.platform!==`win32`)return{dx:0,dy:0};try{let{getBoundHwnd:t}=(Y(),e(G)),n=t();return n?Q&&$===n?Q:(Q=bi(),$=n,Q):{dx:0,dy:0}}catch{return{dx:0,dy:0}}}function Si(){if(!(process.platform!==`win32`||!Z()))try{let{getBoundHwnd:t}=(Y(),e(G)),n=t();if(!n)return;let{captureAccessibilitySnapshot:r}=(oi(),e(ei)),i=r(n);return!i||!i.text?void 0:i.text}catch{return}}function Ci(e,t){if(Z()){let t=Si();return{base64:e.base64,width:e.width,height:e.height,displayWidth:e.width,displayHeight:e.height,originX:0,originY:0,accessibilityText:t}}return{base64:e.base64,width:e.width,height:e.height,displayWidth:t.width,displayHeight:t.height,originX:0,originY:0}}function wi(t){let n=Zr();return a(`[computer-use] cross-platform executor for ${process.platform}`),{capabilities:{...re,hostBundleId:te},async prepareForAction(){return[]},async previewHideSet(){return[]},async getDisplaySize(e){let t=n.display.getSize(e);return{...t,scaleFactor:t.scaleFactor??1,displayId:t.displayId??0,originX:0,originY:0}},async listDisplays(){return n.display.listAll().map(e=>({...e,originX:0,originY:0}))},async findWindowDisplays(e){return e.map(e=>({bundleId:e,displayIds:[0]}))},async resolvePrepareCapture(e){let t=n.display.getSize(e.preferredDisplayId);return{...Ci(await n.screenshot.captureScreen(e.preferredDisplayId),t),hidden:[],displayId:e.preferredDisplayId??t.displayId??0}},async screenshot(e){let t=n.display.getSize(e.displayId);return Ci(await n.screenshot.captureScreen(e.displayId),t)},async zoom(e,t,r){return n.screenshot.captureRegion(e.x,e.y,e.w,e.h)},async key(e,t){let r=e.split(`+`).filter(e=>e.length>0),i=t??1;for(let e=0;e<i;e++)e>0&&await l(8),await n.input.keys(r)},async holdKey(e,t){for(let t of e)await n.input.key(t,`press`);await l(t);for(let t of[...e].reverse())await n.input.key(t,`release`)},async type(e,t){await n.input.typeText(e)},async readClipboard(){if(process.platform===`win32`){let e=Bun.spawnSync({cmd:[`powershell`,`-NoProfile`,`-Command`,`Get-Clipboard`],stdout:`pipe`});return new TextDecoder().decode(e.stdout).trim()}let e=Bun.spawnSync({cmd:[`xclip`,`-selection`,`clipboard`,`-o`],stdout:`pipe`});return new TextDecoder().decode(e.stdout).trim()},async writeClipboard(e){if(process.platform===`win32`){let t=e.replace(/'/g,`''`);Bun.spawnSync({cmd:[`powershell`,`-NoProfile`,`-Command`,`Set-Clipboard -Value '${t}'`]});return}let t=Bun.spawn([`xclip`,`-selection`,`clipboard`],{stdin:`pipe`});t.stdin.write(e),t.stdin.end(),await t.exited},async moveMouse(e,t){await n.input.moveMouse(e,t)},async click(e,t,r,i,o){let s=Math.round(e),c=Math.round(t);if(Z()){let n=xi();s-=n.dx,c-=n.dy,a(`[computer-use] click(${Math.round(e)},${Math.round(t)}) → client(${s},${c}) [nc offset: ${n.dx},${n.dy}]`)}for(let e=0;e<i;e++)await n.input.click(s,c,r)},async mouseDown(){if(Z()&&process.platform===`win32`){let{getBoundHwnd:t}=(Y(),e(G)),r=t();if(r){let{sendMouseDown:t}=(W(),e(B)),i=await n.input.mouseLocation();t(r,i.x,i.y);return}}if(process.platform===`win32`){Bun.spawnSync({cmd:[`powershell`,`-NoProfile`,`-NonInteractive`,`-Command`,`Add-Type -Language CSharp @'
using System; using System.Runtime.InteropServices;
public class MDown { [StructLayout(LayoutKind.Sequential)] public struct MOUSEINPUT { public int dx; public int dy; public int mouseData; public uint dwFlags; public uint time; public IntPtr dwExtraInfo; }
[StructLayout(LayoutKind.Explicit)] public struct INPUT { [FieldOffset(0)] public uint type; [FieldOffset(4)] public MOUSEINPUT mi; }
[DllImport("user32.dll",SetLastError=true)] public static extern uint SendInput(uint n, INPUT[] i, int cb); }
'@
$i = New-Object MDown+INPUT; $i.type=0; $i.mi.dwFlags=0x0002; [MDown]::SendInput(1, @($i), [Runtime.InteropServices.Marshal]::SizeOf($i)) | Out-Null`]});return}},async mouseUp(){if(Z()&&process.platform===`win32`){let{getBoundHwnd:t}=(Y(),e(G)),r=t();if(r){let{sendMouseUp:t}=(W(),e(B)),i=await n.input.mouseLocation();t(r,i.x,i.y);return}}if(process.platform===`win32`){Bun.spawnSync({cmd:[`powershell`,`-NoProfile`,`-NonInteractive`,`-Command`,`Add-Type -Language CSharp @'
using System; using System.Runtime.InteropServices;
public class MUp { [StructLayout(LayoutKind.Sequential)] public struct MOUSEINPUT { public int dx; public int dy; public int mouseData; public uint dwFlags; public uint time; public IntPtr dwExtraInfo; }
[StructLayout(LayoutKind.Explicit)] public struct INPUT { [FieldOffset(0)] public uint type; [FieldOffset(4)] public MOUSEINPUT mi; }
[DllImport("user32.dll",SetLastError=true)] public static extern uint SendInput(uint n, INPUT[] i, int cb); }
'@
$i = New-Object MUp+INPUT; $i.type=0; $i.mi.dwFlags=0x0004; [MUp]::SendInput(1, @($i), [Runtime.InteropServices.Marshal]::SizeOf($i)) | Out-Null`]});return}},async getCursorPosition(){return n.input.mouseLocation()},async drag(t,r){if(Z()&&process.platform===`win32`){let{getBoundHwnd:n}=(Y(),e(G)),i=n();if(i){let{sendMouseDown:n,sendMouseMove:a,sendMouseUp:o}=(W(),e(B)),s=xi();t&&n(i,Math.round(t.x)-s.dx,Math.round(t.y)-s.dy),await l(50);let c=Math.round(r.x)-s.dx,u=Math.round(r.y)-s.dy;a(i,c,u),await l(16),o(i,c,u);return}}t&&(await n.input.moveMouse(t.x,t.y),await l(16)),await this.mouseDown(),await l(50),await n.input.moveMouse(r.x,r.y),await l(16),await this.mouseUp()},async scroll(e,t,r,i){i!==0&&await n.input.scroll(i,`vertical`),r!==0&&await n.input.scroll(r,`horizontal`)},async getFrontmostApp(){if(Z())return{bundleId:`cu-bound-window`,displayName:`Bound Window`};let e=n.apps.getFrontmostApp();return e?{bundleId:e.id,displayName:e.appName}:null},async appUnderPoint(e,t){return null},async listInstalledApps(){return(await n.apps.listInstalled()).map(e=>({bundleId:e.id,displayName:e.displayName,path:e.path}))},async getAppIcon(e){},async listRunningApps(){return n.apps.listRunning().map(e=>({bundleId:e.id,displayName:e.title}))},async openApp(e){await n.apps.open(e),Q=null,$=null},async manageWindow(e,t){if(!n.windowManagement)return!1;let r=n.windowManagement.manageWindow(e,t);return Q=null,$=null,r},async getWindowRect(){return n.windowManagement?n.windowManagement.getWindowRect():null},async openTerminal(t){if(process.platform!==`win32`)return null;try{let{listWindows:n}=(w(),e(At)),{bindWindow:r}=(Y(),e(G)),i={claude:`claude`,codex:`codex`,gemini:`gemini`,custom:t.command??``}[t.agent];if(!i)return null;let a=new Set(n().map(e=>e.hwnd)),o=(t.workingDirectory??process.cwd()).replace(/'/g,`''`);Bun.spawnSync({cmd:[`powershell`,`-Command`,`Start-Process powershell -ArgumentList '-NoExit','-Command','cd ''${o}''; ${i}'`],stdout:`ignore`,stderr:`ignore`});let s=null,c=``;for(let e=0;e<25;e++){await l(200);for(let e of n())if(!a.has(e.hwnd)){let t=e.title.toLowerCase();if(t.includes(`terminal`)||t.includes(`powershell`)||t.includes(`cmd`)||t.includes(i.toLowerCase())){s=e.hwnd,c=e.title;break}}if(s)break}if(!s)return null;let u=n().find(e=>e.hwnd===s);return r(s,u?.pid),Q=null,$=null,await l(2e3),{hwnd:s,title:c,launched:!0}}catch{return null}},async bindToWindow(t){if(process.platform!==`win32`)return null;let{bindWindow:n}=(Y(),e(G)),{listWindows:r}=(w(),e(At)),i=r(),a;if(t.hwnd)a=i.find(e=>e.hwnd===t.hwnd);else if(t.title){let e=t.title.toLowerCase();a=i.find(t=>t.title.toLowerCase().includes(e))}else t.pid&&(a=i.find(e=>e.pid===t.pid));return a?(n(a.hwnd,a.pid),Q=null,$=null,a):null},async unbindFromWindow(){if(process.platform!==`win32`)return;let{unbindWindow:t}=(Y(),e(G));t(),Q=null,$=null},async hasBoundWindow(){return Z()},async getBindingStatus(){if(process.platform!==`win32`)return null;let{getBoundHwnd:t}=(Y(),e(G)),r=t();if(!r)return{bound:!1};let{listWindows:i}=(w(),e(At)),a=i().find(e=>e.hwnd===r),o=n.windowManagement?.getWindowRect()??void 0;return{bound:!0,hwnd:r,title:a?.title,pid:a?.pid,rect:o??void 0}},async listVisibleWindows(){if(process.platform!==`win32`)return[];let{listWindows:t}=(w(),e(At));return t()},async statusIndicator(t,n){if(process.platform!==`win32`)return{active:!1};try{let r=(Gn(),e(An));return t===`show`&&n?(r.updateIndicator(n),{active:!0,message:n}):t===`hide`?(r.hideIndicator(),{active:!1}):{active:Z()}}catch{return{active:!1}}},async virtualKeyboard(t){if(process.platform!==`win32`||!Z())return!1;try{let n=yi();if(!n)return!1;let r=(W(),e(B)),{VK_MAP:i}=(C(),e(vt)),a=t.repeat??1;for(let e=0;e<a;e++)switch(e>0&&await l(30),t.action){case`type`:r.sendText(n,t.text);break;case`combo`:{let e=t.text.split(`+`).map(e=>e.trim()).filter(Boolean);r.sendKeys(n,e);break}case`press`:{let e=i[t.text.toLowerCase()]??(t.text.length===1?t.text.charCodeAt(0):0);e&&r.sendKey(n,e,`down`);break}case`release`:{let e=i[t.text.toLowerCase()]??(t.text.length===1?t.text.charCodeAt(0):0);e&&r.sendKey(n,e,`up`);break}case`hold`:{let e=t.text.split(`+`).map(e=>e.trim()).filter(Boolean);for(let t of e){let e=i[t.toLowerCase()]??(t.length===1?t.charCodeAt(0):0);e&&r.sendKey(n,e,`down`)}await l((t.duration??1)*1e3);for(let t of[...e].reverse()){let e=i[t.toLowerCase()]??(t.length===1?t.charCodeAt(0):0);e&&r.sendKey(n,e,`up`)}break}}return!0}catch{return!1}},async virtualMouse(t){if(process.platform!==`win32`||!Z())return!1;try{let n=yi();if(!n)return!1;let r=(W(),e(B)),i=(kn(),e(gn)),a=Math.round(t.x),o=Math.round(t.y);switch(t.action){case`click`:i.moveVirtualCursor(a,o,!0),r.sendClick(n,a,o,`left`);break;case`double_click`:i.moveVirtualCursor(a,o,!0),r.sendClick(n,a,o,`left`),await l(50),r.sendClick(n,a,o,`left`);break;case`right_click`:i.moveVirtualCursor(a,o,!0),r.sendClick(n,a,o,`right`);break;case`move`:i.moveVirtualCursor(a,o),r.sendMouseMove(n,a,o);break;case`drag`:{let e=Math.round(t.startX??a),s=Math.round(t.startY??o);i.moveVirtualCursor(e,s,!0),r.sendMouseDown(n,e,s),await l(16),r.sendMouseMove(n,a,o),i.moveVirtualCursor(a,o),await l(16),r.sendMouseUp(n,a,o);break}case`down`:i.moveVirtualCursor(a,o,!0),r.sendMouseDown(n,a,o);break;case`up`:i.moveVirtualCursor(a,o),r.sendMouseUp(n,a,o);break}return!0}catch{return!1}},async mouseWheel(t,n,r,i){if(process.platform!==`win32`||!Z())return!1;try{let a=yi();if(!a)return!1;try{if((Qn(),e(Kn)).callSync(`send_mouse_wheel`,{hwnd:a,x:Math.round(t),y:Math.round(n),delta:r,horizontal:i??!1})!==null)return!0}catch{}let{sendMouseWheel:o}=(W(),e(B));return o(a,Math.round(t),Math.round(n),r,i??!1)}catch{return!1}},async activateWindow(t,r){if(process.platform!==`win32`||!Z())return!1;try{let{getBoundHwnd:i}=(Y(),e(G)),a=i();if(!a)return!1;n.windowManagement&&n.windowManagement.manageWindow(`focus`);let{sendClick:o}=(W(),e(B));if(t!==void 0&&r!==void 0)o(a,t,r,`left`);else{let e=n.windowManagement?.getWindowRect();if(e){let t=xi();o(a,Math.round(e.width/2)-t.dx,Math.round(e.height/2)-t.dy,`left`)}}return!0}catch{return!1}},async respondToPrompt(t){if(process.platform!==`win32`||!Z())return!1;try{let{getBoundHwnd:n}=(Y(),e(G)),r=n();if(!r)return!1;let i=(W(),e(B));switch(t.responseType){case`yes`:i.sendChar(r,`y`),await l(50),i.sendKey(r,13,`down`),i.sendKey(r,13,`up`);break;case`no`:i.sendChar(r,`n`),await l(50),i.sendKey(r,13,`down`),i.sendKey(r,13,`up`);break;case`enter`:i.sendKey(r,13,`down`),i.sendKey(r,13,`up`);break;case`escape`:i.sendKey(r,27,`down`),i.sendKey(r,27,`up`);break;case`select`:{let e=(t.arrowDirection??`down`)===`down`?40:38,n=t.arrowCount??1;for(let t=0;t<n;t++)i.sendKey(r,e,`down`),i.sendKey(r,e,`up`),await l(30);await l(50),i.sendKey(r,13,`down`),i.sendKey(r,13,`up`);break}case`type`:t.text&&(i.sendText(r,t.text),await l(50)),i.sendKey(r,13,`down`),i.sendKey(r,13,`up`);break}return!0}catch{return!1}},async clickElement(t){if(process.platform!==`win32`||!Z())return!1;try{let{getBoundHwnd:n}=(Y(),e(G)),r=n();if(!r)return!1;let{captureAccessibilitySnapshot:i,findNodeInSnapshot:a}=(oi(),e(ei)),o=i(r);if(!o)return!1;let s=a(o.nodes,t);if(!s)return!1;let{clickElement:c}=(_i(),e(si)),l=(w(),e(At)).listWindows().find(e=>e.hwnd===r);if(l&&s.automationId&&c(l.title,s.automationId))return!0;let u=s.bounds.x+Math.round(s.bounds.w/2),ee=s.bounds.y+Math.round(s.bounds.h/2),te=xi(),{sendClick:ne}=(W(),e(B));return ne((W(),e(B)).findEditChild(r)??r,u-te.dx,ee-te.dy,`left`),!0}catch{return!1}},async typeIntoElement(t,n){if(process.platform!==`win32`||!Z())return!1;try{let{getBoundHwnd:r}=(Y(),e(G)),i=r();if(!i)return!1;let a=(w(),e(At)).listWindows().find(e=>e.hwnd===i);if(a){let{setValue:r,findElement:i}=(_i(),e(si));if(t.automationId&&r(a.title,t.automationId,n))return!0;if(t.name){let e=i(a.title,t);if(e&&e.automationId&&r(a.title,e.automationId,n))return!0}}let{captureAccessibilitySnapshot:o,findNodeInSnapshot:s}=(oi(),e(ei)),c=o(i);if(!c)return!1;let u=s(c.nodes,t);if(!u)return!1;let ee=xi(),te=u.bounds.x+Math.round(u.bounds.w/2)-ee.dx,ne=u.bounds.y+Math.round(u.bounds.h/2)-ee.dy,{sendClick:re,sendText:ie}=(W(),e(B));return re(i,te,ne,`left`),await l(50),ie(i,n)}catch{return!1}}}}async function Ti(e){}var Q,$,Ei=t((()=>{o(),u(),ne(),C(),$r(),Q=null,$=null}));function Di(e,t,n){return ae(Math.round(e*n),Math.round(t*n),ie)}async function Oi(){if(process.platform===`win32`){let{stdout:e,code:t}=await c(`powershell`,[`-NoProfile`,`-Command`,`Get-Clipboard`],{useCwd:!1});if(t!==0)throw Error(`PowerShell Get-Clipboard exited with code ${t}`);return e}if(process.platform===`linux`){let{stdout:e,code:t}=await c(`xclip`,[`-selection`,`clipboard`,`-o`],{useCwd:!1});if(t!==0)throw Error(`xclip exited with code ${t}`);return e}let{stdout:e,code:t}=await c(`pbpaste`,[],{useCwd:!1});if(t!==0)throw Error(`pbpaste exited with code ${t}`);return e}async function ki(e){if(process.platform===`win32`){let{code:t}=await c(`powershell`,[`-NoProfile`,`-Command`,`Set-Clipboard -Value '${e.replace(/'/g,`''`)}'`],{useCwd:!1});if(t!==0)throw Error(`PowerShell Set-Clipboard exited with code ${t}`);return}if(process.platform===`linux`){let{code:t}=await c(`xclip`,[`-selection`,`clipboard`],{input:e,useCwd:!1});if(t!==0)throw Error(`xclip exited with code ${t}`);return}let{code:t}=await c(`pbcopy`,[],{input:e,useCwd:!1});if(t!==0)throw Error(`pbcopy exited with code ${t}`)}function Ai(e){if(e.length!==1)return!1;let t=e[0].toLowerCase();return t===`escape`||t===`esc`}async function ji(e,t,n){await e.moveMouse(t,n,!1),await l(zi)}async function Mi(e,t){let n;for(;(n=t.pop())!==void 0;)try{await e.key(n,`release`)}catch{}}async function Ni(e,t,n){let r=[];try{for(let n of t)await e.key(n,`press`),r.push(n);return await n()}finally{await Mi(e,r)}}async function Pi(e,t){let n;try{n=await Oi()}catch{a(`[computer-use] pbpaste before paste failed; proceeding without restore`)}try{if(await ki(t),await Oi()!==t)throw Error(`Clipboard write did not round-trip.`);await e.keys([process.platform===`darwin`?`command`:`ctrl`,`v`]),await l(100)}finally{if(typeof n==`string`)try{await ki(n)}catch{a(`[computer-use] clipboard restore after paste failed`)}}}async function Fi(e,t,n,r){if(!r){await ji(e,t,n);return}let i=await e.mouseLocation(),a=t-i.x,o=n-i.y,s=Math.hypot(a,o);if(s<1)return;let c=Math.min(s/2e3,.5);if(c<.03){await ji(e,t,n);return}let u=Math.floor(c*60);for(let t=1;t<=u;t++){let n=1-(1-t/u)**3;await e.moveMouse(Math.round(i.x+a*n),Math.round(i.y+o*n),!1),t<u&&await l(16.666666666666668)}await l(zi)}function Ii(t){if(process.platform!==`darwin`){let{createCrossPlatformExecutor:n}=(Ei(),e(vi));return n(t)}let n=f(),{getMouseAnimationEnabled:r,getHideBeforeActionEnabled:o}=t,s=ee(),c=s??`com.anthropic.claude-code.cli-no-window`,u=e=>s===null?[...e]:e.filter(e=>e!==s);return a(s?`[computer-use] terminal ${s} → surrogate host (hide-exempt, activate-skip, screenshot-excluded)`:`[computer-use] terminal not detected; falling back to sentinel host`),{capabilities:{...re,hostBundleId:te},async prepareForAction(e,t){return o()?d(async()=>{try{let r=await n.apps.prepareDisplay(e,c,t);return r.activated&&a(`[computer-use] prepareForAction: activated ${r.activated}`),r.hidden}catch(e){return a(`[computer-use] prepareForAction failed; continuing to action: ${i(e)}`,{level:`warn`}),[]}}):[]},async previewHideSet(e,t){return n.apps.previewHideSet([...e,c],t)},async getDisplaySize(e){return n.display.getSize(e)},async listDisplays(){return n.display.listAll()},async findWindowDisplays(e){return n.apps.findWindowDisplays(e)},async resolvePrepareCapture(e){let t=n.display.getSize(e.preferredDisplayId),[r,i]=Di(t.width,t.height,t.scaleFactor),a=await d(()=>n.resolvePrepareCapture(u(e.allowedBundleIds),c,Ri,r,i,e.preferredDisplayId)),o=a;return{...a,displayWidth:o.displayWidth??o.width,displayHeight:o.displayHeight??o.height,originX:o.originX??0,originY:o.originY??0,hidden:o.hidden??[],displayId:o.displayId??e.preferredDisplayId??t.displayId}},async screenshot(e){let t=n.display.getSize(e.displayId),[r,i]=Di(t.width,t.height,t.scaleFactor);return d(()=>n.screenshot.captureExcluding(u(e.allowedBundleIds),Ri,r,i,e.displayId))},async zoom(e,t,r){let i=n.display.getSize(r),[a,o]=Di(e.w,e.h,i.scaleFactor);return d(()=>n.screenshot.captureRegion(u(t),e.x,e.y,e.w,e.h,a,o,Ri,r))},async key(e,t){let n=y(),r=e.split(`+`).filter(e=>e.length>0),i=Ai(r),a=t??1;await d(async()=>{for(let e=0;e<a;e++)e>0&&await l(8),i&&se(),await n.keys(r)})},async holdKey(e,t){let n=y(),r=[],i=!1;try{await d(async()=>{for(let t of e){if(i)return;Ai([t])&&se(),await n.key(t,`press`),r.push(t)}}),await l(t)}finally{i=!0,await d(()=>Mi(n,r))}},async type(e,t){let n=y();if(t.viaClipboard){await d(()=>Pi(n,e));return}await n.typeText(e)},readClipboard:Oi,writeClipboard:ki,async moveMouse(e,t){await ji(y(),e,t)},async click(e,t,n,r,i){let a=y();await ji(a,e,t),i&&i.length>0?await d(()=>Ni(a,i,()=>a.mouseButton(n,`click`,r))):await a.mouseButton(n,`click`,r)},async mouseDown(){await y().mouseButton(`left`,`press`)},async mouseUp(){await y().mouseButton(`left`,`release`)},async getCursorPosition(){return y().mouseLocation()},async drag(e,t){let n=y();e!==void 0&&await ji(n,e.x,e.y),await n.mouseButton(`left`,`press`),await l(zi);try{await Fi(n,t.x,t.y,r())}finally{await n.mouseButton(`left`,`release`)}},async scroll(e,t,n,r){let i=y();await ji(i,e,t),r!==0&&await i.mouseScroll(r,`vertical`),n!==0&&await i.mouseScroll(n,`horizontal`)},async getFrontmostApp(){let e=y().getFrontmostAppInfo();return!e||!e.bundleId?null:{bundleId:e.bundleId,displayName:e.appName}},async appUnderPoint(e,t){return n.apps.appUnderPoint(e,t)},async listInstalledApps(){return d(()=>n.apps.listInstalled())},async getAppIcon(e){return n.apps.iconDataUrl(e)??void 0},async listRunningApps(){return n.apps.listRunning()},async openApp(e){await n.apps.open(e)}}}async function Li(e){e.length!==0&&process.platform===`darwin`&&await f().apps.unhide([...e])}var Ri,zi,Bi=t((()=>{oe(),o(),r(),s(),u(),ne(),ce(),ue(),_t(),le(),Ri=.75,zi=50}));export{Bi as n,Li as r,Ii as t};