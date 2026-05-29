// @bun
import {
  ValidationErrorsList,
  init_ValidationErrorsList
} from "./chunk-n3r4xfn4.js";
import {
  init_useSettingsErrors,
  useSettingsErrors
} from "./chunk-ehpbetth.js";
import {
  PressEnterToContinue,
  init_PressEnterToContinue
} from "./chunk-1rm0z4ed.js";
import {
  detectUnreachableRules,
  init_shadowedRuleDetection
} from "./chunk-ncm7gsqk.js";
import {
  AGENT_DESCRIPTIONS_THRESHOLD,
  getAgentDescriptionsTotalTokens,
  init_statusNoticeHelpers
} from "./chunk-2050qptx.js";
import {
  McpParsingWarnings,
  init_McpParsingWarnings
} from "./chunk-2qpd89zj.js";
import {
  BASH_MAX_OUTPUT_DEFAULT,
  BASH_MAX_OUTPUT_UPPER_LIMIT,
  MAX_MEMORY_CHARACTER_COUNT,
  SandboxManager,
  TASK_MAX_OUTPUT_DEFAULT,
  TASK_MAX_OUTPUT_UPPER_LIMIT,
  cleanupStaleLocks,
  countMcpToolTokens,
  getAllLockInfo,
  getCachedKeybindingWarnings,
  getDoctorDiagnostic,
  getGcsDistTags,
  getKeybindingsPath,
  getLargeMemoryFiles,
  getMemoryFiles,
  getNpmDistTags,
  getPluginErrorMessage,
  init_AppState,
  init_analyzeContext,
  init_autoUpdater,
  init_claudemd,
  init_doctorDiagnostic,
  init_envValidation,
  init_loadUserBindings,
  init_outputFormatting,
  init_outputLimits,
  init_pidLock,
  init_plugin,
  init_sandbox_adapter,
  init_tokenEstimation,
  isKeybindingCustomizationEnabled,
  isPidBasedLockingEnabled,
  roughTokenCountEstimation,
  useAppState,
  validateBoundedIntEnvVar
} from "./chunk-xg5k46jr.js";
import {
  getXDGStateHome,
  init_xdg
} from "./chunk-et824jj8.js";
import {
  init_useExitOnCtrlCDWithKeybindings,
  useExitOnCtrlCDWithKeybindings
} from "./chunk-w7xjra5m.js";
import {
  init_useKeybinding
} from "./chunk-s2x040y6.js";
import {
  getInitialSettings,
  getMainLoopModel,
  getModelMaxOutputTokens,
  init_context,
  init_file,
  init_model,
  init_permissionRuleParser,
  init_settings1 as init_settings,
  init_stringUtils,
  pathExists,
  permissionRuleValueToString,
  plural
} from "./chunk-mk2vzd2n.js";
import {
  Pane,
  ThemedBox_default,
  ThemedText,
  init_src,
  useKeybindings
} from "./chunk-z9bw4q7j.js";
import {
  require_jsx_dev_runtime,
  require_react
} from "./chunk-evwb3c85.js";
import {
  figures_default,
  init_figures
} from "./chunk-qajrkk97.js";
import {
  getOriginalCwd,
  init_state
} from "./chunk-gzp6rza1.js";
import {
  getClaudeConfigHomeDir,
  init_envUtils
} from "./chunk-hxhwzgnn.js";
import {
  __esm,
  __toESM
} from "./chunk-qp2qdcda.js";

// src/components/KeybindingWarnings.tsx
function KeybindingWarnings() {
  if (!isKeybindingCustomizationEnabled()) {
    return null;
  }
  const warnings = getCachedKeybindingWarnings();
  if (warnings.length === 0) {
    return null;
  }
  const errors = warnings.filter((w) => w.severity === "error");
  const warns = warnings.filter((w) => w.severity === "warning");
  return /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedBox_default, {
    flexDirection: "column",
    marginTop: 1,
    marginBottom: 1,
    children: [
      /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
        bold: true,
        color: errors.length > 0 ? "error" : "warning",
        children: "\u5feb\u6377\u952e\u914d\u7f6e\u95ee\u9898"
      }, undefined, false, undefined, this),
      /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedBox_default, {
        children: [
          /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
            dimColor: true,
            children: "\u4f4d\u7f6e\uff1a "
          }, undefined, false, undefined, this),
          /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
            dimColor: true,
            children: getKeybindingsPath()
          }, undefined, false, undefined, this)
        ]
      }, undefined, true, undefined, this),
      /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedBox_default, {
        marginLeft: 1,
        flexDirection: "column",
        marginTop: 1,
        children: [
          errors.map((error, i) => /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedBox_default, {
            flexDirection: "column",
            children: [
              /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedBox_default, {
                children: [
                  /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
                    dimColor: true,
                    children: "\u2514 "
                  }, undefined, false, undefined, this),
                  /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
                    color: "error",
                    children: "[\u9519\u8bef]"
                  }, undefined, false, undefined, this),
                  /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
                    dimColor: true,
                    children: [
                      " ",
                      error.message
                    ]
                  }, undefined, true, undefined, this)
                ]
              }, undefined, true, undefined, this),
              error.suggestion && /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedBox_default, {
                marginLeft: 3,
                children: /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
                  dimColor: true,
                  children: [
                    "\u2192 ",
                    error.suggestion
                  ]
                }, undefined, true, undefined, this)
              }, undefined, false, undefined, this)
            ]
          }, `error-${i}`, true, undefined, this)),
          warns.map((warning, i) => /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedBox_default, {
            flexDirection: "column",
            children: [
              /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedBox_default, {
                children: [
                  /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
                    dimColor: true,
                    children: "\u2514 "
                  }, undefined, false, undefined, this),
                  /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
                    color: "warning",
                    children: "[\u8b66\u544a]"
                  }, undefined, false, undefined, this),
                  /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
                    dimColor: true,
                    children: [
                      " ",
                      warning.message
                    ]
                  }, undefined, true, undefined, this)
                ]
              }, undefined, true, undefined, this),
              warning.suggestion && /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedBox_default, {
                marginLeft: 3,
                children: /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
                  dimColor: true,
                  children: [
                    "\u2192 ",
                    warning.suggestion
                  ]
                }, undefined, true, undefined, this)
              }, undefined, false, undefined, this)
            ]
          }, `warning-${i}`, true, undefined, this))
        ]
      }, undefined, true, undefined, this)
    ]
  }, undefined, true, undefined, this);
}
var jsx_dev_runtime;
var init_KeybindingWarnings = __esm(() => {
  init_src();
  init_loadUserBindings();
  jsx_dev_runtime = __toESM(require_jsx_dev_runtime(), 1);
});

// src/components/sandbox/SandboxDoctorSection.tsx
function SandboxDoctorSection() {
  if (!SandboxManager.isSupportedPlatform()) {
    return null;
  }
  if (!SandboxManager.isSandboxEnabledInSettings()) {
    return null;
  }
  const depCheck = SandboxManager.checkDependencies();
  const hasErrors = depCheck.errors.length > 0;
  const hasWarnings = depCheck.warnings.length > 0;
  if (!hasErrors && !hasWarnings) {
    return null;
  }
  const statusColor = hasErrors ? "error" : "warning";
  const statusText = hasErrors ? "\u7f3a\u5c11\u4f9d\u8d56" : "\u53ef\u7528\uff08\u6709\u8b66\u544a\uff09";
  return /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedBox_default, {
    flexDirection: "column",
    children: [
      /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedText, {
        bold: true,
        children: "\u6c99\u7bb1"
      }, undefined, false, undefined, this),
      /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedText, {
        children: [
          "\u2514 \u72b6\u6001\uff1a ",
          /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedText, {
            color: statusColor,
            children: statusText
          }, undefined, false, undefined, this)
        ]
      }, undefined, true, undefined, this),
      depCheck.errors.map((e, i) => /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedText, {
        color: "error",
        children: [
          "\u2514 ",
          e
        ]
      }, i, true, undefined, this)),
      depCheck.warnings.map((w, i) => /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedText, {
        color: "warning",
        children: [
          "\u2514 ",
          w
        ]
      }, i, true, undefined, this)),
      hasErrors && /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedText, {
        dimColor: true,
        children: "\u2514 \u8fd0\u884c /sandbox \u67e5\u770b\u5b89\u88c5\u8bf4\u660e"
      }, undefined, false, undefined, this)
    ]
  }, undefined, true, undefined, this);
}
var jsx_dev_runtime2;
var init_SandboxDoctorSection = __esm(() => {
  init_src();
  init_sandbox_adapter();
  jsx_dev_runtime2 = __toESM(require_jsx_dev_runtime(), 1);
});

// src/utils/doctorContextWarnings.ts
async function checkClaudeMdFiles() {
  const largeFiles = getLargeMemoryFiles(await getMemoryFiles());
  if (largeFiles.length === 0) {
    return null;
  }
  const details = largeFiles.sort((a, b) => b.content.length - a.content.length).map((file) => `${file.path}: ${file.content.length.toLocaleString()} chars`);
  const message = largeFiles.length === 1 ? `\u68c0\u6d4b\u5230\u5927\u578b CLAUDE.md \u6587\u4ef6\uff08${largeFiles[0].content.length.toLocaleString()} \u5b57\u7b26 > ${MAX_MEMORY_CHARACTER_COUNT.toLocaleString()}\uff09` : `\u68c0\u6d4b\u5230 ${largeFiles.length} \u4e2a\u5927\u578b CLAUDE.md \u6587\u4ef6\uff08\u6bcf\u4e2a > ${MAX_MEMORY_CHARACTER_COUNT.toLocaleString()} \u5b57\u7b26\uff09`;
  return {
    type: "claudemd_files",
    severity: "warning",
    message,
    details,
    currentValue: largeFiles.length,
    threshold: MAX_MEMORY_CHARACTER_COUNT
  };
}
async function checkAgentDescriptions(agentInfo) {
  if (!agentInfo) {
    return null;
  }
  const totalTokens = getAgentDescriptionsTotalTokens(agentInfo);
  if (totalTokens <= AGENT_DESCRIPTIONS_THRESHOLD) {
    return null;
  }
  const agentTokens = agentInfo.activeAgents.filter((a) => a.source !== "built-in").map((agent) => {
    const description = `${agent.agentType}: ${agent.whenToUse}`;
    return {
      name: agent.agentType,
      tokens: roughTokenCountEstimation(description)
    };
  }).sort((a, b) => b.tokens - a.tokens);
  const details = agentTokens.slice(0, 5).map((agent) => `${agent.name}: ~${agent.tokens.toLocaleString()} tokens`);
  if (agentTokens.length > 5) {
    details.push(`\uff08\u8fd8\u6709 ${agentTokens.length - 5} \u4e2a\u81ea\u5b9a\u4e49 agent\uff09`);
  }
  return {
    type: "agent_descriptions",
    severity: "warning",
    message: `agent \u63cf\u8ff0\u8fc7\u5927\uff08~${totalTokens.toLocaleString()} tokens > ${AGENT_DESCRIPTIONS_THRESHOLD.toLocaleString()}\uff09`,
    details,
    currentValue: totalTokens,
    threshold: AGENT_DESCRIPTIONS_THRESHOLD
  };
}
async function checkMcpTools(tools, getToolPermissionContext, agentInfo) {
  const mcpTools = tools.filter((tool) => tool.isMcp);
  if (mcpTools.length === 0) {
    return null;
  }
  try {
    const model = getMainLoopModel();
    const { mcpToolTokens, mcpToolDetails } = await countMcpToolTokens(tools, getToolPermissionContext, agentInfo, model);
    if (mcpToolTokens <= MCP_TOOLS_THRESHOLD) {
      return null;
    }
    const toolsByServer = new Map;
    for (const tool of mcpToolDetails) {
      const parts = tool.name.split("__");
      const serverName = parts[1] || "unknown";
      const current = toolsByServer.get(serverName) || { count: 0, tokens: 0 };
      toolsByServer.set(serverName, {
        count: current.count + 1,
        tokens: current.tokens + tool.tokens
      });
    }
    const sortedServers = Array.from(toolsByServer.entries()).sort((a, b) => b[1].tokens - a[1].tokens);
    const details = sortedServers.slice(0, 5).map(([name, info]) => `${name}: ${info.count} tools (~${info.tokens.toLocaleString()} tokens)`);
    if (sortedServers.length > 5) {
      details.push(`\uff08\u8fd8\u6709 ${sortedServers.length - 5} \u4e2a\u670d\u52a1\u5668\uff09`);
    }
    return {
      type: "mcp_tools",
      severity: "warning",
      message: `MCP \u5de5\u5177\u4e0a\u4e0b\u6587\u8fc7\u5927\uff08~${mcpToolTokens.toLocaleString()} tokens > ${MCP_TOOLS_THRESHOLD.toLocaleString()}\uff09`,
      details,
      currentValue: mcpToolTokens,
      threshold: MCP_TOOLS_THRESHOLD
    };
  } catch (_error) {
    const estimatedTokens = mcpTools.reduce((total, tool) => {
      const chars = (tool.name?.length || 0) + tool.description.length;
      return total + roughTokenCountEstimation(chars.toString());
    }, 0);
    if (estimatedTokens <= MCP_TOOLS_THRESHOLD) {
      return null;
    }
    return {
      type: "mcp_tools",
      severity: "warning",
      message: `MCP \u5de5\u5177\u4e0a\u4e0b\u6587\u8fc7\u5927\uff08~${estimatedTokens.toLocaleString()} tokens \u4f30\u7b97 > ${MCP_TOOLS_THRESHOLD.toLocaleString()}\uff09`,
      details: [
        `${mcpTools.length} MCP tools detected (token count estimated)`
      ],
      currentValue: estimatedTokens,
      threshold: MCP_TOOLS_THRESHOLD
    };
  }
}
async function checkUnreachableRules(getToolPermissionContext) {
  const context = await getToolPermissionContext();
  const sandboxAutoAllowEnabled = SandboxManager.isSandboxingEnabled() && SandboxManager.isAutoAllowBashIfSandboxedEnabled();
  const unreachable = detectUnreachableRules(context, {
    sandboxAutoAllowEnabled
  });
  if (unreachable.length === 0) {
    return null;
  }
  const details = unreachable.flatMap((r) => [
    `${permissionRuleValueToString(r.rule.ruleValue)}: ${r.reason}`,
    `  Fix: ${r.fix}`
  ]);
  return {
    type: "unreachable_rules",
    severity: "warning",
    message: `\u68c0\u6d4b\u5230 ${unreachable.length} ${plural(unreachable.length, "\u4e0d\u53ef\u8fbe\u6743\u9650\u89c4\u5219")}`,
    details,
    currentValue: unreachable.length,
    threshold: 0
  };
}
async function checkContextWarnings(tools, agentInfo, getToolPermissionContext) {
  const [claudeMdWarning, agentWarning, mcpWarning, unreachableRulesWarning] = await Promise.all([
    checkClaudeMdFiles(),
    checkAgentDescriptions(agentInfo),
    checkMcpTools(tools, getToolPermissionContext, agentInfo),
    checkUnreachableRules(getToolPermissionContext)
  ]);
  return {
    claudeMdWarning,
    agentWarning,
    mcpWarning,
    unreachableRulesWarning
  };
}
var MCP_TOOLS_THRESHOLD = 25000;
var init_doctorContextWarnings = __esm(() => {
  init_tokenEstimation();
  init_analyzeContext();
  init_claudemd();
  init_model();
  init_permissionRuleParser();
  init_shadowedRuleDetection();
  init_sandbox_adapter();
  init_statusNoticeHelpers();
  init_stringUtils();
});

// src/screens/Doctor.tsx
import { join } from "path";
function DistTagsDisplay({
  promise
}) {
  const distTags = import_react.use(promise);
  if (!distTags.latest) {
    return /* @__PURE__ */ jsx_dev_runtime3.jsxDEV(ThemedText, {
      dimColor: true,
      children: "\u2514 Failed to fetch versions"
    }, undefined, false, undefined, this);
  }
  return /* @__PURE__ */ jsx_dev_runtime3.jsxDEV(jsx_dev_runtime3.Fragment, {
    children: [
      distTags.stable && /* @__PURE__ */ jsx_dev_runtime3.jsxDEV(ThemedText, {
        children: [
          "\u2514 Stable version: ",
          distTags.stable
        ]
      }, undefined, true, undefined, this),
      /* @__PURE__ */ jsx_dev_runtime3.jsxDEV(ThemedText, {
        children: [
          "\u2514 Latest version: ",
          distTags.latest
        ]
      }, undefined, true, undefined, this)
    ]
  }, undefined, true, undefined, this);
}
function Doctor({ onDone }) {
  const agentDefinitions = useAppState((s) => s.agentDefinitions);
  const mcpTools = useAppState((s) => s.mcp.tools);
  const toolPermissionContext = useAppState((s) => s.toolPermissionContext);
  const pluginsErrors = useAppState((s) => s.plugins.errors);
  useExitOnCtrlCDWithKeybindings();
  const tools = import_react.useMemo(() => {
    return mcpTools || [];
  }, [mcpTools]);
  const [diagnostic, setDiagnostic] = import_react.useState(null);
  const [agentInfo, setAgentInfo] = import_react.useState(null);
  const [contextWarnings, setContextWarnings] = import_react.useState(null);
  const [versionLockInfo, setVersionLockInfo] = import_react.useState(null);
  const validationErrors = useSettingsErrors();
  const distTagsPromise = import_react.useMemo(() => getDoctorDiagnostic().then((diag) => {
    const fetchDistTags = diag.installationType === "native" ? getGcsDistTags : getNpmDistTags;
    return fetchDistTags().catch(() => ({ latest: null, stable: null }));
  }), []);
  const autoUpdatesChannel = getInitialSettings()?.autoUpdatesChannel ?? "latest";
  const errorsExcludingMcp = validationErrors.filter((error) => error.mcpErrorMetadata === undefined);
  const envValidationErrors = import_react.useMemo(() => {
    const envVars = [
      {
        name: "BASH_MAX_OUTPUT_LENGTH",
        default: BASH_MAX_OUTPUT_DEFAULT,
        upperLimit: BASH_MAX_OUTPUT_UPPER_LIMIT
      },
      {
        name: "TASK_MAX_OUTPUT_LENGTH",
        default: TASK_MAX_OUTPUT_DEFAULT,
        upperLimit: TASK_MAX_OUTPUT_UPPER_LIMIT
      },
      {
        name: "CLAUDE_CODE_MAX_OUTPUT_TOKENS",
        ...getModelMaxOutputTokens("claude-opus-4-6")
      }
    ];
    return envVars.map((v) => {
      const value = process.env[v.name];
      const result = validateBoundedIntEnvVar(v.name, value, v.default, v.upperLimit);
      return { name: v.name, ...result };
    }).filter((v) => v.status !== "valid");
  }, []);
  import_react.useEffect(() => {
    getDoctorDiagnostic().then(setDiagnostic);
    (async () => {
      const userAgentsDir = join(getClaudeConfigHomeDir(), "agents");
      const projectAgentsDir = join(getOriginalCwd(), ".claude", "agents");
      const { activeAgents, allAgents, failedFiles } = agentDefinitions;
      const [userDirExists, projectDirExists] = await Promise.all([
        pathExists(userAgentsDir),
        pathExists(projectAgentsDir)
      ]);
      const agentInfoData = {
        activeAgents: activeAgents.map((a) => ({
          agentType: a.agentType,
          source: a.source
        })),
        userAgentsDir,
        projectAgentsDir,
        userDirExists,
        projectDirExists,
        failedFiles
      };
      setAgentInfo(agentInfoData);
      const warnings = await checkContextWarnings(tools, {
        activeAgents,
        allAgents,
        failedFiles
      }, async () => toolPermissionContext);
      setContextWarnings(warnings);
      if (isPidBasedLockingEnabled()) {
        const locksDir = join(getXDGStateHome(), "claude", "locks");
        const staleLocksCleaned = cleanupStaleLocks(locksDir);
        const locks = getAllLockInfo(locksDir);
        setVersionLockInfo({
          enabled: true,
          locks,
          locksDir,
          staleLocksCleaned
        });
      } else {
        setVersionLockInfo({
          enabled: false,
          locks: [],
          locksDir: "",
          staleLocksCleaned: 0
        });
      }
    })();
  }, [toolPermissionContext, tools, agentDefinitions]);
  const handleDismiss = import_react.useCallback(() => {
    onDone("\u5df2\u5173\u95ed Claude Code \u8bca\u65ad", { display: "system" });
  }, [onDone]);
  useKeybindings({
    "confirm:yes": handleDismiss,
    "confirm:no": handleDismiss
  }, { context: "Confirmation" });
  if (!diagnostic) {
    return /* @__PURE__ */ jsx_dev_runtime3.jsxDEV(Pane, {
      children: /* @__PURE__ */ jsx_dev_runtime3.jsxDEV(ThemedText, {
        dimColor: true,
        children: "\u6b63\u5728\u68c0\u67e5\u5b89\u88c5\u72b6\u6001\u2026"
      }, undefined, false, undefined, this)
    }, undefined, false, undefined, this);
  }
  return /* @__PURE__ */ jsx_dev_runtime3.jsxDEV(Pane, {
    children: [
      /* @__PURE__ */ jsx_dev_runtime3.jsxDEV(ThemedBox_default, {
        flexDirection: "column",
        children: [
          /* @__PURE__ */ jsx_dev_runtime3.jsxDEV(ThemedText, {
            bold: true,
            children: "\u8bca\u65ad"
          }, undefined, false, undefined, this),
          /* @__PURE__ */ jsx_dev_runtime3.jsxDEV(ThemedText, {
            children: [
              "\u2514 \u5f53\u524d\u8fd0\u884c\uff1a ",
              diagnostic.installationType,
              " (",
              diagnostic.version,
              ")"
            ]
          }, undefined, true, undefined, this),
          diagnostic.packageManager && /* @__PURE__ */ jsx_dev_runtime3.jsxDEV(ThemedText, {
            children: [
              "\u2514 \u5305\u7ba1\u7406\u5668\uff1a ",
              diagnostic.packageManager
            ]
          }, undefined, true, undefined, this),
          /* @__PURE__ */ jsx_dev_runtime3.jsxDEV(ThemedText, {
            children: [
              "\u2514 \u8def\u5f84\uff1a ",
              diagnostic.installationPath
            ]
          }, undefined, true, undefined, this),
          /* @__PURE__ */ jsx_dev_runtime3.jsxDEV(ThemedText, {
            children: [
              "\u2514 \u8c03\u7528\u8def\u5f84\uff1a ",
              diagnostic.invokedBinary
            ]
          }, undefined, true, undefined, this),
          /* @__PURE__ */ jsx_dev_runtime3.jsxDEV(ThemedText, {
            children: [
              "\u2514 \u914d\u7f6e\u5b89\u88c5\u65b9\u5f0f\uff1a ",
              diagnostic.configInstallMethod
            ]
          }, undefined, true, undefined, this),
          /* @__PURE__ */ jsx_dev_runtime3.jsxDEV(ThemedText, {
            children: [
              "\u2514 \u641c\u7d22\uff1a ",
              diagnostic.ripgrepStatus.working ? "OK" : "\u4e0d\u53ef\u7528",
              " (",
              diagnostic.ripgrepStatus.mode === "embedded" ? "bundled" : diagnostic.ripgrepStatus.mode === "builtin" ? "vendor" : diagnostic.ripgrepStatus.systemPath || "system",
              ")"
            ]
          }, undefined, true, undefined, this),
          diagnostic.recommendation && /* @__PURE__ */ jsx_dev_runtime3.jsxDEV(jsx_dev_runtime3.Fragment, {
            children: [
              /* @__PURE__ */ jsx_dev_runtime3.jsxDEV(ThemedText, {}, undefined, false, undefined, this),
              /* @__PURE__ */ jsx_dev_runtime3.jsxDEV(ThemedText, {
                color: "warning",
                children: [
                  "\u5efa\u8bae\uff1a ",
                  diagnostic.recommendation.split(`
`)[0]
                ]
              }, undefined, true, undefined, this),
              /* @__PURE__ */ jsx_dev_runtime3.jsxDEV(ThemedText, {
                dimColor: true,
                children: diagnostic.recommendation.split(`
`)[1]
              }, undefined, false, undefined, this)
            ]
          }, undefined, true, undefined, this),
          diagnostic.multipleInstallations.length > 1 && /* @__PURE__ */ jsx_dev_runtime3.jsxDEV(jsx_dev_runtime3.Fragment, {
            children: [
              /* @__PURE__ */ jsx_dev_runtime3.jsxDEV(ThemedText, {}, undefined, false, undefined, this),
              /* @__PURE__ */ jsx_dev_runtime3.jsxDEV(ThemedText, {
                color: "warning",
                children: "\u8b66\u544a\uff1a\u68c0\u6d4b\u5230\u591a\u4e2a\u5b89\u88c5"
              }, undefined, false, undefined, this),
              diagnostic.multipleInstallations.map((install, i) => /* @__PURE__ */ jsx_dev_runtime3.jsxDEV(ThemedText, {
                children: [
                  "\u2514 ",
                  install.type,
                  " \u4e8e ",
                  install.path
                ]
              }, i, true, undefined, this))
            ]
          }, undefined, true, undefined, this),
          diagnostic.warnings.length > 0 && /* @__PURE__ */ jsx_dev_runtime3.jsxDEV(jsx_dev_runtime3.Fragment, {
            children: [
              /* @__PURE__ */ jsx_dev_runtime3.jsxDEV(ThemedText, {}, undefined, false, undefined, this),
              diagnostic.warnings.map((warning, i) => /* @__PURE__ */ jsx_dev_runtime3.jsxDEV(ThemedBox_default, {
                flexDirection: "column",
                children: [
                  /* @__PURE__ */ jsx_dev_runtime3.jsxDEV(ThemedText, {
                    color: "warning",
                    children: [
                      "\u8b66\u544a\uff1a ",
                      warning.issue
                    ]
                  }, undefined, true, undefined, this),
                  /* @__PURE__ */ jsx_dev_runtime3.jsxDEV(ThemedText, {
                    children: [
                      "\u4fee\u590d\uff1a ",
                      warning.fix
                    ]
                  }, undefined, true, undefined, this)
                ]
              }, i, true, undefined, this))
            ]
          }, undefined, true, undefined, this),
          errorsExcludingMcp.length > 0 && /* @__PURE__ */ jsx_dev_runtime3.jsxDEV(ThemedBox_default, {
            flexDirection: "column",
            marginTop: 1,
            marginBottom: 1,
            children: [
              /* @__PURE__ */ jsx_dev_runtime3.jsxDEV(ThemedText, {
                bold: true,
                children: "\u65e0\u6548\u8bbe\u7f6e"
              }, undefined, false, undefined, this),
              /* @__PURE__ */ jsx_dev_runtime3.jsxDEV(ValidationErrorsList, {
                errors: errorsExcludingMcp
              }, undefined, false, undefined, this)
            ]
          }, undefined, true, undefined, this)
        ]
      }, undefined, true, undefined, this),
      /* @__PURE__ */ jsx_dev_runtime3.jsxDEV(ThemedBox_default, {
        flexDirection: "column",
        children: [
          /* @__PURE__ */ jsx_dev_runtime3.jsxDEV(ThemedText, {
            bold: true,
            children: "\u66f4\u65b0"
          }, undefined, false, undefined, this),
          /* @__PURE__ */ jsx_dev_runtime3.jsxDEV(ThemedText, {
            children: [
              "\u2514 \u81ea\u52a8\u66f4\u65b0\uff1a",
              " ",
              diagnostic.packageManager ? "\u7531\u5305\u7ba1\u7406\u5668\u7ba1\u7406" : diagnostic.autoUpdates
            ]
          }, undefined, true, undefined, this),
          diagnostic.hasUpdatePermissions !== null && /* @__PURE__ */ jsx_dev_runtime3.jsxDEV(ThemedText, {
            children: [
              "\u2514 \u66f4\u65b0\u6743\u9650\uff1a",
              " ",
              diagnostic.hasUpdatePermissions ? "\u662f" : "\u5426\uff08\u9700\u8981 sudo\uff09"
            ]
          }, undefined, true, undefined, this),
          /* @__PURE__ */ jsx_dev_runtime3.jsxDEV(ThemedText, {
            children: [
              "\u2514 \u81ea\u52a8\u66f4\u65b0\u6e20\u9053\uff1a ",
              autoUpdatesChannel
            ]
          }, undefined, true, undefined, this),
          /* @__PURE__ */ jsx_dev_runtime3.jsxDEV(import_react.Suspense, {
            fallback: null,
            children: /* @__PURE__ */ jsx_dev_runtime3.jsxDEV(DistTagsDisplay, {
              promise: distTagsPromise
            }, undefined, false, undefined, this)
          }, undefined, false, undefined, this)
        ]
      }, undefined, true, undefined, this),
      /* @__PURE__ */ jsx_dev_runtime3.jsxDEV(SandboxDoctorSection, {}, undefined, false, undefined, this),
      /* @__PURE__ */ jsx_dev_runtime3.jsxDEV(McpParsingWarnings, {}, undefined, false, undefined, this),
      /* @__PURE__ */ jsx_dev_runtime3.jsxDEV(KeybindingWarnings, {}, undefined, false, undefined, this),
      envValidationErrors.length > 0 && /* @__PURE__ */ jsx_dev_runtime3.jsxDEV(ThemedBox_default, {
        flexDirection: "column",
        children: [
          /* @__PURE__ */ jsx_dev_runtime3.jsxDEV(ThemedText, {
            bold: true,
            children: "\u73af\u5883\u53d8\u91cf"
          }, undefined, false, undefined, this),
          envValidationErrors.map((validation, i) => /* @__PURE__ */ jsx_dev_runtime3.jsxDEV(ThemedText, {
            children: [
              "\u2514 ",
              validation.name,
              ":",
              " ",
              /* @__PURE__ */ jsx_dev_runtime3.jsxDEV(ThemedText, {
                color: validation.status === "capped" ? "warning" : "error",
                children: validation.message
              }, undefined, false, undefined, this)
            ]
          }, i, true, undefined, this))
        ]
      }, undefined, true, undefined, this),
      versionLockInfo?.enabled && /* @__PURE__ */ jsx_dev_runtime3.jsxDEV(ThemedBox_default, {
        flexDirection: "column",
        children: [
          /* @__PURE__ */ jsx_dev_runtime3.jsxDEV(ThemedText, {
            bold: true,
            children: "\u7248\u672c\u9501\u5b9a"
          }, undefined, false, undefined, this),
          versionLockInfo.staleLocksCleaned > 0 && /* @__PURE__ */ jsx_dev_runtime3.jsxDEV(ThemedText, {
            dimColor: true,
            children: [
              "\u2514 \u5df2\u6e05\u7406 ",
              versionLockInfo.staleLocksCleaned,
              " \u4e2a\u8fc7\u671f\u9501"
            ]
          }, undefined, true, undefined, this),
          versionLockInfo.locks.length === 0 ? /* @__PURE__ */ jsx_dev_runtime3.jsxDEV(ThemedText, {
            dimColor: true,
            children: "\u2514 \u65e0\u6d3b\u52a8\u7248\u672c\u9501"
          }, undefined, false, undefined, this) : versionLockInfo.locks.map((lock, i) => /* @__PURE__ */ jsx_dev_runtime3.jsxDEV(ThemedText, {
            children: [
              "\u2514 ",
              lock.version,
              ": PID ",
              lock.pid,
              " ",
              lock.isProcessRunning ? /* @__PURE__ */ jsx_dev_runtime3.jsxDEV(ThemedText, {
                children: "(\u8fd0\u884c\u4e2d)"
              }, undefined, false, undefined, this) : /* @__PURE__ */ jsx_dev_runtime3.jsxDEV(ThemedText, {
                color: "warning",
                children: "(\u8fc7\u671f)"
              }, undefined, false, undefined, this)
            ]
          }, i, true, undefined, this))
        ]
      }, undefined, true, undefined, this),
      agentInfo?.failedFiles && agentInfo.failedFiles.length > 0 && /* @__PURE__ */ jsx_dev_runtime3.jsxDEV(ThemedBox_default, {
        flexDirection: "column",
        children: [
          /* @__PURE__ */ jsx_dev_runtime3.jsxDEV(ThemedText, {
            bold: true,
            color: "error",
            children: "Agent \u89e3\u6790\u9519\u8bef"
          }, undefined, false, undefined, this),
          /* @__PURE__ */ jsx_dev_runtime3.jsxDEV(ThemedText, {
            color: "error",
            children: [
              "\u2514 \u89e3\u6790\u5931\u8d25 ",
              agentInfo.failedFiles.length,
              " \u4e2a agent \u6587\u4ef6\uff1a"
            ]
          }, undefined, true, undefined, this),
          agentInfo.failedFiles.map((file, i) => /* @__PURE__ */ jsx_dev_runtime3.jsxDEV(ThemedText, {
            dimColor: true,
            children: [
              "  ",
              "\u2514 ",
              file.path,
              ": ",
              file.error
            ]
          }, i, true, undefined, this))
        ]
      }, undefined, true, undefined, this),
      pluginsErrors.length > 0 && /* @__PURE__ */ jsx_dev_runtime3.jsxDEV(ThemedBox_default, {
        flexDirection: "column",
        children: [
          /* @__PURE__ */ jsx_dev_runtime3.jsxDEV(ThemedText, {
            bold: true,
            color: "error",
            children: "\u63d2\u4ef6\u9519\u8bef"
          }, undefined, false, undefined, this),
          /* @__PURE__ */ jsx_dev_runtime3.jsxDEV(ThemedText, {
            color: "error",
            children: [
              "\u2514 ",
              pluginsErrors.length,
              " \u4e2a\u63d2\u4ef6\u9519\u8bef\uff1a"
            ]
          }, undefined, true, undefined, this),
          pluginsErrors.map((error, i) => /* @__PURE__ */ jsx_dev_runtime3.jsxDEV(ThemedText, {
            dimColor: true,
            children: [
              "  ",
              "\u2514 ",
              error.source || "unknown",
              "plugin" in error && error.plugin ? ` [${error.plugin}]` : "",
              ":",
              " ",
              getPluginErrorMessage(error)
            ]
          }, i, true, undefined, this))
        ]
      }, undefined, true, undefined, this),
      contextWarnings?.unreachableRulesWarning && /* @__PURE__ */ jsx_dev_runtime3.jsxDEV(ThemedBox_default, {
        flexDirection: "column",
        children: [
          /* @__PURE__ */ jsx_dev_runtime3.jsxDEV(ThemedText, {
            bold: true,
            color: "warning",
            children: "\u4e0d\u53ef\u8fbe\u7684\u6743\u9650\u89c4\u5219"
          }, undefined, false, undefined, this),
          /* @__PURE__ */ jsx_dev_runtime3.jsxDEV(ThemedText, {
            children: [
              "\u2514",
              " ",
              /* @__PURE__ */ jsx_dev_runtime3.jsxDEV(ThemedText, {
                color: "warning",
                children: [
                  figures_default.warning,
                  " ",
                  contextWarnings.unreachableRulesWarning.message
                ]
              }, undefined, true, undefined, this)
            ]
          }, undefined, true, undefined, this),
          contextWarnings.unreachableRulesWarning.details.map((detail, i) => /* @__PURE__ */ jsx_dev_runtime3.jsxDEV(ThemedText, {
            dimColor: true,
            children: [
              "  ",
              "\u2514 ",
              detail
            ]
          }, i, true, undefined, this))
        ]
      }, undefined, true, undefined, this),
      contextWarnings && (contextWarnings.claudeMdWarning || contextWarnings.agentWarning || contextWarnings.mcpWarning) && /* @__PURE__ */ jsx_dev_runtime3.jsxDEV(ThemedBox_default, {
        flexDirection: "column",
        children: [
          /* @__PURE__ */ jsx_dev_runtime3.jsxDEV(ThemedText, {
            bold: true,
            children: "\u4e0a\u4e0b\u6587\u7528\u91cf\u8b66\u544a"
          }, undefined, false, undefined, this),
          contextWarnings.claudeMdWarning && /* @__PURE__ */ jsx_dev_runtime3.jsxDEV(jsx_dev_runtime3.Fragment, {
            children: [
              /* @__PURE__ */ jsx_dev_runtime3.jsxDEV(ThemedText, {
                children: [
                  "\u2514",
                  " ",
                  /* @__PURE__ */ jsx_dev_runtime3.jsxDEV(ThemedText, {
                    color: "warning",
                    children: [
                      figures_default.warning,
                      " ",
                      contextWarnings.claudeMdWarning.message
                    ]
                  }, undefined, true, undefined, this)
                ]
              }, undefined, true, undefined, this),
              /* @__PURE__ */ jsx_dev_runtime3.jsxDEV(ThemedText, {
                children: [
                  "  ",
                  "\u2514 \u6587\u4ef6\uff1a"
                ]
              }, undefined, true, undefined, this),
              contextWarnings.claudeMdWarning.details.map((detail, i) => /* @__PURE__ */ jsx_dev_runtime3.jsxDEV(ThemedText, {
                dimColor: true,
                children: [
                  "    ",
                  "\u2514 ",
                  detail
                ]
              }, i, true, undefined, this))
            ]
          }, undefined, true, undefined, this),
          contextWarnings.agentWarning && /* @__PURE__ */ jsx_dev_runtime3.jsxDEV(jsx_dev_runtime3.Fragment, {
            children: [
              /* @__PURE__ */ jsx_dev_runtime3.jsxDEV(ThemedText, {
                children: [
                  "\u2514",
                  " ",
                  /* @__PURE__ */ jsx_dev_runtime3.jsxDEV(ThemedText, {
                    color: "warning",
                    children: [
                      figures_default.warning,
                      " ",
                      contextWarnings.agentWarning.message
                    ]
                  }, undefined, true, undefined, this)
                ]
              }, undefined, true, undefined, this),
              /* @__PURE__ */ jsx_dev_runtime3.jsxDEV(ThemedText, {
                children: [
                  "  ",
                  "\u2514 \u4e3b\u8981\u8d21\u732e\uff1a"
                ]
              }, undefined, true, undefined, this),
              contextWarnings.agentWarning.details.map((detail, i) => /* @__PURE__ */ jsx_dev_runtime3.jsxDEV(ThemedText, {
                dimColor: true,
                children: [
                  "    ",
                  "\u2514 ",
                  detail
                ]
              }, i, true, undefined, this))
            ]
          }, undefined, true, undefined, this),
          contextWarnings.mcpWarning && /* @__PURE__ */ jsx_dev_runtime3.jsxDEV(jsx_dev_runtime3.Fragment, {
            children: [
              /* @__PURE__ */ jsx_dev_runtime3.jsxDEV(ThemedText, {
                children: [
                  "\u2514",
                  " ",
                  /* @__PURE__ */ jsx_dev_runtime3.jsxDEV(ThemedText, {
                    color: "warning",
                    children: [
                      figures_default.warning,
                      " ",
                      contextWarnings.mcpWarning.message
                    ]
                  }, undefined, true, undefined, this)
                ]
              }, undefined, true, undefined, this),
              /* @__PURE__ */ jsx_dev_runtime3.jsxDEV(ThemedText, {
                children: [
                  "  ",
                  "\u2514 MCP \u670d\u52a1\u5668\uff1a"
                ]
              }, undefined, true, undefined, this),
              contextWarnings.mcpWarning.details.map((detail, i) => /* @__PURE__ */ jsx_dev_runtime3.jsxDEV(ThemedText, {
                dimColor: true,
                children: [
                  "    ",
                  "\u2514 ",
                  detail
                ]
              }, i, true, undefined, this))
            ]
          }, undefined, true, undefined, this)
        ]
      }, undefined, true, undefined, this),
      /* @__PURE__ */ jsx_dev_runtime3.jsxDEV(ThemedBox_default, {
        children: /* @__PURE__ */ jsx_dev_runtime3.jsxDEV(PressEnterToContinue, {}, undefined, false, undefined, this)
      }, undefined, false, undefined, this)
    ]
  }, undefined, true, undefined, this);
}
var import_react, jsx_dev_runtime3;
var init_Doctor = __esm(() => {
  init_figures();
  init_KeybindingWarnings();
  init_McpParsingWarnings();
  init_context();
  init_envUtils();
  init_state();
  init_src();
  init_PressEnterToContinue();
  init_SandboxDoctorSection();
  init_ValidationErrorsList();
  init_useSettingsErrors();
  init_useExitOnCtrlCDWithKeybindings();
  init_src();
  init_useKeybinding();
  init_AppState();
  init_plugin();
  init_autoUpdater();
  init_doctorContextWarnings();
  init_doctorDiagnostic();
  init_envValidation();
  init_file();
  init_pidLock();
  init_settings();
  init_outputLimits();
  init_outputFormatting();
  init_xdg();
  import_react = __toESM(require_react(), 1);
  jsx_dev_runtime3 = __toESM(require_jsx_dev_runtime(), 1);
});

export { Doctor, init_Doctor };
