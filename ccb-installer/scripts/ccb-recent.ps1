# ccb-recent.ps1 — CCB "最近活动" 选择器
#
# 扫描 CCB 会话历史（%LOCALAPPDATA%\CCB\.claude\projects\<项目>\<sessionId>.jsonl），
# 渲染一个中文"最近对话"面板，让用户选择恢复某个对话或开始新对话。
#
# 界面通过 Write-Host 直接输出到控制台；最终选择结果写入 -ResultFile 指定的临时
# 文件（无 BOM，单行），供 ccb.cmd 读取：
#   <sessionId>|<cwd>   选择恢复某会话（cwd 为该会话原始工作目录）
#   (文件为空/不存在)    开始新对话
#   QUIT                用户取消，不启动
#
# 设计为对损坏/缺失数据健壮：任何解析失败都跳过该会话，绝不让选择器崩溃。

param(
    [string]$ConfigDir = "$env:LOCALAPPDATA\CCB\.claude",
    [string]$ResultFile = "",
    [int]$Count = 12
)

$ErrorActionPreference = 'Stop'
try {
    [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
} catch {}

$ProjectsDir = Join-Path $ConfigDir 'projects'

function Write-Result([string]$Line) {
    if ($ResultFile) {
        try {
            $enc = New-Object System.Text.UTF8Encoding($false)  # 无 BOM
            [System.IO.File]::WriteAllText($ResultFile, $Line, $enc)
        } catch {}
    }
}

# ---- 相对时间（中文）----
function Format-RelativeTime([datetime]$When) {
    $span = (Get-Date) - $When
    if ($span.TotalSeconds -lt 60) { return '刚刚' }
    if ($span.TotalMinutes -lt 60) { return ('{0} 分钟前' -f [int]$span.TotalMinutes) }
    if ($span.TotalHours   -lt 24) { return ('{0} 小时前' -f [int]$span.TotalHours) }
    if ($span.TotalHours   -lt 48) { return '昨天 ' + $When.ToString('HH:mm') }
    if ($span.TotalDays    -lt 7)  { return ('{0} 天前' -f [int]$span.TotalDays) }
    return $When.ToString('MM-dd HH:mm')
}

# ---- 项目目录名 -> 友好路径（D--CCB -> D:\CCB，仅作回退展示用）----
function Decode-ProjectDir([string]$Name) {
    if ($Name -match '^[A-Za-z]--') {
        $drive = $Name.Substring(0,1)
        $rest  = $Name.Substring(3) -replace '-', '\'
        return ('{0}:\{1}' -f $drive, $rest)
    }
    return $Name
}

# ---- 解析单个会话文件，提取展示所需的元数据 ----
function Get-SessionMeta([System.IO.FileInfo]$File) {
    $title = $null
    $summary = $null
    $cwd = $null
    $turns = 0
    try {
        $reader = [System.IO.StreamReader]::new($File.FullName, [System.Text.Encoding]::UTF8)
        try {
            while ($null -ne ($line = $reader.ReadLine())) {
                $line = $line.Trim()
                if (-not $line) { continue }
                $o = $null
                try { $o = $line | ConvertFrom-Json } catch { continue }
                if ($null -eq $o) { continue }
                $t = $o.type
                if (-not $cwd -and $o.cwd) { $cwd = [string]$o.cwd }
                if ($t -eq 'summary' -and $o.summary) { $summary = [string]$o.summary }
                if ($t -eq 'user' -and $o.message) {
                    $c = $o.message.content
                    $text = $null
                    if ($c -is [string]) {
                        $text = $c
                    } elseif ($c -is [System.Array]) {
                        foreach ($p in $c) {
                            if ($p -and $p.type -eq 'text' -and $p.text) { $text = [string]$p.text; break }
                        }
                    }
                    if ($text) {
                        $trimmed = $text.TrimStart()
                        # 跳过系统注入/命令包装的伪用户消息
                        if (-not $trimmed.StartsWith('<') -and -not $trimmed.StartsWith('Caveat:')) {
                            $turns++
                            if (-not $title) { $title = ($text -replace '\s+', ' ').Trim() }
                        }
                    }
                }
            }
        } finally { $reader.Dispose() }
    } catch { return $null }

    $display = if ($summary) { $summary } elseif ($title) { $title } else { '(无标题对话)' }
    return [PSCustomObject]@{
        SessionId = [System.IO.Path]::GetFileNameWithoutExtension($File.Name)
        Title     = $display
        Cwd       = if ($cwd) { $cwd } else { Decode-ProjectDir $File.Directory.Name }
        Turns     = $turns
        When      = $File.LastWriteTime
    }
}

# ---- 按显示宽度截断（CJK 记 2 宽）----
function Truncate-Display([string]$Text, [int]$MaxWidth) {
    if (-not $Text) { return '' }
    $w = 0; $sb = New-Object System.Text.StringBuilder
    foreach ($ch in $Text.ToCharArray()) {
        $cw = if ([int][char]$ch -gt 0x1100) { 2 } else { 1 }
        if ($w + $cw -gt $MaxWidth) { [void]$sb.Append('…'); break }
        [void]$sb.Append($ch); $w += $cw
    }
    return $sb.ToString()
}

# ===================== 主流程 =====================

if (-not (Test-Path -LiteralPath $ProjectsDir)) {
    Write-Host ''
    Write-Host '  还没有历史对话记录，将开始一个新对话。'
    Write-Host ''
    Write-Result ''
    return
}

$files = Get-ChildItem -LiteralPath $ProjectsDir -Recurse -Filter '*.jsonl' -File -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First ([Math]::Max($Count * 2, 24))

$sessions = @()
foreach ($f in $files) {
    if ($f.Length -lt 4) { continue }
    $m = Get-SessionMeta $f
    if ($m -and $m.Turns -gt 0) { $sessions += $m }
    if ($sessions.Count -ge $Count) { break }
}

if ($sessions.Count -eq 0) {
    Write-Host ''
    Write-Host '  还没有可恢复的对话，将开始一个新对话。'
    Write-Host ''
    Write-Result ''
    return
}

Write-Host ''
Write-Host '  ┌─ CCB 最近对话 ──────────────────────────────────────────────┐' -ForegroundColor Cyan
$i = 0
foreach ($s in $sessions) {
    $i++
    $idx   = '{0,2}' -f $i
    $when  = '{0,-10}' -f (Format-RelativeTime $s.When)
    $title = Truncate-Display $s.Title 40
    Write-Host ('  │ ') -NoNewline -ForegroundColor Cyan
    Write-Host ("{0}." -f $idx) -NoNewline -ForegroundColor Yellow
    Write-Host (" {0} " -f $when) -NoNewline -ForegroundColor DarkGray
    Write-Host ("{0}" -f $title) -NoNewline
    Write-Host (" · {0} 轮" -f $s.Turns) -ForegroundColor DarkGray
}
Write-Host '  └─────────────────────────────────────────────────────────────┘' -ForegroundColor Cyan
Write-Host '   输入序号恢复对话  ·  直接回车开始新对话  ·  q 取消'
Write-Host '   > ' -NoNewline -ForegroundColor Green

$choice = ''
try { $choice = [Console]::ReadLine() } catch { $choice = '' }
if ($null -eq $choice) { $choice = '' }
$choice = $choice.Trim()

if ($choice -eq '') { Write-Result ''; return }                       # 新对话
if ($choice -ieq 'q' -or $choice -ieq 'quit') { Write-Result 'QUIT'; return }

$n = 0
if ([int]::TryParse($choice, [ref]$n) -and $n -ge 1 -and $n -le $sessions.Count) {
    $sel = $sessions[$n - 1]
    Write-Result ('{0}|{1}' -f $sel.SessionId, $sel.Cwd)
    Write-Host ('   正在恢复对话…') -ForegroundColor Green
    return
}

# 无法识别 -> 当作新对话
Write-Host '   未识别的输入，开始新对话。'
Write-Result ''
return
