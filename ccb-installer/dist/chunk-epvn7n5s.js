// @bun
import {
  ConfigurableShortcutHint,
  Select,
  capitalize_default,
  convertEffortValueToLevel,
  getDefaultEffortForModel,
  getDisplayedEffortLevel,
  getModelOptions,
  init_AppState,
  init_ConfigurableShortcutHint,
  init_CustomSelect,
  init_capitalize,
  init_effort,
  init_modelOptions,
  modelSupportsEffort,
  modelSupportsMaxEffort,
  resolvePickerEffortPersistence,
  toPersistableEffort,
  useAppState,
  useSetAppState
} from "./chunk-xg5k46jr.js";
import {
  init_useExitOnCtrlCDWithKeybindings,
  useExitOnCtrlCDWithKeybindings
} from "./chunk-w7xjra5m.js";
import {
  init_useKeybinding
} from "./chunk-s2x040y6.js";
import {
  EFFORT_HIGH,
  EFFORT_LOW,
  EFFORT_MAX,
  EFFORT_MEDIUM,
  FAST_MODE_MODEL_DISPLAY,
  getDefaultMainLoopModel,
  getSettingsForSource,
  has1mContext,
  init_auth,
  init_context,
  init_fastMode,
  init_figures,
  init_model,
  init_settings1 as init_settings,
  isClaudeAISubscriber,
  isFastModeAvailable,
  isFastModeCooldown,
  isFastModeEnabled,
  modelDisplayString,
  parseUserSpecifiedModel,
  updateSettingsForSource
} from "./chunk-mk2vzd2n.js";
import {
  Byline,
  KeyboardShortcutHint,
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
  init_analytics,
  logEvent
} from "./chunk-h0rbjg6x.js";
import {
  __esm,
  __toESM
} from "./chunk-qp2qdcda.js";

// src/components/EffortIndicator.ts
function getEffortNotificationText(effortValue, model) {
  if (!modelSupportsEffort(model))
    return;
  const level = getDisplayedEffortLevel(model, effortValue);
  return `${effortLevelToSymbol(level)} ${level} \xB7 /effort`;
}
function effortLevelToSymbol(level) {
  switch (level) {
    case "low":
      return EFFORT_LOW;
    case "medium":
      return EFFORT_MEDIUM;
    case "high":
      return EFFORT_HIGH;
    case "max":
      return EFFORT_MAX;
    default:
      return EFFORT_HIGH;
  }
}
var init_EffortIndicator = __esm(() => {
  init_figures();
  init_effort();
});

// src/components/ModelPicker.tsx
function ModelPicker({
  initial,
  sessionModel,
  onSelect,
  onCancel,
  isStandaloneCommand,
  showFastModeNotice,
  headerText,
  skipSettingsWrite
}) {
  const setAppState = useSetAppState();
  const exitState = useExitOnCtrlCDWithKeybindings();
  const maxVisible = 10;
  const initialValue = initial === null ? NO_PREFERENCE : initial;
  const [focusedValue, setFocusedValue] = import_react.useState(initialValue);
  const isFastMode = useAppState((s) => isFastModeEnabled() ? s.fastMode : false);
  const [marked1MValues, setMarked1MValues] = import_react.useState(() => new Set(has1mContext(initialValue) ? [initialValue.replace(/\[1m\]/i, "")] : []));
  const handleToggle1M = import_react.useCallback(() => {
    if (!focusedValue || focusedValue === NO_PREFERENCE)
      return;
    setMarked1MValues((prev) => {
      const next = new Set(prev);
      if (next.has(focusedValue)) {
        next.delete(focusedValue);
      } else {
        next.add(focusedValue);
      }
      return next;
    });
  }, [focusedValue]);
  const [hasToggledEffort, setHasToggledEffort] = import_react.useState(false);
  const effortValue = useAppState((s) => s.effortValue);
  const [effort, setEffort] = import_react.useState(effortValue !== undefined ? convertEffortValueToLevel(effortValue) : undefined);
  const modelOptions = import_react.useMemo(() => getModelOptions(isFastMode ?? false), [isFastMode]);
  const optionsWithInitial = import_react.useMemo(() => {
    if (initial !== null && !modelOptions.some((opt) => opt.value === initial)) {
      return [
        ...modelOptions,
        {
          value: initial,
          label: modelDisplayString(initial),
          description: "\u5f53\u524d\u6a21\u578b"
        }
      ];
    }
    return modelOptions;
  }, [modelOptions, initial]);
  const selectOptions = import_react.useMemo(() => optionsWithInitial.map((opt) => ({
    ...opt,
    value: opt.value === null ? NO_PREFERENCE : opt.value
  })), [optionsWithInitial]);
  const initialFocusValue = import_react.useMemo(() => selectOptions.some((_) => _.value === initialValue) ? initialValue : selectOptions[0]?.value ?? undefined, [selectOptions, initialValue]);
  const visibleCount = Math.min(maxVisible, selectOptions.length);
  const hiddenCount = Math.max(0, selectOptions.length - visibleCount);
  const focusedModelName = selectOptions.find((opt) => opt.value === focusedValue)?.label;
  const focusedModel = resolveOptionModel(focusedValue);
  const is1MMarked = focusedValue !== undefined && focusedValue !== NO_PREFERENCE && marked1MValues.has(focusedValue);
  const focusedSupportsEffort = focusedModel ? modelSupportsEffort(focusedModel) : false;
  const focusedSupportsMax = focusedModel ? modelSupportsMaxEffort(focusedModel) : false;
  const focusedDefaultEffort = getDefaultEffortLevelForOption(focusedValue);
  const displayEffort = effort === "max" && !focusedSupportsMax ? "high" : effort;
  const handleFocus = import_react.useCallback((value) => {
    setFocusedValue(value);
    if (!hasToggledEffort && effortValue === undefined) {
      setEffort(getDefaultEffortLevelForOption(value));
    }
  }, [hasToggledEffort, effortValue]);
  const handleCycleEffort = import_react.useCallback((direction) => {
    if (!focusedSupportsEffort)
      return;
    setEffort((prev) => cycleEffortLevel(prev ?? focusedDefaultEffort, direction, focusedSupportsMax));
    setHasToggledEffort(true);
  }, [focusedSupportsEffort, focusedSupportsMax, focusedDefaultEffort]);
  useKeybindings({
    "modelPicker:decreaseEffort": () => handleCycleEffort("left"),
    "modelPicker:increaseEffort": () => handleCycleEffort("right"),
    "modelPicker:toggle1M": () => handleToggle1M()
  }, { context: "ModelPicker" });
  function handleSelect(value) {
    logEvent("tengu_model_command_menu_effort", {
      effort
    });
    if (!skipSettingsWrite) {
      const effortLevel = resolvePickerEffortPersistence(effort, getDefaultEffortLevelForOption(value), getSettingsForSource("userSettings")?.effortLevel, hasToggledEffort);
      const persistable = toPersistableEffort(effortLevel);
      if (persistable !== undefined) {
        updateSettingsForSource("userSettings", { effortLevel: persistable });
      }
      setAppState((prev) => ({ ...prev, effortValue: effortLevel }));
    }
    const selectedModel = resolveOptionModel(value);
    const selectedEffort = hasToggledEffort && selectedModel && modelSupportsEffort(selectedModel) ? effort : undefined;
    if (value === NO_PREFERENCE) {
      onSelect(null, selectedEffort);
      return;
    }
    const wants1M = marked1MValues.has(value);
    const baseValue = value.replace(/\[1m\]/i, "");
    const finalValue = wants1M ? `${baseValue}[1m]` : baseValue;
    onSelect(finalValue, selectedEffort);
  }
  const content = /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedBox_default, {
    flexDirection: "column",
    children: [
      /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedBox_default, {
        flexDirection: "column",
        children: [
          /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedBox_default, {
            marginBottom: 1,
            flexDirection: "column",
            children: [
              /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
                color: "remember",
                bold: true,
                children: "\u9009\u62e9\u6a21\u578b"
              }, undefined, false, undefined, this),
              /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
                dimColor: true,
                children: headerText ?? "\u5728 Claude \u6a21\u578b\u95f4\u5207\u6362\u3002\u5bf9\u672c\u4f1a\u8bdd\u53ca\u4e4b\u540e\u7684 Claude Code \u4f1a\u8bdd\u751f\u6548\u3002\u5176\u4ed6/\u65e7\u6a21\u578b\u540d\u8bf7\u7528 --model \u6307\u5b9a\u3002"
              }, undefined, false, undefined, this),
              sessionModel && /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
                dimColor: true,
                children: [
                  "\u5f53\u524d\u4f1a\u8bdd\u4f7f\u7528 ",
                  modelDisplayString(sessionModel),
                  " \uff08\u7531\u8ba1\u5212\u6a21\u5f0f\u8bbe\u5b9a\uff09\u3002\u9009\u62e9\u6a21\u578b\u5c06\u53d6\u6d88\u6b64\u8bbe\u7f6e\u3002"
                ]
              }, undefined, true, undefined, this)
            ]
          }, undefined, true, undefined, this),
          /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedBox_default, {
            flexDirection: "column",
            marginBottom: 1,
            children: [
              /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedBox_default, {
                flexDirection: "column",
                children: /* @__PURE__ */ jsx_dev_runtime.jsxDEV(Select, {
                  defaultValue: initialValue,
                  defaultFocusValue: initialFocusValue,
                  options: selectOptions,
                  onChange: handleSelect,
                  onFocus: handleFocus,
                  onCancel: onCancel ?? (() => {}),
                  visibleOptionCount: visibleCount
                }, undefined, false, undefined, this)
              }, undefined, false, undefined, this),
              hiddenCount > 0 && /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedBox_default, {
                paddingLeft: 3,
                children: /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
                  dimColor: true,
                  children: [
                    "\u8fd8\u6709 ",
                    hiddenCount,
                    " \u9879\u2026"
                  ]
                }, undefined, true, undefined, this)
              }, undefined, false, undefined, this)
            ]
          }, undefined, true, undefined, this),
          /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedBox_default, {
            marginBottom: 1,
            flexDirection: "column",
            children: [
              focusedSupportsEffort ? /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
                dimColor: true,
                children: [
                  /* @__PURE__ */ jsx_dev_runtime.jsxDEV(EffortLevelIndicator, {
                    effort: displayEffort
                  }, undefined, false, undefined, this),
                  " ",
                  capitalize_default(displayEffort),
                  " \u529b\u5ea6",
                  displayEffort === focusedDefaultEffort ? ` (\u9ed8\u8ba4)` : ``,
                  " ",
                  /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
                    color: "subtle",
                    children: "\u2190 \u2192 to adjust"
                  }, undefined, false, undefined, this)
                ]
              }, undefined, true, undefined, this) : /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
                color: "subtle",
                children: [
                  /* @__PURE__ */ jsx_dev_runtime.jsxDEV(EffortLevelIndicator, {
                    effort: undefined
                  }, undefined, false, undefined, this),
                  " \u4e0d\u652f\u6301 effort",
                  focusedModelName ? ` for ${focusedModelName}` : ""
                ]
              }, undefined, true, undefined, this),
              is1MMarked ? /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
                dimColor: true,
                children: [
                  /* @__PURE__ */ jsx_dev_runtime.jsxDEV(EffortLevelIndicator, {
                    effort: "high"
                  }, undefined, false, undefined, this),
                  " 1M \u4e0a\u4e0b\u6587\u5df2\u5f00\u542f",
                  /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
                    color: "subtle",
                    children: " \xb7 \u7a7a\u683c\u5207\u6362"
                  }, undefined, false, undefined, this)
                ]
              }, undefined, true, undefined, this) : /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
                color: "subtle",
                children: [
                  /* @__PURE__ */ jsx_dev_runtime.jsxDEV(EffortLevelIndicator, {
                    effort: undefined
                  }, undefined, false, undefined, this),
                  " 1M \u4e0a\u4e0b\u6587\u5df2\u5173\u95ed",
                  focusedModelName ? ` for ${focusedModelName}` : ""
                ]
              }, undefined, true, undefined, this)
            ]
          }, undefined, true, undefined, this),
          isFastModeEnabled() ? showFastModeNotice ? /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedBox_default, {
            marginBottom: 1,
            children: /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
              dimColor: true,
              children: [
                "\u5feb\u901f\u6a21\u5f0f\u5df2",
                /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
                  bold: true,
                  children: "\u5f00\u542f"
                }, undefined, false, undefined, this),
                " \uff0c\u4ec5\u652f\u6301",
                " ",
                FAST_MODE_MODEL_DISPLAY,
                " \uff08/fast\uff09\u3002\u5207\u6368\u5176\u4ed6\u6a21\u578b\u4f1a\u5173\u95ed\u5feb\u901f\u6a21\u5f0f\u3002"
              ]
            }, undefined, true, undefined, this)
          }, undefined, false, undefined, this) : isFastModeAvailable() && !isFastModeCooldown() ? /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedBox_default, {
            marginBottom: 1,
            children: /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
              dimColor: true,
              children: [
                "\u4f7f\u7528 ",
                /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
                  bold: true,
                  children: "/fast"
                }, undefined, false, undefined, this),
                " \u5f00\u542f\u5feb\u901f\u6a21\u5f0f\uff08",
                FAST_MODE_MODEL_DISPLAY,
                " \u4ec5\uff09\u3002"
              ]
            }, undefined, true, undefined, this)
          }, undefined, false, undefined, this) : null : null
        ]
      }, undefined, true, undefined, this),
      isStandaloneCommand && /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
        dimColor: true,
        italic: true,
        children: exitState.pending ? /* @__PURE__ */ jsx_dev_runtime.jsxDEV(jsx_dev_runtime.Fragment, {
          children: [
            "\u6309 ",
            exitState.keyName,
            " \u518d\u6b21\u9000\u51fa"
          ]
        }, undefined, true, undefined, this) : /* @__PURE__ */ jsx_dev_runtime.jsxDEV(Byline, {
          children: [
            /* @__PURE__ */ jsx_dev_runtime.jsxDEV(KeyboardShortcutHint, {
              shortcut: "Enter",
              action: "\u786e\u8ba4"
            }, undefined, false, undefined, this),
            /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ConfigurableShortcutHint, {
              action: "select:cancel",
              context: "Select",
              fallback: "Esc",
              description: "\u9000\u51fa"
            }, undefined, false, undefined, this)
          ]
        }, undefined, true, undefined, this)
      }, undefined, false, undefined, this)
    ]
  }, undefined, true, undefined, this);
  if (!isStandaloneCommand) {
    return content;
  }
  return /* @__PURE__ */ jsx_dev_runtime.jsxDEV(Pane, {
    color: "permission",
    children: content
  }, undefined, false, undefined, this);
}
function resolveOptionModel(value) {
  if (!value)
    return;
  return value === NO_PREFERENCE ? getDefaultMainLoopModel() : parseUserSpecifiedModel(value);
}
function EffortLevelIndicator({
  effort
}) {
  return /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
    color: effort ? "claude" : "subtle",
    children: effortLevelToSymbol(effort ?? "low")
  }, undefined, false, undefined, this);
}
function cycleEffortLevel(current, direction, includeMax) {
  const levels = includeMax ? ["low", "medium", "high", "max"] : ["low", "medium", "high"];
  const idx = levels.indexOf(current);
  const currentIndex = idx !== -1 ? idx : levels.indexOf("high");
  if (direction === "right") {
    return levels[(currentIndex + 1) % levels.length];
  } else {
    return levels[(currentIndex - 1 + levels.length) % levels.length];
  }
}
function getDefaultEffortLevelForOption(value) {
  const resolved = resolveOptionModel(value) ?? getDefaultMainLoopModel();
  const defaultValue = getDefaultEffortForModel(resolved);
  return defaultValue !== undefined ? convertEffortValueToLevel(defaultValue) : "high";
}
var import_react, jsx_dev_runtime, NO_PREFERENCE = "__NO_PREFERENCE__";
var init_ModelPicker = __esm(() => {
  init_capitalize();
  init_context();
  init_useExitOnCtrlCDWithKeybindings();
  init_analytics();
  init_fastMode();
  init_src();
  init_useKeybinding();
  init_AppState();
  init_effort();
  init_model();
  init_modelOptions();
  init_settings();
  init_ConfigurableShortcutHint();
  init_CustomSelect();
  init_src();
  init_EffortIndicator();
  import_react = __toESM(require_react(), 1);
  jsx_dev_runtime = __toESM(require_jsx_dev_runtime(), 1);
});

// src/utils/extraUsage.ts
function isBilledAsExtraUsage(model, isFastMode, isOpus1mMerged) {
  if (!isClaudeAISubscriber())
    return false;
  if (isFastMode)
    return true;
  if (model === null || !has1mContext(model))
    return false;
  const m = model.toLowerCase().replace(/\[1m\]$/, "").trim();
  const isOpus46 = m === "opus" || m.includes("opus-4-6");
  const isSonnet46 = m === "sonnet" || m.includes("sonnet-4-6");
  if (isOpus46 && isOpus1mMerged)
    return false;
  return isOpus46 || isSonnet46;
}
var init_extraUsage = __esm(() => {
  init_auth();
  init_context();
});

export { getEffortNotificationText, effortLevelToSymbol, init_EffortIndicator, ModelPicker, init_ModelPicker, isBilledAsExtraUsage, init_extraUsage };
