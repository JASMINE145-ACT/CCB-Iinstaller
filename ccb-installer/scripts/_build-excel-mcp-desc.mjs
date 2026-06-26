import fs from "node:fs";
import path from "node:path";

const guides = [
  ["anti_patterns_guide", 'd==="Common mistakes to avoid when using Excel MCP tools"', "Excel MCP 工具常见错误与避坑指南"],
  ["behavioral_rules_guide", 'd==="Rules and constraints for Excel MCP operations"', "Excel MCP 操作规则与约束"],
  ["chart_guide", 'd==="Chart creation, types, positioning, and multi-chart layouts"', "Excel 图表创建、类型和布局指南"],
  ["conditionalformat_guide", 'd==="Conditional formatting rule types, parameters, and examples"', "Excel 条件格式规则、参数和示例"],
  ["dashboard_guide", 'd.startsWith("Dashboard and report")', "Excel 仪表盘和报告最佳实践：表格、格式等"],
  ["datamodel_guide", 'd.startsWith("Data Model (Power Pivot)")', "Excel 数据模型（Power Pivot）操作、DAX 度量等"],
  ["dmv_reference_guide", 'd.startsWith("DMV query reference")', "Excel 内置 Analysis Services 的 DMV 查询参考"],
  ["excel_agent_mode_guide", 'd.startsWith("Agent Mode in Excel")', "Excel 代理模式 — 观看 AI 工作"],
  ["gotchas_guide", 'd==="Gotchas & Known Limits"', "常见陷阱与已知限制"],
  ["m_code_syntax_guide", 'd.startsWith("Power Query M code syntax")', "Power Query M 代码语法：列引用、命名区域与查询链"],
  ["pivottable_guide", 'd.startsWith("PivotTable creation")', "PivotTable 创建、字段、计算项与必需参数"],
  ["powerquery_guide", 'd.startsWith("Power Query M code workflows")', "Power Query M 代码工作流、刷新模式与开发技巧"],
  ["range_guide", 'd.startsWith("Range number formats")', "区域数字格式、区域感知格式与格式代码"],
  ["screenshot_guide", 'd.startsWith("Screenshot capture")', "截屏验证图表与仪表盘视觉效果"],
  ["slicer_guide", 'd.startsWith("Slicer types")', "切片器类型、创建模式与多选筛选"],
  ["table_guide", 'd.startsWith("Excel Table operations")', "Excel 表格操作、数据模型集成与列管理"],
  ["window_guide", 'd==="Window Management Reference"', "窗口管理参考"],
  ["workflows_guide", 'd.startsWith("Key constraints, batch operations")', "关键约束、批量操作与会话管理模式"],
  ["worksheet_guide", 'd.startsWith("Worksheet operations")', "工作表操作（含跨文件复制与移动）"],
];

const header =
  'function ccbZhDesc(e){let n=String(e.name||""),d=e.description||"";n.includes("__")?n=n.split("__").pop():n.includes(":")&&(n=n.split(":").pop());';

function toUnicodeEsc(s) {
  return [...s]
    .map((ch) => {
      const c = ch.codePointAt(0);
      if (c <= 0x7f && ch !== "\\" && ch !== '"') return ch;
      if (ch === "\\") return "\\\\";
      if (ch === '"') return '\\"';
      if (c <= 0xffff) return "\\u" + c.toString(16).padStart(4, "0");
      const hi = Math.floor((c - 0x10000) / 0x400) + 0xd800;
      const lo = ((c - 0x10000) % 0x400) + 0xdc00;
      return "\\u" + hi.toString(16).padStart(4, "0") + "\\u" + lo.toString(16).padStart(4, "0");
    })
    .join("");
}

const body = guides
  .map(([name, descCond, zh]) => {
    const esc = toUnicodeEsc(zh);
    return `if(n==="${name}"||${descCond})return"${esc}"`;
  })
  .join(";");

const fn = header + body + ";return d}";

const distPath = path.resolve("dist/chunks/loadAgentsDir-BMosMfSG.js");
const dist = fs.readFileSync(distPath, "utf8");
const oldMatch = dist.match(/function ccbZhDesc\(e\)\{[^}]+\}/);
if (!oldMatch) throw new Error("ccbZhDesc not found in dist");
const updated = dist.replace(oldMatch[0], fn);
fs.writeFileSync(distPath, updated);

const ps1Path = path.resolve("scripts/patch-i18n.ps1");
let ps1 = fs.readFileSync(ps1Path, "utf8");
const fnEsc = fn.replace(/'/g, "''");
ps1 = ps1.replace(/\$ccbZhDescFn = '[^']+'/, `$ccbZhDescFn = '${fnEsc}'`);
const oldKeyEsc = oldMatch[0].replace(/'/g, "''");
ps1 = ps1.replace(
  /\$chunkExcelMcpDescUpgrade\['function ccbZhDesc\(e\)\{[^']+'\] = \$ccbZhDescFn/,
  `$chunkExcelMcpDescUpgrade['${oldKeyEsc}'] = $ccbZhDescFn`,
);
fs.writeFileSync(ps1Path, ps1);

console.log("ccbZhDesc length:", fn.length, "guides:", guides.length);
console.log(fn);
