#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dist = path.resolve(__dirname, '../dist/chunks/loadAgentsDir-BMosMfSG.js');
const s = fs.readFileSync(dist, 'utf8');

const lXe = s.slice(s.indexOf('lXe=`'), s.indexOf('`})),dXe,fXe') + 1);
const lFt = s.slice(s.indexOf('LFt=`'), s.indexOf('`,RFt=`'));
const rFt = s.slice(s.indexOf('RFt=`'), s.indexOf('`}));function BFt') + 1);

const zh = {
  lXe:
    'lXe=`更新当前会话的待办清单。应主动频繁使用以跟踪进度与待办。确保始终至少有一项为 in_progress。每项任务须同时提供 content（祈使句）与 activeForm（现在进行时）。`',
  lFt: [
    'LFt=`',
    '从 MCP 服务器读取指定资源。',
    '- server：MCP 服务器名称',
    '- uri：资源 URI',
    '',
    '示例：',
    '- 从服务器读取资源：\\`readMcpResource({ server: "myserver", uri: "my-resource-uri" })\\`',
    '`',
  ].join('\n'),
  rFt: [
    'RFt=`',
    '从 MCP 服务器读取指定资源（按服务器名与 URI 标识）。',
    '',
    '参数：',
    '- server（必填）：要读取资源的 MCP 服务器名称',
    '- uri（必填）：资源 URI',
    '`',
  ].join('\n'),
};

function psHere(en, z) {
  return `$chunkToolLongDesc[@'${en}'@] = @'${z}'@`;
}

const block = [
  '# Tool long descriptions (ReadMcpResource, TodoWrite; loadAgentsDir-BMosMfSG.js)',
  '$chunkToolLongDesc = New-ReplacementMap',
  psHere(lXe, zh.lXe),
  psHere(lFt, zh.lFt),
  psHere(rFt, zh.rFt),
  'Patch-AllChunks -DistDir $ChunksDir -Replacements $chunkToolLongDesc',
  '',
].join('\n');

const out = path.join(__dirname, '_tool-long-patch.ps1');
fs.writeFileSync(out, block, 'utf8');
console.log('Wrote', out);
