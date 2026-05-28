// @bun
import {
  initSinks
} from "./chunk-mqv421k2.js";
import {
  getRecentActivity,
  init_logoV2Utils
} from "./chunk-65nnj3bk.js";
import {
  checkForReleaseNotes,
  init_releaseNotes
} from "./chunk-de5cqqf0.js";
import"./chunk-kkrf47xh.js";
import {
  DEFAULT_SESSION_MEMORY_CONFIG,
  FILE_EDIT_TOOL_NAME,
  FileReadTool,
  asSessionId,
  buildSessionMemoryUpdatePrompt,
  captureHooksConfigSnapshot,
  clearMemoryFileCaches,
  createCacheSafeParams,
  createSubagentContext,
  createTmuxSessionForWorktree,
  createUserMessage,
  createWorktreeForSession,
  exports_contextCollapse,
  generateTmuxSessionName,
  getCommands,
  getPlanSlug,
  getSessionMemoryConfig,
  getSessionMemoryDir,
  getSessionMemoryPath,
  getTokenUsage,
  getToolCallsBetweenUpdates,
  hasMetInitializationThreshold,
  hasMetUpdateThreshold,
  hasToolCallsInLastAssistantTurn,
  hasWorktreeCreateHook,
  init_FileReadTool,
  init_Shell,
  init_autoCompact,
  init_claudemd,
  init_commands1 as init_commands,
  init_constants,
  init_context,
  init_contextCollapse,
  init_fileChangedWatcher,
  init_filesystem,
  init_forkedAgent,
  init_hooks1 as init_hooks,
  init_hooksConfigSnapshot,
  init_ids,
  init_messages1 as init_messages,
  init_nativeInstaller,
  init_plans,
  init_postSamplingHooks,
  init_prompts,
  init_prompts1 as init_prompts2,
  init_sessionMemoryUtils,
  init_sessionStorage,
  init_systemPromptType,
  init_tokens,
  init_worktree,
  initializeFileChangedWatcher,
  isAutoCompactEnabled,
  isSessionMemoryInitialized,
  loadSessionMemoryTemplate,
  lockCurrentVersion,
  markExtractionCompleted,
  markExtractionStarted,
  markSessionMemoryInitialized,
  recordExtractionTokenCount,
  registerPostSamplingHook,
  runForkedAgent,
  saveWorktreeState,
  setCwd,
  setLastSummarizedMessageId,
  setSessionMemoryConfig,
  tokenCountWithEstimation,
  updateHooksConfigSnapshot,
  worktreeBranchName
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
import {
  checkAndRestoreTerminalBackup,
  init_appleTerminalBackup
} from "./chunk-smxezvfx.js";
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
  envDynamic,
  getCurrentProjectConfig,
  getDynamicConfig_CACHED_MAY_BE_STALE,
  getFeatureValue_CACHED_MAY_BE_STALE,
  getGlobalConfig,
  init_agentSwarmsEnabled,
  init_auth,
  init_config1 as init_config,
  init_envDynamic,
  init_growthbook,
  init_sequential,
  isAgentSwarmsEnabled,
  prefetchApiKeyFromApiKeyHelperIfSafe,
  saveGlobalConfig,
  sequential
} from "./chunk-mk2vzd2n.js";
import"./chunk-mkae8zj9.js";
import"./chunk-cxmyg49v.js";
import {
  count,
  init_array
} from "./chunk-zwarn9h7.js";
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
import {
  env,
  init_env
} from "./chunk-9qh5f9r3.js";
import"./chunk-xhesahm0.js";
import"./chunk-rh5a2rg9.js";
import"./chunk-p2816w9z.js";
import"./chunk-v9smspw2.js";
import"./chunk-v1kzp02e.js";
import {
  init_startupProfiler,
  profileCheckpoint
} from "./chunk-padf4crh.js";
import"./chunk-crmjpsqe.js";
import {
  init_source,
  source_default
} from "./chunk-z9bw4q7j.js";
import"./chunk-evwb3c85.js";
import {
  init_analytics,
  logEvent
} from "./chunk-h0rbjg6x.js";
import"./chunk-0vkfrmqm.js";
import"./chunk-0xjaqda8.js";
import"./chunk-78009jh9.js";
import {
  findCanonicalGitRoot,
  findGitRoot,
  getIsGit,
  init_diagLogs,
  init_git,
  logForDiagnosticsNoPII
} from "./chunk-9awawyvh.js";
import"./chunk-hqpzpr71.js";
import"./chunk-zs5b1dgr.js";
import"./chunk-hnxmafvc.js";
import {
  getCwd,
  init_cwd
} from "./chunk-tv74hgw9.js";
import {
  init_log,
  logError
} from "./chunk-wd8mqz95.js";
import"./chunk-8tnsngw2.js";
import"./chunk-vsbyhpfy.js";
import"./chunk-p7pj6wf8.js";
import"./chunk-5z28bqne.js";
import"./chunk-qajrkk97.js";
import {
  errorMessage,
  getErrnoCode,
  getFsImplementation,
  init_errors,
  init_fsOperations
} from "./chunk-5khwvj1z.js";
import"./chunk-fbv4apne.js";
import {
  getIsNonInteractiveSession,
  getIsRemoteMode,
  getProjectRoot,
  getSessionId,
  init_state,
  setOriginalCwd,
  setProjectRoot,
  switchSession
} from "./chunk-gzp6rza1.js";
import"./chunk-50dgek10.js";
import"./chunk-7wm5s02e.js";
import"./chunk-z0csm2zq.js";
import {
  init_envUtils,
  isBareMode,
  isEnvTruthy
} from "./chunk-hxhwzgnn.js";
import {
  init_memoize,
  memoize_default
} from "./chunk-qx8z601m.js";
import"./chunk-cgm6758j.js";
import"./chunk-9m27g5s1.js";
import"./chunk-8pn8tvgg.js";
import"./chunk-netzwgv1.js";
import {
  __require,
  __toCommonJS
} from "./chunk-qp2qdcda.js";

// src/setup.ts
init_source();
init_analytics();
init_cwd();
init_releaseNotes();
init_Shell();
init_state();
init_commands();

// src/services/SessionMemory/sessionMemory.ts
init_memoize();
init_state();
init_prompts2();
init_context();
init_constants();
init_FileReadTool();
init_array();
init_forkedAgent();
init_fsOperations();
init_postSamplingHooks();
init_messages();
init_filesystem();
init_sequential();
init_systemPromptType();
init_tokens();
init_analytics();
init_autoCompact();
init_prompts();
init_sessionMemoryUtils();
init_errors();
init_growthbook();
import { writeFile } from "fs/promises";
function isSessionMemoryGateEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_session_memory", false);
}
function getSessionMemoryRemoteConfig() {
  return getDynamicConfig_CACHED_MAY_BE_STALE("tengu_sm_config", {});
}
var lastMemoryMessageUuid;
function countToolCallsSince(messages, sinceUuid) {
  let toolCallCount = 0;
  let foundStart = sinceUuid === null || sinceUuid === undefined;
  for (const message of messages) {
    if (!foundStart) {
      if (message.uuid === sinceUuid) {
        foundStart = true;
      }
      continue;
    }
    if (message.type === "assistant") {
      const content = message.message.content;
      if (Array.isArray(content)) {
        toolCallCount += count(content, (block) => block.type === "tool_use");
      }
    }
  }
  return toolCallCount;
}
function shouldExtractMemory(messages) {
  const currentTokenCount = tokenCountWithEstimation(messages);
  if (!isSessionMemoryInitialized()) {
    if (!hasMetInitializationThreshold(currentTokenCount)) {
      return false;
    }
    markSessionMemoryInitialized();
  }
  const hasMetTokenThreshold = hasMetUpdateThreshold(currentTokenCount);
  const toolCallsSinceLastUpdate = countToolCallsSince(messages, lastMemoryMessageUuid);
  const hasMetToolCallThreshold = toolCallsSinceLastUpdate >= getToolCallsBetweenUpdates();
  const hasToolCallsInLastTurn = hasToolCallsInLastAssistantTurn(messages);
  const shouldExtract = hasMetTokenThreshold && hasMetToolCallThreshold || hasMetTokenThreshold && !hasToolCallsInLastTurn;
  if (shouldExtract) {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.uuid) {
      lastMemoryMessageUuid = lastMessage.uuid;
    }
    return true;
  }
  return false;
}
async function setupSessionMemoryFile(toolUseContext) {
  const fs = getFsImplementation();
  const sessionMemoryDir = getSessionMemoryDir();
  await fs.mkdir(sessionMemoryDir, { mode: 448 });
  const memoryPath = getSessionMemoryPath();
  try {
    await writeFile(memoryPath, "", {
      encoding: "utf-8",
      mode: 384,
      flag: "wx"
    });
    const template = await loadSessionMemoryTemplate();
    await writeFile(memoryPath, template, {
      encoding: "utf-8",
      mode: 384
    });
  } catch (e) {
    const code = getErrnoCode(e);
    if (code !== "EEXIST") {
      throw e;
    }
  }
  toolUseContext.readFileState.delete(memoryPath);
  const result = await FileReadTool.call({ file_path: memoryPath }, toolUseContext);
  let currentMemory = "";
  const output = result.data;
  if (output.type === "text") {
    currentMemory = output.file.content;
  }
  logEvent("tengu_session_memory_file_read", {
    content_length: currentMemory.length
  });
  return { memoryPath, currentMemory };
}
var initSessionMemoryConfigIfNeeded = memoize_default(() => {
  const remoteConfig = getSessionMemoryRemoteConfig();
  const config = {
    minimumMessageTokensToInit: remoteConfig.minimumMessageTokensToInit && remoteConfig.minimumMessageTokensToInit > 0 ? remoteConfig.minimumMessageTokensToInit : DEFAULT_SESSION_MEMORY_CONFIG.minimumMessageTokensToInit,
    minimumTokensBetweenUpdate: remoteConfig.minimumTokensBetweenUpdate && remoteConfig.minimumTokensBetweenUpdate > 0 ? remoteConfig.minimumTokensBetweenUpdate : DEFAULT_SESSION_MEMORY_CONFIG.minimumTokensBetweenUpdate,
    toolCallsBetweenUpdates: remoteConfig.toolCallsBetweenUpdates && remoteConfig.toolCallsBetweenUpdates > 0 ? remoteConfig.toolCallsBetweenUpdates : DEFAULT_SESSION_MEMORY_CONFIG.toolCallsBetweenUpdates
  };
  setSessionMemoryConfig(config);
});
var hasLoggedGateFailure = false;
var extractSessionMemory = sequential(async function(context) {
  const { messages, toolUseContext, querySource } = context;
  if (querySource !== "repl_main_thread") {
    return;
  }
  if (true) {
    const { isPoorModeActive } = await import("./chunk-v7f7h16t.js");
    if (isPoorModeActive())
      return;
  }
  if (!isSessionMemoryGateEnabled()) {
    if (process.env.USER_TYPE === "ant" && !hasLoggedGateFailure) {
      hasLoggedGateFailure = true;
      logEvent("tengu_session_memory_gate_disabled", {});
    }
    return;
  }
  initSessionMemoryConfigIfNeeded();
  if (!shouldExtractMemory(messages)) {
    return;
  }
  markExtractionStarted();
  const setupContext = createSubagentContext(toolUseContext);
  const { memoryPath, currentMemory } = await setupSessionMemoryFile(setupContext);
  const userPrompt = await buildSessionMemoryUpdatePrompt(currentMemory, memoryPath);
  await runForkedAgent({
    promptMessages: [createUserMessage({ content: userPrompt })],
    cacheSafeParams: createCacheSafeParams(context),
    canUseTool: createMemoryFileCanUseTool(memoryPath),
    querySource: "session_memory",
    forkLabel: "session_memory",
    overrides: { readFileState: setupContext.readFileState }
  });
  const lastMessage = messages[messages.length - 1];
  const usage = lastMessage ? getTokenUsage(lastMessage) : undefined;
  const config = getSessionMemoryConfig();
  logEvent("tengu_session_memory_extraction", {
    input_tokens: usage?.input_tokens,
    output_tokens: usage?.output_tokens,
    cache_read_input_tokens: usage?.cache_read_input_tokens ?? undefined,
    cache_creation_input_tokens: usage?.cache_creation_input_tokens ?? undefined,
    config_min_message_tokens_to_init: config.minimumMessageTokensToInit,
    config_min_tokens_between_update: config.minimumTokensBetweenUpdate,
    config_tool_calls_between_updates: config.toolCallsBetweenUpdates
  });
  recordExtractionTokenCount(tokenCountWithEstimation(messages));
  updateLastSummarizedMessageIdIfSafe(messages);
  markExtractionCompleted();
});
function initSessionMemory() {
  if (getIsRemoteMode())
    return;
  const autoCompactEnabled = isAutoCompactEnabled();
  if (process.env.USER_TYPE === "ant") {
    logEvent("tengu_session_memory_init", {
      auto_compact_enabled: autoCompactEnabled
    });
  }
  if (!autoCompactEnabled) {
    return;
  }
  registerPostSamplingHook(extractSessionMemory);
}
function createMemoryFileCanUseTool(memoryPath) {
  return async (tool, input) => {
    if (tool.name === FILE_EDIT_TOOL_NAME && typeof input === "object" && input !== null && "file_path" in input) {
      const filePath = input.file_path;
      if (typeof filePath === "string" && filePath === memoryPath) {
        return { behavior: "allow", updatedInput: input };
      }
    }
    return {
      behavior: "deny",
      message: `only ${FILE_EDIT_TOOL_NAME} on ${memoryPath} is allowed`,
      decisionReason: {
        type: "other",
        reason: `only ${FILE_EDIT_TOOL_NAME} on ${memoryPath} is allowed`
      }
    };
  };
}
function updateLastSummarizedMessageIdIfSafe(messages) {
  if (!hasToolCallsInLastAssistantTurn(messages)) {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.uuid) {
      setLastSummarizedMessageId(lastMessage.uuid);
    }
  }
}

// src/setup.ts
init_ids();
init_agentSwarmsEnabled();
init_appleTerminalBackup();
init_auth();
init_claudemd();
init_config();
init_diagLogs();
init_env();
init_envDynamic();
init_envUtils();
init_errors();
init_git();
init_fileChangedWatcher();
init_hooksConfigSnapshot();
init_hooks();

// src/utils/iTermBackup.ts
init_config();
init_log();
import { copyFile, stat } from "fs/promises";
import { homedir } from "os";
import { join } from "path";
function markITerm2SetupComplete() {
  saveGlobalConfig((current) => ({
    ...current,
    iterm2SetupInProgress: false
  }));
}
function getIterm2RecoveryInfo() {
  const config = getGlobalConfig();
  return {
    inProgress: config.iterm2SetupInProgress ?? false,
    backupPath: config.iterm2BackupPath || null
  };
}
function getITerm2PlistPath() {
  return join(homedir(), "Library", "Preferences", "com.googlecode.iterm2.plist");
}
async function checkAndRestoreITerm2Backup() {
  const { inProgress, backupPath } = getIterm2RecoveryInfo();
  if (!inProgress) {
    return { status: "no_backup" };
  }
  if (!backupPath) {
    markITerm2SetupComplete();
    return { status: "no_backup" };
  }
  try {
    await stat(backupPath);
  } catch {
    markITerm2SetupComplete();
    return { status: "no_backup" };
  }
  try {
    await copyFile(backupPath, getITerm2PlistPath());
    markITerm2SetupComplete();
    return { status: "restored" };
  } catch (restoreError) {
    logError(new Error(`Failed to restore iTerm2 settings with: ${restoreError}`));
    markITerm2SetupComplete();
    return { status: "failed", backupPath };
  }
}

// src/setup.ts
init_log();
init_logoV2Utils();
init_nativeInstaller();
init_plans();
init_sessionStorage();
init_startupProfiler();
init_worktree();
async function setup(cwd, permissionMode, allowDangerouslySkipPermissions, worktreeEnabled, worktreeName, tmuxEnabled, customSessionId, worktreePRNumber, messagingSocketPath) {
  logForDiagnosticsNoPII("info", "setup_started");
  const nodeVersion = process.version.match(/^v(\d+)\./)?.[1];
  if (!nodeVersion || parseInt(nodeVersion) < 18) {
    console.error(source_default.bold.red("Error: Claude Code requires Node.js version 18 or higher."));
    process.exit(1);
  }
  if (customSessionId) {
    switchSession(asSessionId(customSessionId));
  }
  if (!isBareMode() || messagingSocketPath !== undefined) {
    if (false) {}
  }
  if (!isBareMode() && isAgentSwarmsEnabled()) {
    const { captureTeammateModeSnapshot } = await import("./chunk-pnspcwvh.js");
    captureTeammateModeSnapshot();
  }
  if (!getIsNonInteractiveSession()) {
    if (isAgentSwarmsEnabled()) {
      const restoredIterm2Backup = await checkAndRestoreITerm2Backup();
      if (restoredIterm2Backup.status === "restored") {
        console.log(source_default.yellow("Detected an interrupted iTerm2 setup. Your original settings have been restored. You may need to restart iTerm2 for the changes to take effect."));
      } else if (restoredIterm2Backup.status === "failed") {
        console.error(source_default.red(`Failed to restore iTerm2 settings. Please manually restore your original settings with: defaults import com.googlecode.iterm2 ${restoredIterm2Backup.backupPath}.`));
      }
    }
    try {
      const restoredTerminalBackup = await checkAndRestoreTerminalBackup();
      if (restoredTerminalBackup.status === "restored") {
        console.log(source_default.yellow("Detected an interrupted Terminal.app setup. Your original settings have been restored. You may need to restart Terminal.app for the changes to take effect."));
      } else if (restoredTerminalBackup.status === "failed") {
        console.error(source_default.red(`Failed to restore Terminal.app settings. Please manually restore your original settings with: defaults import com.apple.Terminal ${restoredTerminalBackup.backupPath}.`));
      }
    } catch (error) {
      logError(error);
    }
  }
  setCwd(cwd);
  const hooksStart = Date.now();
  captureHooksConfigSnapshot();
  logForDiagnosticsNoPII("info", "setup_hooks_captured", {
    duration_ms: Date.now() - hooksStart
  });
  initializeFileChangedWatcher(cwd);
  if (worktreeEnabled) {
    const hasHook = hasWorktreeCreateHook();
    const inGit = await getIsGit();
    if (!hasHook && !inGit) {
      process.stderr.write(source_default.red(`Error: Can only use --worktree in a git repository, but ${source_default.bold(cwd)} is not a git repository. Configure a WorktreeCreate hook in settings.json to use --worktree with other VCS systems.
`));
      process.exit(1);
    }
    const slug = worktreePRNumber ? `pr-${worktreePRNumber}` : worktreeName ?? getPlanSlug();
    let tmuxSessionName;
    if (inGit) {
      const mainRepoRoot = findCanonicalGitRoot(getCwd());
      if (!mainRepoRoot) {
        process.stderr.write(source_default.red(`Error: Could not determine the main git repository root.
`));
        process.exit(1);
      }
      if (mainRepoRoot !== (findGitRoot(getCwd()) ?? getCwd())) {
        logForDiagnosticsNoPII("info", "worktree_resolved_to_main_repo");
        process.chdir(mainRepoRoot);
        setCwd(mainRepoRoot);
      }
      tmuxSessionName = tmuxEnabled ? generateTmuxSessionName(mainRepoRoot, worktreeBranchName(slug)) : undefined;
    } else {
      tmuxSessionName = tmuxEnabled ? generateTmuxSessionName(getCwd(), worktreeBranchName(slug)) : undefined;
    }
    let worktreeSession;
    try {
      worktreeSession = await createWorktreeForSession(getSessionId(), slug, tmuxSessionName, worktreePRNumber ? { prNumber: worktreePRNumber } : undefined);
    } catch (error) {
      process.stderr.write(source_default.red(`Error creating worktree: ${errorMessage(error)}
`));
      process.exit(1);
    }
    logEvent("tengu_worktree_created", { tmux_enabled: tmuxEnabled });
    if (tmuxEnabled && tmuxSessionName) {
      const tmuxResult = await createTmuxSessionForWorktree(tmuxSessionName, worktreeSession.worktreePath);
      if (tmuxResult.created) {
        console.log(source_default.green(`Created tmux session: ${source_default.bold(tmuxSessionName)}
To attach: ${source_default.bold(`tmux attach -t ${tmuxSessionName}`)}`));
      } else {
        console.error(source_default.yellow(`Warning: Failed to create tmux session: ${tmuxResult.error}`));
      }
    }
    process.chdir(worktreeSession.worktreePath);
    setCwd(worktreeSession.worktreePath);
    setOriginalCwd(getCwd());
    setProjectRoot(getCwd());
    saveWorktreeState(worktreeSession);
    clearMemoryFileCaches();
    updateHooksConfigSnapshot();
  }
  logForDiagnosticsNoPII("info", "setup_background_jobs_starting");
  if (!isBareMode()) {
    initSessionMemory();
    if (true) {
      (init_contextCollapse(), __toCommonJS(exports_contextCollapse)).initContextCollapse();
    }
  }
  lockCurrentVersion();
  logForDiagnosticsNoPII("info", "setup_background_jobs_launched");
  profileCheckpoint("setup_before_prefetch");
  logForDiagnosticsNoPII("info", "setup_prefetch_starting");
  const skipPluginPrefetch = getIsNonInteractiveSession() && isEnvTruthy(process.env.CLAUDE_CODE_SYNC_PLUGIN_INSTALL) || isBareMode();
  if (!skipPluginPrefetch) {
    getCommands(getProjectRoot());
  }
  import("./chunk-aqq5wbwx.js").then((m) => {
    if (!skipPluginPrefetch) {
      m.loadPluginHooks();
      m.setupPluginHookHotReload();
    }
  });
  if (!isBareMode()) {
    if (process.env.USER_TYPE === "ant") {
      import("./chunk-snbrde8z.js").then(async (m) => {
        if (await m.isInternalModelRepo()) {
          const { clearSystemPromptSections } = await import("./chunk-wm3yj6z2.js");
          clearSystemPromptSections();
        }
      });
    }
    if (false) {}
    import("./chunk-894r49h8.js").then((m) => m.registerSessionFileAccessHooks());
    if (false) {}
  }
  initSinks();
  logEvent("tengu_started", {});
  prefetchApiKeyFromApiKeyHelperIfSafe(getIsNonInteractiveSession());
  profileCheckpoint("setup_after_prefetch");
  if (!isBareMode()) {
    const { hasReleaseNotes } = await checkForReleaseNotes(getGlobalConfig().lastReleaseNotesSeen);
    if (hasReleaseNotes) {
      await getRecentActivity();
    }
  }
  if (permissionMode === "bypassPermissions" || allowDangerouslySkipPermissions) {
    if (process.platform !== "win32" && typeof process.getuid === "function" && process.getuid() === 0 && process.env.IS_SANDBOX !== "1" && !isEnvTruthy(process.env.CLAUDE_CODE_BUBBLEWRAP)) {
      console.error(`--dangerously-skip-permissions cannot be used with root/sudo privileges for security reasons`);
      process.exit(1);
    }
    if (process.env.USER_TYPE === "ant" && process.env.CLAUDE_CODE_ENTRYPOINT !== "local-agent" && process.env.CLAUDE_CODE_ENTRYPOINT !== "claude-desktop") {
      const [isDocker, hasInternet] = await Promise.all([
        envDynamic.getIsDocker(),
        env.hasInternetAccess()
      ]);
      const isBubblewrap = envDynamic.getIsBubblewrapSandbox();
      const isSandbox = process.env.IS_SANDBOX === "1";
      const isSandboxed = isDocker || isBubblewrap || isSandbox;
      if (!isSandboxed || hasInternet) {
        console.error(`--dangerously-skip-permissions can only be used in Docker/sandbox containers with no internet access but got Docker: ${isDocker}, Bubblewrap: ${isBubblewrap}, IS_SANDBOX: ${isSandbox}, hasInternet: ${hasInternet}`);
        process.exit(1);
      }
    }
  }
  if (false) {}
  const projectConfig = getCurrentProjectConfig();
  if (projectConfig.lastCost !== undefined && projectConfig.lastDuration !== undefined) {
    logEvent("tengu_exit", {
      last_session_cost: projectConfig.lastCost,
      last_session_api_duration: projectConfig.lastAPIDuration,
      last_session_tool_duration: projectConfig.lastToolDuration,
      last_session_duration: projectConfig.lastDuration,
      last_session_lines_added: projectConfig.lastLinesAdded,
      last_session_lines_removed: projectConfig.lastLinesRemoved,
      last_session_total_input_tokens: projectConfig.lastTotalInputTokens,
      last_session_total_output_tokens: projectConfig.lastTotalOutputTokens,
      last_session_total_cache_creation_input_tokens: projectConfig.lastTotalCacheCreationInputTokens,
      last_session_total_cache_read_input_tokens: projectConfig.lastTotalCacheReadInputTokens,
      last_session_fps_average: projectConfig.lastFpsAverage,
      last_session_fps_low_1_pct: projectConfig.lastFpsLow1Pct,
      last_session_id: projectConfig.lastSessionId,
      ...projectConfig.lastSessionMetrics
    });
  }
}
export {
  setup
};
