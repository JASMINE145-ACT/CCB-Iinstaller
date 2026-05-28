// @bun
import {
  editFileInEditor,
  init_promptEditor
} from "./chunk-z9g5g4xt.js";
import {
  Select,
  clearMemoryFileCaches,
  getAgentMemoryDir,
  getMemoryFiles,
  init_AppState,
  init_CustomSelect,
  init_agentMemory,
  init_claudemd,
  init_config1 as init_config,
  init_consolidationLock,
  isAutoDreamEnabled,
  readLastConsolidatedAt,
  useAppState
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
import {
  init_useExitOnCtrlCDWithKeybindings,
  useExitOnCtrlCDWithKeybindings
} from "./chunk-w7xjra5m.js";
import"./chunk-zttmdag3.js";
import"./chunk-smxezvfx.js";
import"./chunk-7ac6mws7.js";
import"./chunk-ps49ymvj.js";
import"./chunk-chzfw06n.js";
import {
  init_useKeybinding
} from "./chunk-s2x040y6.js";
import"./chunk-t4kcvmes.js";
import"./chunk-kten1z0y.js";
import"./chunk-rdh5rbpt.js";
import"./chunk-cy1z66c2.js";
import"./chunk-51pnrq77.js";
import"./chunk-wxa2hdfg.js";
import"./chunk-4jm600zv.js";
import"./chunk-kyaxezdn.js";
import {
  init_browser,
  openPath
} from "./chunk-f57cvf1d.js";
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
  getAutoMemPath,
  getDisplayPath,
  init_file,
  init_paths,
  init_settings1 as init_settings,
  isAutoMemoryEnabled,
  updateSettingsForSource
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
  formatRelativeTimeAgo,
  init_format
} from "./chunk-padf4crh.js";
import"./chunk-crmjpsqe.js";
import {
  Dialog,
  Link,
  ListItem,
  ThemedBox_default,
  ThemedText,
  init_source,
  init_src,
  source_default,
  useKeybinding
} from "./chunk-z9bw4q7j.js";
import {
  require_jsx_dev_runtime,
  require_react
} from "./chunk-evwb3c85.js";
import {
  init_analytics,
  logEvent
} from "./chunk-h0rbjg6x.js";
import"./chunk-0vkfrmqm.js";
import"./chunk-0xjaqda8.js";
import"./chunk-78009jh9.js";
import {
  findGitRoot,
  init_git
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
  getErrnoCode,
  init_errors
} from "./chunk-5khwvj1z.js";
import"./chunk-fbv4apne.js";
import {
  getOriginalCwd,
  init_state
} from "./chunk-gzp6rza1.js";
import"./chunk-50dgek10.js";
import"./chunk-7wm5s02e.js";
import"./chunk-z0csm2zq.js";
import {
  getClaudeConfigHomeDir,
  init_envUtils
} from "./chunk-hxhwzgnn.js";
import"./chunk-qx8z601m.js";
import"./chunk-cgm6758j.js";
import"./chunk-9m27g5s1.js";
import"./chunk-8pn8tvgg.js";
import"./chunk-netzwgv1.js";
import {
  __esm,
  __toESM
} from "./chunk-qp2qdcda.js";

// src/utils/memory/versions.ts
function projectIsInGitRepo(cwd) {
  return findGitRoot(cwd) !== null;
}
var init_versions = __esm(() => {
  init_git();
});

// src/components/memory/MemoryFileSelector.tsx
import { mkdir } from "fs/promises";
import { join } from "path";
function MemoryFileSelector({
  onSelect,
  onCancel
}) {
  const existingMemoryFiles = import_react.use(getMemoryFiles());
  const userMemoryPath = join(getClaudeConfigHomeDir(), "CLAUDE.md");
  const projectMemoryPath = join(getOriginalCwd(), "CLAUDE.md");
  const hasUserMemory = existingMemoryFiles.some((f) => f.path === userMemoryPath);
  const hasProjectMemory = existingMemoryFiles.some((f) => f.path === projectMemoryPath);
  const allMemoryFiles = [
    ...existingMemoryFiles.filter((f) => f.type !== "AutoMem" && f.type !== "TeamMem").map((f) => ({ ...f, exists: true })),
    ...hasUserMemory ? [] : [
      {
        path: userMemoryPath,
        type: "User",
        content: "",
        exists: false
      }
    ],
    ...hasProjectMemory ? [] : [
      {
        path: projectMemoryPath,
        type: "Project",
        content: "",
        exists: false
      }
    ]
  ];
  const depths = new Map;
  const memoryOptions = allMemoryFiles.map((file) => {
    const displayPath = getDisplayPath(file.path);
    const existsLabel = file.exists ? "" : " (new)";
    const depth = file.parent ? (depths.get(file.parent) ?? 0) + 1 : 0;
    depths.set(file.path, depth);
    const indent = depth > 0 ? "  ".repeat(depth - 1) : "";
    let label;
    if (file.type === "User" && !file.isNested && file.path === userMemoryPath) {
      label = `User memory`;
    } else if (file.type === "Project" && !file.isNested && file.path === projectMemoryPath) {
      label = `Project memory`;
    } else if (depth > 0) {
      label = `${indent}L ${displayPath}${existsLabel}`;
    } else {
      label = `${displayPath}`;
    }
    let description;
    const isGit = projectIsInGitRepo(getOriginalCwd());
    if (file.type === "User" && !file.isNested) {
      description = "Saved in ~/.claude/CLAUDE.md";
    } else if (file.type === "Project" && !file.isNested && file.path === projectMemoryPath) {
      description = `${isGit ? "Checked in at" : "Saved in"} ./CLAUDE.md`;
    } else if (file.parent) {
      description = "@-imported";
    } else if (file.isNested) {
      description = "dynamically loaded";
    } else {
      description = "";
    }
    return {
      label,
      value: file.path,
      description
    };
  });
  const folderOptions = [];
  const agentDefinitions = useAppState((s) => s.agentDefinitions);
  if (isAutoMemoryEnabled()) {
    folderOptions.push({
      label: "Open auto-memory folder",
      value: `${OPEN_FOLDER_PREFIX}${getAutoMemPath()}`,
      description: ""
    });
    if (false) {}
    for (const agent of agentDefinitions.activeAgents) {
      if (agent.memory) {
        const agentDir = getAgentMemoryDir(agent.agentType, agent.memory);
        folderOptions.push({
          label: `Open ${source_default.bold(agent.agentType)} agent memory`,
          value: `${OPEN_FOLDER_PREFIX}${agentDir}`,
          description: `${agent.memory} scope`
        });
      }
    }
  }
  memoryOptions.push(...folderOptions);
  const initialPath = lastSelectedPath && memoryOptions.some((opt) => opt.value === lastSelectedPath) ? lastSelectedPath : memoryOptions[0]?.value || "";
  const [autoMemoryOn, setAutoMemoryOn] = import_react.useState(isAutoMemoryEnabled);
  const [autoDreamOn, setAutoDreamOn] = import_react.useState(isAutoDreamEnabled);
  const [showDreamRow] = import_react.useState(isAutoMemoryEnabled);
  const isDreamRunning = useAppState((s) => Object.values(s.tasks).some((t) => t.type === "dream" && t.status === "running"));
  const [lastDreamAt, setLastDreamAt] = import_react.useState(null);
  import_react.useEffect(() => {
    if (!showDreamRow)
      return;
    readLastConsolidatedAt().then(setLastDreamAt);
  }, [showDreamRow, isDreamRunning]);
  const dreamStatus = isDreamRunning ? "running" : lastDreamAt === null ? "" : lastDreamAt === 0 ? "never" : `last ran ${formatRelativeTimeAgo(new Date(lastDreamAt))}`;
  const [focusedToggle, setFocusedToggle] = import_react.useState(null);
  const toggleFocused = focusedToggle !== null;
  const lastToggleIndex = showDreamRow ? 1 : 0;
  function handleToggleAutoMemory() {
    const newValue = !autoMemoryOn;
    updateSettingsForSource("userSettings", { autoMemoryEnabled: newValue });
    setAutoMemoryOn(newValue);
    logEvent("tengu_auto_memory_toggled", { enabled: newValue });
  }
  function handleToggleAutoDream() {
    const newValue = !autoDreamOn;
    updateSettingsForSource("userSettings", { autoDreamEnabled: newValue });
    setAutoDreamOn(newValue);
    logEvent("tengu_auto_dream_toggled", { enabled: newValue });
  }
  useExitOnCtrlCDWithKeybindings();
  useKeybinding("confirm:no", onCancel, { context: "Confirmation" });
  useKeybinding("confirm:yes", () => {
    if (focusedToggle === 0)
      handleToggleAutoMemory();
    else if (focusedToggle === 1)
      handleToggleAutoDream();
  }, { context: "Confirmation", isActive: toggleFocused });
  useKeybinding("select:next", () => {
    setFocusedToggle((prev) => prev !== null && prev < lastToggleIndex ? prev + 1 : null);
  }, { context: "Select", isActive: toggleFocused });
  useKeybinding("select:previous", () => {
    setFocusedToggle((prev) => prev !== null && prev > 0 ? prev - 1 : prev);
  }, { context: "Select", isActive: toggleFocused });
  return /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedBox_default, {
    flexDirection: "column",
    width: "100%",
    children: [
      /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedBox_default, {
        flexDirection: "column",
        marginBottom: 1,
        children: [
          /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ListItem, {
            isFocused: focusedToggle === 0,
            children: /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
              children: [
                "Auto-memory: ",
                autoMemoryOn ? "on" : "off"
              ]
            }, undefined, true, undefined, this)
          }, undefined, false, undefined, this),
          showDreamRow && /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ListItem, {
            isFocused: focusedToggle === 1,
            styled: false,
            children: /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
              color: focusedToggle === 1 ? "suggestion" : undefined,
              children: [
                "Auto-dream: ",
                autoDreamOn ? "on" : "off",
                dreamStatus && /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
                  dimColor: true,
                  children: [
                    " \xB7 ",
                    dreamStatus
                  ]
                }, undefined, true, undefined, this),
                !isDreamRunning && autoDreamOn && /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
                  dimColor: true,
                  children: " \xB7 /dream to run"
                }, undefined, false, undefined, this)
              ]
            }, undefined, true, undefined, this)
          }, undefined, false, undefined, this)
        ]
      }, undefined, true, undefined, this),
      /* @__PURE__ */ jsx_dev_runtime.jsxDEV(Select, {
        defaultFocusValue: initialPath,
        options: memoryOptions,
        isDisabled: toggleFocused,
        onChange: (value) => {
          if (value.startsWith(OPEN_FOLDER_PREFIX)) {
            const folderPath = value.slice(OPEN_FOLDER_PREFIX.length);
            mkdir(folderPath, { recursive: true }).catch(() => {}).then(() => openPath(folderPath));
            return;
          }
          lastSelectedPath = value;
          onSelect(value);
        },
        onCancel,
        onUpFromFirstItem: () => setFocusedToggle(lastToggleIndex)
      }, undefined, false, undefined, this)
    ]
  }, undefined, true, undefined, this);
}
var import_react, jsx_dev_runtime, lastSelectedPath, OPEN_FOLDER_PREFIX = "__open_folder__";
var init_MemoryFileSelector = __esm(() => {
  init_source();
  init_state();
  init_useExitOnCtrlCDWithKeybindings();
  init_src();
  init_useKeybinding();
  init_paths();
  init_analytics();
  init_config();
  init_consolidationLock();
  init_AppState();
  init_agentMemory();
  init_browser();
  init_claudemd();
  init_envUtils();
  init_file();
  init_format();
  init_versions();
  init_settings();
  init_CustomSelect();
  import_react = __toESM(require_react(), 1);
  jsx_dev_runtime = __toESM(require_jsx_dev_runtime(), 1);
});

// src/components/memory/MemoryUpdateNotification.tsx
import { homedir } from "os";
import { relative } from "path";
function getRelativeMemoryPath(path) {
  const homeDir = homedir();
  const cwd = getCwd();
  const relativeToHome = path.startsWith(homeDir) ? "~" + path.slice(homeDir.length) : null;
  const relativeToCwd = path.startsWith(cwd) ? "./" + relative(cwd, path) : null;
  if (relativeToHome && relativeToCwd) {
    return relativeToHome.length <= relativeToCwd.length ? relativeToHome : relativeToCwd;
  }
  return relativeToHome || relativeToCwd || path;
}
var jsx_dev_runtime2;
var init_MemoryUpdateNotification = __esm(() => {
  init_src();
  init_cwd();
  jsx_dev_runtime2 = __toESM(require_jsx_dev_runtime(), 1);
});

// src/commands/memory/memory.tsx
import { mkdir as mkdir2, writeFile } from "fs/promises";
function MemoryCommand({
  onDone
}) {
  const handleSelectMemoryFile = async (memoryPath) => {
    try {
      if (memoryPath.includes(getClaudeConfigHomeDir())) {
        await mkdir2(getClaudeConfigHomeDir(), { recursive: true });
      }
      try {
        await writeFile(memoryPath, "", { encoding: "utf8", flag: "wx" });
      } catch (e) {
        if (getErrnoCode(e) !== "EEXIST") {
          throw e;
        }
      }
      await editFileInEditor(memoryPath);
      let editorSource = "default";
      let editorValue = "";
      if (process.env.VISUAL) {
        editorSource = "$VISUAL";
        editorValue = process.env.VISUAL;
      } else if (process.env.EDITOR) {
        editorSource = "$EDITOR";
        editorValue = process.env.EDITOR;
      }
      const editorInfo = editorSource !== "default" ? `Using ${editorSource}="${editorValue}".` : "";
      const editorHint = editorInfo ? `> ${editorInfo} To change editor, set $EDITOR or $VISUAL environment variable.` : `> To use a different editor, set the $EDITOR or $VISUAL environment variable.`;
      onDone(`Opened memory file at ${getRelativeMemoryPath(memoryPath)}

${editorHint}`, { display: "system" });
    } catch (error) {
      logError(error);
      onDone(`Error opening memory file: ${error}`);
    }
  };
  const handleCancel = () => {
    onDone("Cancelled memory editing", { display: "system" });
  };
  return /* @__PURE__ */ jsx_dev_runtime3.jsxDEV(Dialog, {
    title: "Memory",
    onCancel: handleCancel,
    color: "remember",
    children: /* @__PURE__ */ jsx_dev_runtime3.jsxDEV(ThemedBox_default, {
      flexDirection: "column",
      children: [
        /* @__PURE__ */ jsx_dev_runtime3.jsxDEV(React.Suspense, {
          fallback: null,
          children: /* @__PURE__ */ jsx_dev_runtime3.jsxDEV(MemoryFileSelector, {
            onSelect: handleSelectMemoryFile,
            onCancel: handleCancel
          }, undefined, false, undefined, this)
        }, undefined, false, undefined, this),
        /* @__PURE__ */ jsx_dev_runtime3.jsxDEV(ThemedBox_default, {
          marginTop: 1,
          children: /* @__PURE__ */ jsx_dev_runtime3.jsxDEV(ThemedText, {
            dimColor: true,
            children: [
              "Learn more: ",
              /* @__PURE__ */ jsx_dev_runtime3.jsxDEV(Link, {
                url: "https://code.claude.com/docs/en/memory"
              }, undefined, false, undefined, this)
            ]
          }, undefined, true, undefined, this)
        }, undefined, false, undefined, this)
      ]
    }, undefined, true, undefined, this)
  }, undefined, false, undefined, this);
}
var React, jsx_dev_runtime3, call = async (onDone) => {
  clearMemoryFileCaches();
  await getMemoryFiles();
  return /* @__PURE__ */ jsx_dev_runtime3.jsxDEV(MemoryCommand, {
    onDone
  }, undefined, false, undefined, this);
};
var init_memory = __esm(() => {
  init_src();
  init_MemoryFileSelector();
  init_MemoryUpdateNotification();
  init_src();
  init_claudemd();
  init_envUtils();
  init_errors();
  init_log();
  init_promptEditor();
  React = __toESM(require_react(), 1);
  jsx_dev_runtime3 = __toESM(require_jsx_dev_runtime(), 1);
});
init_memory();

export {
  call
};
