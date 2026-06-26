// _build-ps1.js — generate a runnable .ps1 file from a translation spec
// Usage: node _build-ps1.js <spec.json> <out.ps1>
const fs = require('fs');

function toUnicodeEscapes(s) {
  let out = '';
  for (const ch of s) {
    const cp = ch.codePointAt(0);
    if (cp < 0x80) {
      out += ch;
    } else if (cp <= 0xffff) {
      out += '\\u' + cp.toString(16).padStart(4, '0');
    } else {
      const high = Math.floor((cp - 0x10000) / 0x400) + 0xd800;
      const low = ((cp - 0x10000) % 0x400) + 0xdc00;
      out += '\\u' + high.toString(16).padStart(4, '0') + '\\u' + low.toString(16).padStart(4, '0');
    }
  }
  return out;
}

function psEscape(s) {
  // Escape single quotes + any non-ASCII char as \uXXXX (keeps PS1 file pure ASCII,
  // so PowerShell 5.1 with default Windows-1252 reads keys correctly).
  let out = '';
  for (const ch of s) {
    const cp = ch.codePointAt(0);
    if (ch === "'") {
      out += "''";
    } else if (cp < 0x80) {
      out += ch;
    } else if (cp <= 0xffff) {
      out += '\\u' + cp.toString(16).padStart(4, '0');
    } else {
      const high = Math.floor((cp - 0x10000) / 0x400) + 0xd800;
      const low = ((cp - 0x10000) % 0x400) + 0xdc00;
      out += '\\u' + high.toString(16).padStart(4, '0') + '\\u' + low.toString(16).padStart(4, '0');
    }
  }
  return out;
}

const spec = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const lines = [
  'param([string]$ChunksDir)',
  '$ErrorActionPreference = "Stop"',
  '$utf8NoBom = [System.Text.UTF8Encoding]::new($false)',
  '',
  'function New-ReplacementMap {',
  '  return [System.Collections.Generic.Dictionary[string, string]]::new([System.StringComparer]::Ordinal)',
  '}',
  '',
  'function Patch-AllChunks {',
  '  param([string]$DistDir, $Replacements)',
  '  $hits = 0',
  '  Get-ChildItem -LiteralPath $DistDir -Filter "*.js" -File | ForEach-Object {',
  '    $content = [System.IO.File]::ReadAllText($_.FullName, $utf8NoBom)',
  '    $changed = $false',
  '    foreach ($kv in $Replacements.GetEnumerator()) {',
  '      if ($content.Contains($kv.Key)) {',
  '        $content = $content.Replace($kv.Key, $kv.Value)',
  '        $changed = $true',
  '        $hits++',
  '      }',
  '    }',
  '    if ($changed) {',
  '      [System.IO.File]::WriteAllText($_.FullName, $content, $utf8NoBom)',
  '      Write-Host "  [updated] $($_.Name)" -ForegroundColor Green',
  '    }',
  '  }',
  '  return $hits',
  '}',
  '',
  'if (-not $ChunksDir) { $ChunksDir = Join-Path (Split-Path -Parent (Split-Path -Parent $PSScriptRoot)) "dist\\chunks" }',
  ''
];

let totalChunks = 0;
for (const [chunkName, entries] of Object.entries(spec)) {
  lines.push(`# === ${chunkName} ===`);
  lines.push(`$chunk${chunkName} = New-ReplacementMap`);
  for (const [en, zh] of Object.entries(entries)) {
    const key = psEscape(en);
    const val = psEscape(zh);
    lines.push(`$chunk${chunkName}['${key}'] = '${val}'`);
  }
  lines.push(`$hits = Patch-AllChunks -DistDir $ChunksDir -Replacements $chunk${chunkName}`);
  lines.push(`Write-Host ("  {0} -> {1} hits" -f "${chunkName}", $hits)`);
  lines.push('');
  totalChunks++;
}
lines.push(`Write-Host "Total chunks: ${totalChunks}" -ForegroundColor Cyan`);
fs.writeFileSync(process.argv[3], lines.join('\n'), { encoding: 'utf8' });
console.error(`Wrote ${process.argv[3]} (${totalChunks} chunks)`);
