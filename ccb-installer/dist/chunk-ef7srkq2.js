// @bun
import {
  init_staticRender,
  renderToAnsiString
} from "./chunk-50mrxgnv.js";
import {
  exports_operations,
  init_operations
} from "./chunk-q2pkj7sp.js";
import {
  BASH_TOOL_NAME,
  FILE_READ_TOOL_NAME,
  GREP_TOOL_NAME,
  WEB_FETCH_TOOL_NAME,
  analyzeContextUsage,
  exports_contextCollapse,
  getMessagesAfterCompactBoundary,
  init_analyzeContext,
  init_contextCollapse,
  init_messages1 as init_messages,
  init_microCompact,
  init_prompt,
  init_prompt1 as init_prompt2,
  init_prompt4 as init_prompt3,
  init_toolName,
  microcompactMessages
} from "./chunk-xg5k46jr.js";
import"./chunk-b0ex2qgg.js";
import"./chunk-7qc1t27a.js";
import"./chunk-qe3qr56q.js";
import"./chunk-nd9hcjys.js";
import"./chunk-et824jj8.js";
import"./chunk-e86bxpak.js";
import"./chunk-var1et7e.js";
import"./chunk-evs14mjg.js";
import"./chunk-2gzv8nrw.js";
import"./chunk-ehtwnxpg.js";
import"./chunk-0rgqsb9t.js";
import"./chunk-c0kjpr24.js";
import"./chunk-cgfdkzhb.js";
import"./chunk-2f6hs25r.js";
import"./chunk-xnt2j152.js";
import"./chunk-sv7afh51.js";
import"./chunk-j7b884wk.js";
import"./chunk-w7xjra5m.js";
import"./chunk-zttmdag3.js";
import"./chunk-smxezvfx.js";
import"./chunk-7ac6mws7.js";
import"./chunk-ps49ymvj.js";
import"./chunk-chzfw06n.js";
import"./chunk-s2x040y6.js";
import"./chunk-t4kcvmes.js";
import"./chunk-kten1z0y.js";
import"./chunk-rdh5rbpt.js";
import"./chunk-cy1z66c2.js";
import"./chunk-51pnrq77.js";
import"./chunk-wxa2hdfg.js";
import"./chunk-4jm600zv.js";
import"./chunk-kyaxezdn.js";
import"./chunk-f57cvf1d.js";
import"./chunk-rkmwx1yz.js";
import"./chunk-cg02f0wy.js";
import"./chunk-ykr5qx9v.js";
import"./chunk-dhpmxxmx.js";
import"./chunk-yg1k879b.js";
import"./chunk-435qaxw3.js";
import"./chunk-c9pb40ft.js";
import"./chunk-ad6rg8vz.js";
import"./chunk-x95fhbwq.js";
import {
  getDisplayPath,
  getSourceDisplayName,
  init_constants,
  init_file,
  init_stringUtils,
  plural
} from "./chunk-mk2vzd2n.js";
import"./chunk-mkae8zj9.js";
import"./chunk-cxmyg49v.js";
import"./chunk-zwarn9h7.js";
import"./chunk-t16fercx.js";
import"./chunk-7hmy36fh.js";
import"./chunk-6kpbgc5w.js";
import"./chunk-d57t992t.js";
import"./chunk-64c1avct.js";
import"./chunk-0knhp7v5.js";
import"./chunk-8g5pe1gr.js";
import"./chunk-b62vj92a.js";
import"./chunk-4cp6193g.js";
import"./chunk-8g747a8x.js";
import"./chunk-d7886r6a.js";
import"./chunk-90wp6wez.js";
import"./chunk-a8ejc632.js";
import"./chunk-f5ma3nh5.js";
import"./chunk-qz2x630m.js";
import"./chunk-c7t69jmn.js";
import"./chunk-6y2wszkc.js";
import"./chunk-3c25bcsw.js";
import"./chunk-9qh5f9r3.js";
import"./chunk-xhesahm0.js";
import"./chunk-rh5a2rg9.js";
import"./chunk-p2816w9z.js";
import"./chunk-v9smspw2.js";
import"./chunk-v1kzp02e.js";
import {
  formatTokens,
  init_format
} from "./chunk-padf4crh.js";
import"./chunk-crmjpsqe.js";
import {
  StatusIcon,
  ThemedBox_default,
  ThemedText,
  init_src
} from "./chunk-z9bw4q7j.js";
import {
  require_jsx_dev_runtime
} from "./chunk-evwb3c85.js";
import"./chunk-h0rbjg6x.js";
import"./chunk-0vkfrmqm.js";
import"./chunk-0xjaqda8.js";
import"./chunk-78009jh9.js";
import"./chunk-9awawyvh.js";
import"./chunk-hqpzpr71.js";
import"./chunk-zs5b1dgr.js";
import"./chunk-hnxmafvc.js";
import"./chunk-tv74hgw9.js";
import"./chunk-wd8mqz95.js";
import"./chunk-8tnsngw2.js";
import"./chunk-vsbyhpfy.js";
import"./chunk-p7pj6wf8.js";
import"./chunk-5z28bqne.js";
import {
  figures_default,
  init_figures
} from "./chunk-qajrkk97.js";
import"./chunk-5khwvj1z.js";
import"./chunk-fbv4apne.js";
import"./chunk-gzp6rza1.js";
import"./chunk-50dgek10.js";
import"./chunk-7wm5s02e.js";
import"./chunk-z0csm2zq.js";
import"./chunk-hxhwzgnn.js";
import"./chunk-qx8z601m.js";
import"./chunk-cgm6758j.js";
import"./chunk-9m27g5s1.js";
import"./chunk-8pn8tvgg.js";
import"./chunk-netzwgv1.js";
import {
  __esm,
  __toCommonJS,
  __toESM
} from "./chunk-qp2qdcda.js";

// src/utils/contextSuggestions.ts
function generateContextSuggestions(data) {
  const suggestions = [];
  checkNearCapacity(data, suggestions);
  checkLargeToolResults(data, suggestions);
  checkReadResultBloat(data, suggestions);
  checkMemoryBloat(data, suggestions);
  checkAutoCompactDisabled(data, suggestions);
  suggestions.sort((a, b) => {
    if (a.severity !== b.severity) {
      return a.severity === "warning" ? -1 : 1;
    }
    return (b.savingsTokens ?? 0) - (a.savingsTokens ?? 0);
  });
  return suggestions;
}
function checkNearCapacity(data, suggestions) {
  if (data.percentage >= NEAR_CAPACITY_PERCENT) {
    suggestions.push({
      severity: "warning",
      title: `\u4e0a\u4e0b\u6587\u5df2\u4f7f\u7528 ${data.percentage}%`,
      detail: data.isAutoCompactEnabled ? "\u5373\u5c06\u89e6\u53d1\u81ea\u52a8\u538b\u7f29\uff0c\u65e7\u6d88\u606f\u5c06\u88ab\u820d\u5f03\u3002\u73b0\u5728\u8fd0\u884c /compact \u53ef\u63a7\u5236\u4fdd\u7559\u5185\u5bb9\u3002" : "\u5df2\u7981\u7528\u81ea\u52a8\u538b\u7f29\u3002\u8fd0\u884c /compact \u91ca\u653e\u7a7a\u95f4\uff0c\u6216\u5728 /config \u4e2d\u542f\u7528\u3002"
    });
  }
}
function checkLargeToolResults(data, suggestions) {
  if (!data.messageBreakdown)
    return;
  for (const tool of data.messageBreakdown.toolCallsByType) {
    const totalToolTokens = tool.callTokens + tool.resultTokens;
    const percent = totalToolTokens / data.rawMaxTokens * 100;
    if (percent < LARGE_TOOL_RESULT_PERCENT || totalToolTokens < LARGE_TOOL_RESULT_TOKENS) {
      continue;
    }
    const suggestion = getLargeToolSuggestion(tool.name, totalToolTokens, percent);
    if (suggestion) {
      suggestions.push(suggestion);
    }
  }
}
function getLargeToolSuggestion(toolName, tokens, percent) {
  const tokenStr = formatTokens(tokens);
  switch (toolName) {
    case BASH_TOOL_NAME:
      return {
        severity: "warning",
        title: `Bash \u7ed3\u679c\u5360\u7528 ${tokenStr} tokens\uff08${percent.toFixed(0)}%\uff09`,
        detail: "\u7528 head\u3001tail \u6216 grep \u8fc7\u6ee4\u8f93\u51fa\u4ee5\u51cf\u5c0f\u7ed3\u679c\u3002\u5927\u6587\u4ef6\u52ff\u7528 cat\uff0c\u6539\u7528 Read \u7684 offset/limit\u3002",
        savingsTokens: Math.floor(tokens * 0.5)
      };
    case FILE_READ_TOOL_NAME:
      return {
        severity: "info",
        title: `\u8bfb\u53d6\u7ed3\u679c\u5360\u7528 ${tokenStr} tokens\uff08${percent.toFixed(0)}%\uff09`,
        detail: "\u4f7f\u7528 offset \u548c limit \u53ea\u8bfb\u53d6\u6240\u9700\u90e8\u5206\u3002\u53ea\u9700\u51e0\u884c\u65f6\u52ff\u91cd\u590d\u8bfb\u6574\u4e2a\u6587\u4ef6\u3002",
        savingsTokens: Math.floor(tokens * 0.3)
      };
    case GREP_TOOL_NAME:
      return {
        severity: "info",
        title: `Grep \u7ed3\u679c\u5360\u7528 ${tokenStr} tokens\uff08${percent.toFixed(0)}%\uff09`,
        detail: "\u4f7f\u7528\u66f4\u5177\u4f53\u7684\u6a21\u5f0f\u6216 glob/type \u7f29\u5c0f\u8303\u56f4\u3002\u53d1\u73b0\u6587\u4ef6\u53ef\u4f18\u5148\u7528 Glob \u800c\u975e Grep\u3002",
        savingsTokens: Math.floor(tokens * 0.3)
      };
    case WEB_FETCH_TOOL_NAME:
      return {
        severity: "info",
        title: `WebFetch \u7ed3\u679c\u5360\u7528 ${tokenStr} tokens\uff08${percent.toFixed(0)}%\uff09`,
        detail: "\u7f51\u9875\u5185\u5bb9\u53ef\u80fd\u5f88\u5927\uff0c\u5c3d\u91cf\u53ea\u63d0\u53d6\u6240\u9700\u4fe1\u606f\u3002",
        savingsTokens: Math.floor(tokens * 0.4)
      };
    default:
      if (percent >= 20) {
        return {
          severity: "info",
          title: `${toolName} \u5360\u7528 ${tokenStr} tokens\uff08${percent.toFixed(0)}%\uff09`,
          detail: `\u6b64\u5de5\u5177\u5360\u7528\u4e86\u8f83\u591a\u4e0a\u4e0b\u6587\u3002`,
          savingsTokens: Math.floor(tokens * 0.2)
        };
      }
      return null;
  }
}
function checkReadResultBloat(data, suggestions) {
  if (!data.messageBreakdown)
    return;
  const callsByType = data.messageBreakdown.toolCallsByType;
  const readTool = callsByType.find((t) => t.name === FILE_READ_TOOL_NAME);
  if (!readTool)
    return;
  const totalReadTokens = readTool.callTokens + readTool.resultTokens;
  const totalReadPercent = totalReadTokens / data.rawMaxTokens * 100;
  const readPercent = readTool.resultTokens / data.rawMaxTokens * 100;
  if (totalReadPercent >= LARGE_TOOL_RESULT_PERCENT && totalReadTokens >= LARGE_TOOL_RESULT_TOKENS) {
    return;
  }
  if (readPercent >= READ_BLOAT_PERCENT && readTool.resultTokens >= LARGE_TOOL_RESULT_TOKENS) {
    suggestions.push({
      severity: "info",
      title: `\u6587\u4ef6\u8bfb\u53d6\u5360\u7528 ${formatTokens(readTool.resultTokens)} tokens\uff08${readPercent.toFixed(0)}%\uff09`,
      detail: "\u82e5\u91cd\u590d\u8bfb\u6587\u4ef6\uff0c\u53ef\u5f15\u7528\u65e9\u5148\u7684\u8bfb\u53d6\u7ed3\u679c\u3002\u5927\u6587\u4ef6\u8bf7\u7528 offset/limit\u3002",
      savingsTokens: Math.floor(readTool.resultTokens * 0.3)
    });
  }
}
function checkMemoryBloat(data, suggestions) {
  const totalMemoryTokens = data.memoryFiles.reduce((sum, f) => sum + f.tokens, 0);
  const memoryPercent = totalMemoryTokens / data.rawMaxTokens * 100;
  if (memoryPercent >= MEMORY_HIGH_PERCENT && totalMemoryTokens >= MEMORY_HIGH_TOKENS) {
    const largestFiles = [...data.memoryFiles].sort((a, b) => b.tokens - a.tokens).slice(0, 3).map((f) => {
      const name = getDisplayPath(f.path);
      return `${name} (${formatTokens(f.tokens)})`;
    }).join(", ");
    suggestions.push({
      severity: "info",
      title: `\u8bb0\u5fc6\u6587\u4ef6\u5360\u7528 ${formatTokens(totalMemoryTokens)} tokens\uff08${memoryPercent.toFixed(0)}%\uff09`,
      detail: `\u6700\u5927\uff1a${largestFiles}\u3002\u4f7f\u7528 /memory \u67e5\u770b\u5e76\u6e05\u7406\u8fc7\u671f\u6761\u76ee\u3002`,
      savingsTokens: Math.floor(totalMemoryTokens * 0.3)
    });
  }
}
function checkAutoCompactDisabled(data, suggestions) {
  if (!data.isAutoCompactEnabled && data.percentage >= 50 && data.percentage < NEAR_CAPACITY_PERCENT) {
    suggestions.push({
      severity: "info",
      title: "\u5df2\u7981\u7528\u81ea\u52a8\u538b\u7f29",
      detail: "\u672a\u542f\u7528\u81ea\u52a8\u538b\u7f29\u65f6\u4f1a\u89e6\u53bb\u4e0a\u9650\u5e76\u4e22\u5931\u5bf9\u8bdd\u3002\u5728 /config \u4e2d\u542f\u7528\u6216\u624b\u52a8\u8fd0\u884c /compact\u3002"
    });
  }
}
var LARGE_TOOL_RESULT_PERCENT = 15, LARGE_TOOL_RESULT_TOKENS = 1e4, READ_BLOAT_PERCENT = 5, NEAR_CAPACITY_PERCENT = 80, MEMORY_HIGH_PERCENT = 5, MEMORY_HIGH_TOKENS = 5000;
var init_contextSuggestions = __esm(() => {
  init_toolName();
  init_prompt2();
  init_prompt();
  init_prompt3();
  init_file();
  init_format();
});

// src/components/ContextSuggestions.tsx
function ContextSuggestions({ suggestions }) {
  if (suggestions.length === 0)
    return null;
  return /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedBox_default, {
    flexDirection: "column",
    marginTop: 1,
    children: [
      /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
        bold: true,
        children: "\u5efa\u8bae"
      }, undefined, false, undefined, this),
      suggestions.map((suggestion, i) => /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedBox_default, {
        flexDirection: "column",
        marginTop: i === 0 ? 0 : 1,
        children: [
          /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedBox_default, {
            children: [
              /* @__PURE__ */ jsx_dev_runtime.jsxDEV(StatusIcon, {
                status: suggestion.severity,
                withSpace: true
              }, undefined, false, undefined, this),
              /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
                bold: true,
                children: suggestion.title
              }, undefined, false, undefined, this),
              suggestion.savingsTokens ? /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
                dimColor: true,
                children: [
                  " ",
                  figures_default.arrowRight,
                  " \u7ea6\u53ef\u8282\u7701 ~",
                  formatTokens(suggestion.savingsTokens)
                ]
              }, undefined, true, undefined, this) : null
            ]
          }, undefined, true, undefined, this),
          /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedBox_default, {
            marginLeft: 2,
            children: /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
              dimColor: true,
              children: suggestion.detail
            }, undefined, false, undefined, this)
          }, undefined, false, undefined, this)
        ]
      }, i, true, undefined, this))
    ]
  }, undefined, true, undefined, this);
}
var jsx_dev_runtime;
var init_ContextSuggestions = __esm(() => {
  init_figures();
  init_src();
  init_format();
  jsx_dev_runtime = __toESM(require_jsx_dev_runtime(), 1);
});

// src/components/ContextVisualization.tsx
function CollapseStatus() {
  if (true) {
    const { getStats, isContextCollapseEnabled } = (init_contextCollapse(), __toCommonJS(exports_contextCollapse));
    if (!isContextCollapseEnabled())
      return null;
    const s = getStats();
    const { health: h } = s;
    const parts = [];
    if (s.collapsedSpans > 0) {
      parts.push(`${s.collapsedSpans} ${plural(s.collapsedSpans, "span")} summarized (${s.collapsedMessages} msgs)`);
    }
    if (s.stagedSpans > 0)
      parts.push(`${s.stagedSpans} staged`);
    const summary = parts.length > 0 ? parts.join(", ") : h.totalSpawns > 0 ? `${h.totalSpawns} ${plural(h.totalSpawns, "spawn")}, nothing staged yet` : "waiting for first trigger";
    let line2 = null;
    if (h.totalErrors > 0) {
      line2 = /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedText, {
        color: "warning",
        children: [
          "Collapse errors: ",
          h.totalErrors,
          "/",
          h.totalSpawns,
          " spawns failed",
          h.lastError ? ` (last: ${h.lastError.slice(0, 60)})` : ""
        ]
      }, undefined, true, undefined, this);
    } else if (h.emptySpawnWarningEmitted) {
      line2 = /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedText, {
        color: "warning",
        children: [
          "Collapse idle: ",
          h.totalEmptySpawns,
          " consecutive empty runs"
        ]
      }, undefined, true, undefined, this);
    }
    return /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(jsx_dev_runtime2.Fragment, {
      children: [
        /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedText, {
          dimColor: true,
          children: [
            "Context strategy: collapse (",
            summary,
            ")"
          ]
        }, undefined, true, undefined, this),
        line2
      ]
    }, undefined, true, undefined, this);
  }
  return null;
}
function groupBySource(items) {
  const groups = new Map;
  for (const item of items) {
    const key = getSourceDisplayName(item.source);
    const existing = groups.get(key) || [];
    existing.push(item);
    groups.set(key, existing);
  }
  for (const [key, group] of groups.entries()) {
    groups.set(key, group.sort((a, b) => b.tokens - a.tokens));
  }
  const orderedGroups = new Map;
  for (const source of SOURCE_DISPLAY_ORDER) {
    const group = groups.get(source);
    if (group) {
      orderedGroups.set(source, group);
    }
  }
  return orderedGroups;
}
function ContextVisualization({ data }) {
  const {
    categories,
    totalTokens,
    rawMaxTokens,
    percentage,
    gridRows,
    model,
    memoryFiles,
    mcpTools,
    deferredBuiltinTools = [],
    systemTools,
    systemPromptSections,
    agents,
    skills,
    messageBreakdown
  } = data;
  const visibleCategories = categories.filter((cat) => cat.tokens > 0 && cat.name !== "Free space" && cat.name !== RESERVED_CATEGORY_NAME && !cat.isDeferred);
  const hasDeferredMcpTools = categories.some((cat) => cat.isDeferred && cat.name.includes("MCP"));
  const hasDeferredBuiltinTools = deferredBuiltinTools.length > 0;
  const autocompactCategory = categories.find((cat) => cat.name === RESERVED_CATEGORY_NAME);
  return /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedBox_default, {
    flexDirection: "column",
    paddingLeft: 1,
    children: [
      /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedText, {
        bold: true,
        children: "\u4e0a\u4e0b\u6587\u7528\u91cf"
      }, undefined, false, undefined, this),
      /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedBox_default, {
        flexDirection: "row",
        gap: 2,
        children: [
          /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedBox_default, {
            flexDirection: "column",
            flexShrink: 0,
            children: gridRows.map((row, rowIndex) => /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedBox_default, {
              flexDirection: "row",
              marginLeft: -1,
              children: row.map((square, colIndex) => {
                if (square.categoryName === "Free space") {
                  return /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedText, {
                    dimColor: true,
                    children: "\u26F6 "
                  }, colIndex, false, undefined, this);
                }
                if (square.categoryName === RESERVED_CATEGORY_NAME) {
                  return /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedText, {
                    color: square.color,
                    children: "\u26DD "
                  }, colIndex, false, undefined, this);
                }
                return /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedText, {
                  color: square.color,
                  children: square.squareFullness >= 0.7 ? "\u26C1 " : "\u26C0 "
                }, colIndex, false, undefined, this);
              })
            }, rowIndex, false, undefined, this))
          }, undefined, false, undefined, this),
          /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedBox_default, {
            flexDirection: "column",
            gap: 0,
            flexShrink: 0,
            children: [
              /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedText, {
                dimColor: true,
                children: [
                  model,
                  " \xB7 ",
                  formatTokens(totalTokens),
                  "/",
                  formatTokens(rawMaxTokens),
                  " ",
                  "tokens (",
                  percentage,
                  "%)"
                ]
              }, undefined, true, undefined, this),
              /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(CollapseStatus, {}, undefined, false, undefined, this),
              /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedText, {
                children: " "
              }, undefined, false, undefined, this),
              /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedText, {
                dimColor: true,
                italic: true,
                children: "\u6309\u7c7b\u522b\u4f30\u7b97\u7528\u91cf"
              }, undefined, false, undefined, this),
              visibleCategories.map((cat, index) => {
                const tokenDisplay = formatTokens(cat.tokens);
                const percentDisplay = cat.isDeferred ? "N/A" : `${(cat.tokens / rawMaxTokens * 100).toFixed(1)}%`;
                const isReserved = cat.name === RESERVED_CATEGORY_NAME;
                const displayName = cat.name;
                const symbol = cat.isDeferred ? " " : isReserved ? "\u26DD" : "\u26C1";
                return /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedBox_default, {
                  children: [
                    /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedText, {
                      color: cat.color,
                      children: symbol
                    }, undefined, false, undefined, this),
                    /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedText, {
                      children: [
                        " ",
                        displayName,
                        ": "
                      ]
                    }, undefined, true, undefined, this),
                    /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedText, {
                      dimColor: true,
                      children: [
                        tokenDisplay,
                        " tokens (",
                        percentDisplay,
                        ")"
                      ]
                    }, undefined, true, undefined, this)
                  ]
                }, index, true, undefined, this);
              }),
              (categories.find((c) => c.name === "Free space")?.tokens ?? 0) > 0 && /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedBox_default, {
                children: [
                  /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedText, {
                    dimColor: true,
                    children: "\u26F6"
                  }, undefined, false, undefined, this),
                  /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedText, {
                    children: " \u5269\u4f59\u7a7a\u95f4\uff1a "
                  }, undefined, false, undefined, this),
                  /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedText, {
                    dimColor: true,
                    children: [
                      formatTokens(categories.find((c) => c.name === "Free space")?.tokens || 0),
                      " ",
                      "(",
                      ((categories.find((c) => c.name === "Free space")?.tokens || 0) / rawMaxTokens * 100).toFixed(1),
                      "%)"
                    ]
                  }, undefined, true, undefined, this)
                ]
              }, undefined, true, undefined, this),
              autocompactCategory && autocompactCategory.tokens > 0 && /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedBox_default, {
                children: [
                  /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedText, {
                    color: autocompactCategory.color,
                    children: "\u26DD"
                  }, undefined, false, undefined, this),
                  /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedText, {
                    dimColor: true,
                    children: [
                      " ",
                      autocompactCategory.name,
                      ": "
                    ]
                  }, undefined, true, undefined, this),
                  /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedText, {
                    dimColor: true,
                    children: [
                      formatTokens(autocompactCategory.tokens),
                      " tokens (",
                      (autocompactCategory.tokens / rawMaxTokens * 100).toFixed(1),
                      "%)"
                    ]
                  }, undefined, true, undefined, this)
                ]
              }, undefined, true, undefined, this)
            ]
          }, undefined, true, undefined, this)
        ]
      }, undefined, true, undefined, this),
      /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedBox_default, {
        flexDirection: "column",
        marginLeft: -1,
        children: [
          mcpTools.length > 0 && /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedBox_default, {
            flexDirection: "column",
            marginTop: 1,
            children: [
              /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedBox_default, {
                children: [
                  /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedText, {
                    bold: true,
                    children: "MCP \u5de5\u5177"
                  }, undefined, false, undefined, this),
                  /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedText, {
                    dimColor: true,
                    children: [
                      " ",
                      "\xB7 /mcp",
                      hasDeferredMcpTools ? " (\u6309\u9700\u52a0\u8f7d)" : ""
                    ]
                  }, undefined, true, undefined, this)
                ]
              }, undefined, true, undefined, this),
              mcpTools.some((t) => t.isLoaded) && /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedBox_default, {
                flexDirection: "column",
                marginTop: 1,
                children: [
                  /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedText, {
                    dimColor: true,
                    children: "\u5df2\u52a0\u8f7d"
                  }, undefined, false, undefined, this),
                  mcpTools.filter((t) => t.isLoaded).map((tool, i) => /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedBox_default, {
                    children: [
                      /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedText, {
                        children: [
                          "\u2514 ",
                          tool.name,
                          ": "
                        ]
                      }, undefined, true, undefined, this),
                      /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedText, {
                        dimColor: true,
                        children: [
                          formatTokens(tool.tokens),
                          " tokens"
                        ]
                      }, undefined, true, undefined, this)
                    ]
                  }, i, true, undefined, this))
                ]
              }, undefined, true, undefined, this),
              hasDeferredMcpTools && mcpTools.some((t) => !t.isLoaded) && /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedBox_default, {
                flexDirection: "column",
                marginTop: 1,
                children: [
                  /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedText, {
                    dimColor: true,
                    children: "\u53ef\u7528"
                  }, undefined, false, undefined, this),
                  mcpTools.filter((t) => !t.isLoaded).map((tool, i) => /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedBox_default, {
                    children: /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedText, {
                      dimColor: true,
                      children: [
                        "\u2514 ",
                        tool.name
                      ]
                    }, undefined, true, undefined, this)
                  }, i, false, undefined, this))
                ]
              }, undefined, true, undefined, this),
              !hasDeferredMcpTools && mcpTools.map((tool, i) => /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedBox_default, {
                children: [
                  /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedText, {
                    children: [
                      "\u2514 ",
                      tool.name,
                      ": "
                    ]
                  }, undefined, true, undefined, this),
                  /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedText, {
                    dimColor: true,
                    children: [
                      formatTokens(tool.tokens),
                      " tokens"
                    ]
                  }, undefined, true, undefined, this)
                ]
              }, i, true, undefined, this))
            ]
          }, undefined, true, undefined, this),
          (systemTools && systemTools.length > 0 || hasDeferredBuiltinTools) && process.env.USER_TYPE === "ant" && /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedBox_default, {
            flexDirection: "column",
            marginTop: 1,
            children: [
              /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedBox_default, {
                children: [
                  /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedText, {
                    bold: true,
                    children: "[ANT-ONLY] System tools"
                  }, undefined, false, undefined, this),
                  hasDeferredBuiltinTools && /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedText, {
                    dimColor: true,
                    children: " (some loaded on-demand)"
                  }, undefined, false, undefined, this)
                ]
              }, undefined, true, undefined, this),
              /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedBox_default, {
                flexDirection: "column",
                marginTop: 1,
                children: [
                  /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedText, {
                    dimColor: true,
                    children: "\u5df2\u52a0\u8f7d"
                  }, undefined, false, undefined, this),
                  systemTools?.map((tool, i) => /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedBox_default, {
                    children: [
                      /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedText, {
                        children: [
                          "\u2514 ",
                          tool.name,
                          ": "
                        ]
                      }, undefined, true, undefined, this),
                      /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedText, {
                        dimColor: true,
                        children: [
                          formatTokens(tool.tokens),
                          " tokens"
                        ]
                      }, undefined, true, undefined, this)
                    ]
                  }, `sys-${i}`, true, undefined, this)),
                  deferredBuiltinTools.filter((t) => t.isLoaded).map((tool, i) => /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedBox_default, {
                    children: [
                      /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedText, {
                        children: [
                          "\u2514 ",
                          tool.name,
                          ": "
                        ]
                      }, undefined, true, undefined, this),
                      /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedText, {
                        dimColor: true,
                        children: [
                          formatTokens(tool.tokens),
                          " tokens"
                        ]
                      }, undefined, true, undefined, this)
                    ]
                  }, `def-${i}`, true, undefined, this))
                ]
              }, undefined, true, undefined, this),
              hasDeferredBuiltinTools && deferredBuiltinTools.some((t) => !t.isLoaded) && /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedBox_default, {
                flexDirection: "column",
                marginTop: 1,
                children: [
                  /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedText, {
                    dimColor: true,
                    children: "\u53ef\u7528"
                  }, undefined, false, undefined, this),
                  deferredBuiltinTools.filter((t) => !t.isLoaded).map((tool, i) => /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedBox_default, {
                    children: /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedText, {
                      dimColor: true,
                      children: [
                        "\u2514 ",
                        tool.name
                      ]
                    }, undefined, true, undefined, this)
                  }, i, false, undefined, this))
                ]
              }, undefined, true, undefined, this)
            ]
          }, undefined, true, undefined, this),
          systemPromptSections && systemPromptSections.length > 0 && process.env.USER_TYPE === "ant" && /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedBox_default, {
            flexDirection: "column",
            marginTop: 1,
            children: [
              /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedText, {
                bold: true,
                children: "[ANT-ONLY] System prompt sections"
              }, undefined, false, undefined, this),
              systemPromptSections.map((section, i) => /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedBox_default, {
                children: [
                  /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedText, {
                    children: [
                      "\u2514 ",
                      section.name,
                      ": "
                    ]
                  }, undefined, true, undefined, this),
                  /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedText, {
                    dimColor: true,
                    children: [
                      formatTokens(section.tokens),
                      " tokens"
                    ]
                  }, undefined, true, undefined, this)
                ]
              }, i, true, undefined, this))
            ]
          }, undefined, true, undefined, this),
          agents.length > 0 && /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedBox_default, {
            flexDirection: "column",
            marginTop: 1,
            children: [
              /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedBox_default, {
                children: [
                  /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedText, {
                    bold: true,
                    children: "\u81ea\u5b9a\u4e49 agent"
                  }, undefined, false, undefined, this),
                  /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedText, {
                    dimColor: true,
                    children: " \xB7 /agents"
                  }, undefined, false, undefined, this)
                ]
              }, undefined, true, undefined, this),
              Array.from(groupBySource(agents).entries()).map(([sourceDisplay, sourceAgents]) => /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedBox_default, {
                flexDirection: "column",
                marginTop: 1,
                children: [
                  /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedText, {
                    dimColor: true,
                    children: sourceDisplay
                  }, undefined, false, undefined, this),
                  sourceAgents.map((agent, i) => /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedBox_default, {
                    children: [
                      /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedText, {
                        children: [
                          "\u2514 ",
                          agent.agentType,
                          ": "
                        ]
                      }, undefined, true, undefined, this),
                      /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedText, {
                        dimColor: true,
                        children: [
                          formatTokens(agent.tokens),
                          " tokens"
                        ]
                      }, undefined, true, undefined, this)
                    ]
                  }, i, true, undefined, this))
                ]
              }, sourceDisplay, true, undefined, this))
            ]
          }, undefined, true, undefined, this),
          memoryFiles.length > 0 && /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedBox_default, {
            flexDirection: "column",
            marginTop: 1,
            children: [
              /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedBox_default, {
                children: [
                  /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedText, {
                    bold: true,
                    children: "\u8bb0\u5fc6\u6587\u4ef6"
                  }, undefined, false, undefined, this),
                  /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedText, {
                    dimColor: true,
                    children: " \xB7 /memory"
                  }, undefined, false, undefined, this)
                ]
              }, undefined, true, undefined, this),
              memoryFiles.map((file, i) => /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedBox_default, {
                children: [
                  /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedText, {
                    children: [
                      "\u2514 ",
                      getDisplayPath(file.path),
                      ": "
                    ]
                  }, undefined, true, undefined, this),
                  /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedText, {
                    dimColor: true,
                    children: [
                      formatTokens(file.tokens),
                      " tokens"
                    ]
                  }, undefined, true, undefined, this)
                ]
              }, i, true, undefined, this))
            ]
          }, undefined, true, undefined, this),
          skills && skills.tokens > 0 && /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedBox_default, {
            flexDirection: "column",
            marginTop: 1,
            children: [
              /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedBox_default, {
                children: [
                  /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedText, {
                    bold: true,
                    children: "\u6280\u80fd"
                  }, undefined, false, undefined, this),
                  /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedText, {
                    dimColor: true,
                    children: " \xB7 /skills"
                  }, undefined, false, undefined, this)
                ]
              }, undefined, true, undefined, this),
              Array.from(groupBySource(skills.skillFrontmatter).entries()).map(([sourceDisplay, sourceSkills]) => /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedBox_default, {
                flexDirection: "column",
                marginTop: 1,
                children: [
                  /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedText, {
                    dimColor: true,
                    children: sourceDisplay
                  }, undefined, false, undefined, this),
                  sourceSkills.map((skill, i) => /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedBox_default, {
                    children: [
                      /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedText, {
                        children: [
                          "\u2514 ",
                          skill.name,
                          ": "
                        ]
                      }, undefined, true, undefined, this),
                      /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedText, {
                        dimColor: true,
                        children: [
                          formatTokens(skill.tokens),
                          " tokens"
                        ]
                      }, undefined, true, undefined, this)
                    ]
                  }, i, true, undefined, this))
                ]
              }, sourceDisplay, true, undefined, this))
            ]
          }, undefined, true, undefined, this),
          messageBreakdown && process.env.USER_TYPE === "ant" && /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedBox_default, {
            flexDirection: "column",
            marginTop: 1,
            children: [
              /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedText, {
                bold: true,
                children: "[ANT-ONLY] Message breakdown"
              }, undefined, false, undefined, this),
              /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedBox_default, {
                flexDirection: "column",
                marginLeft: 1,
                children: [
                  /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedBox_default, {
                    children: [
                      /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedText, {
                        children: "\u5de5\u5177\u8c03\u7528\uff1a "
                      }, undefined, false, undefined, this),
                      /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedText, {
                        dimColor: true,
                        children: [
                          formatTokens(messageBreakdown.toolCallTokens),
                          " tokens"
                        ]
                      }, undefined, true, undefined, this)
                    ]
                  }, undefined, true, undefined, this),
                  /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedBox_default, {
                    children: [
                      /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedText, {
                        children: "\u5de5\u5177\u7ed3\u679c\uff1a "
                      }, undefined, false, undefined, this),
                      /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedText, {
                        dimColor: true,
                        children: [
                          formatTokens(messageBreakdown.toolResultTokens),
                          " tokens"
                        ]
                      }, undefined, true, undefined, this)
                    ]
                  }, undefined, true, undefined, this),
                  /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedBox_default, {
                    children: [
                      /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedText, {
                        children: "\u9644\u4ef6\uff1a "
                      }, undefined, false, undefined, this),
                      /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedText, {
                        dimColor: true,
                        children: [
                          formatTokens(messageBreakdown.attachmentTokens),
                          " tokens"
                        ]
                      }, undefined, true, undefined, this)
                    ]
                  }, undefined, true, undefined, this),
                  /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedBox_default, {
                    children: [
                      /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedText, {
                        children: "\u52a9\u624b\u6d88\u606f\uff08\u975e\u5de5\u5177\uff09\uff1a "
                      }, undefined, false, undefined, this),
                      /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedText, {
                        dimColor: true,
                        children: [
                          formatTokens(messageBreakdown.assistantMessageTokens),
                          " tokens"
                        ]
                      }, undefined, true, undefined, this)
                    ]
                  }, undefined, true, undefined, this),
                  /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedBox_default, {
                    children: [
                      /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedText, {
                        children: "\u7528\u6237\u6d88\u606f\uff08\u975e\u5de5\u5177\u7ed3\u679c\uff09\uff1a "
                      }, undefined, false, undefined, this),
                      /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedText, {
                        dimColor: true,
                        children: [
                          formatTokens(messageBreakdown.userMessageTokens),
                          " tokens"
                        ]
                      }, undefined, true, undefined, this)
                    ]
                  }, undefined, true, undefined, this)
                ]
              }, undefined, true, undefined, this),
              messageBreakdown.toolCallsByType.length > 0 && /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedBox_default, {
                flexDirection: "column",
                marginTop: 1,
                children: [
                  /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedText, {
                    bold: true,
                    children: "[ANT-ONLY] Top tools"
                  }, undefined, false, undefined, this),
                  messageBreakdown.toolCallsByType.slice(0, 5).map((tool, i) => /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedBox_default, {
                    marginLeft: 1,
                    children: [
                      /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedText, {
                        children: [
                          "\u2514 ",
                          tool.name,
                          ": "
                        ]
                      }, undefined, true, undefined, this),
                      /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedText, {
                        dimColor: true,
                        children: [
                          "calls ",
                          formatTokens(tool.callTokens),
                          ", results",
                          " ",
                          formatTokens(tool.resultTokens)
                        ]
                      }, undefined, true, undefined, this)
                    ]
                  }, i, true, undefined, this))
                ]
              }, undefined, true, undefined, this),
              messageBreakdown.attachmentsByType.length > 0 && /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedBox_default, {
                flexDirection: "column",
                marginTop: 1,
                children: [
                  /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedText, {
                    bold: true,
                    children: "[ANT-ONLY] Top attachments"
                  }, undefined, false, undefined, this),
                  messageBreakdown.attachmentsByType.slice(0, 5).map((attachment, i) => /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedBox_default, {
                    marginLeft: 1,
                    children: [
                      /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedText, {
                        children: [
                          "\u2514 ",
                          attachment.name,
                          ": "
                        ]
                      }, undefined, true, undefined, this),
                      /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedText, {
                        dimColor: true,
                        children: [
                          formatTokens(attachment.tokens),
                          " tokens"
                        ]
                      }, undefined, true, undefined, this)
                    ]
                  }, i, true, undefined, this))
                ]
              }, undefined, true, undefined, this)
            ]
          }, undefined, true, undefined, this)
        ]
      }, undefined, true, undefined, this),
      /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ContextSuggestions, {
        suggestions: generateContextSuggestions(data)
      }, undefined, false, undefined, this)
    ]
  }, undefined, true, undefined, this);
}
var jsx_dev_runtime2, RESERVED_CATEGORY_NAME = "Autocompact buffer", SOURCE_DISPLAY_ORDER;
var init_ContextVisualization = __esm(() => {
  init_src();
  init_contextSuggestions();
  init_file();
  init_format();
  init_constants();
  init_stringUtils();
  init_ContextSuggestions();
  jsx_dev_runtime2 = __toESM(require_jsx_dev_runtime(), 1);
  SOURCE_DISPLAY_ORDER = [
    "Project",
    "User",
    "Managed",
    "Plugin",
    "Built-in"
  ];
});

// src/commands/context/context.tsx
function toApiView(messages) {
  let view = getMessagesAfterCompactBoundary(messages);
  if (true) {
    const { projectView } = (init_operations(), __toCommonJS(exports_operations));
    view = projectView(view);
  }
  return view;
}
async function call(onDone, context) {
  const {
    messages,
    getAppState,
    options: { mainLoopModel, tools }
  } = context;
  const apiView = toApiView(messages);
  const { messages: compactedMessages } = await microcompactMessages(apiView);
  const terminalWidth = process.stdout.columns || 80;
  const appState = getAppState();
  const data = await analyzeContextUsage(compactedMessages, mainLoopModel, async () => appState.toolPermissionContext, tools, appState.agentDefinitions, terminalWidth, context, undefined, apiView);
  const output = await renderToAnsiString(/* @__PURE__ */ jsx_dev_runtime3.jsxDEV(ContextVisualization, {
    data
  }, undefined, false, undefined, this));
  onDone(output);
  return null;
}
var jsx_dev_runtime3;
var init_context = __esm(() => {
  init_ContextVisualization();
  init_microCompact();
  init_analyzeContext();
  init_messages();
  init_staticRender();
  jsx_dev_runtime3 = __toESM(require_jsx_dev_runtime(), 1);
});
init_context();

export {
  call
};
