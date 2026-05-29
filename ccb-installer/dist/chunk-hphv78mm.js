// @bun
import {
  ConfigurableShortcutHint,
  Select,
  fetchEnvironments,
  init_ConfigurableShortcutHint,
  init_environments,
  init_select
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
  SETTING_SOURCES,
  getSettingSourceName,
  getSettingsForSource,
  getSettings_DEPRECATED,
  init_constants,
  init_settings1 as init_settings,
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
import"./chunk-padf4crh.js";
import"./chunk-crmjpsqe.js";
import {
  Byline,
  Dialog,
  KeyboardShortcutHint,
  LoadingState,
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
import"./chunk-h0rbjg6x.js";
import"./chunk-0vkfrmqm.js";
import"./chunk-0xjaqda8.js";
import"./chunk-78009jh9.js";
import"./chunk-9awawyvh.js";
import"./chunk-hqpzpr71.js";
import"./chunk-zs5b1dgr.js";
import"./chunk-hnxmafvc.js";
import"./chunk-tv74hgw9.js";
import {
  init_log,
  logError
} from "./chunk-wd8mqz95.js";
import"./chunk-8tnsngw2.js";
import"./chunk-vsbyhpfy.js";
import"./chunk-p7pj6wf8.js";
import"./chunk-5z28bqne.js";
import {
  figures_default,
  init_figures
} from "./chunk-qajrkk97.js";
import {
  init_errors,
  toError
} from "./chunk-5khwvj1z.js";
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
  __toESM
} from "./chunk-qp2qdcda.js";

// src/utils/teleport/environmentSelection.ts
async function getEnvironmentSelectionInfo() {
  const environments = await fetchEnvironments();
  if (environments.length === 0) {
    return {
      availableEnvironments: [],
      selectedEnvironment: null,
      selectedEnvironmentSource: null
    };
  }
  const mergedSettings = getSettings_DEPRECATED();
  const defaultEnvironmentId = mergedSettings?.remote?.defaultEnvironmentId;
  let selectedEnvironment = environments.find((env) => env.kind !== "bridge") ?? environments[0];
  let selectedEnvironmentSource = null;
  if (defaultEnvironmentId) {
    const matchingEnvironment = environments.find((env) => env.environment_id === defaultEnvironmentId);
    if (matchingEnvironment) {
      selectedEnvironment = matchingEnvironment;
      for (let i = SETTING_SOURCES.length - 1;i >= 0; i--) {
        const source = SETTING_SOURCES[i];
        if (!source || source === "flagSettings") {
          continue;
        }
        const sourceSettings = getSettingsForSource(source);
        if (sourceSettings?.remote?.defaultEnvironmentId === defaultEnvironmentId) {
          selectedEnvironmentSource = source;
          break;
        }
      }
    }
  }
  return {
    availableEnvironments: environments,
    selectedEnvironment,
    selectedEnvironmentSource
  };
}
var init_environmentSelection = __esm(() => {
  init_constants();
  init_settings();
  init_environments();
});

// src/components/RemoteEnvironmentDialog.tsx
function RemoteEnvironmentDialog({ onDone }) {
  const [loadingState, setLoadingState] = import_react.useState("loading");
  const [environments, setEnvironments] = import_react.useState([]);
  const [selectedEnvironment, setSelectedEnvironment] = import_react.useState(null);
  const [selectedEnvironmentSource, setSelectedEnvironmentSource] = import_react.useState(null);
  const [error, setError] = import_react.useState(null);
  import_react.useEffect(() => {
    let cancelled = false;
    async function fetchInfo() {
      try {
        const result = await getEnvironmentSelectionInfo();
        if (cancelled)
          return;
        setEnvironments(result.availableEnvironments);
        setSelectedEnvironment(result.selectedEnvironment);
        setSelectedEnvironmentSource(result.selectedEnvironmentSource);
        setLoadingState(null);
      } catch (err) {
        if (cancelled)
          return;
        const fetchError = toError(err);
        logError(fetchError);
        setError(fetchError.message);
        setLoadingState(null);
      }
    }
    fetchInfo();
    return () => {
      cancelled = true;
    };
  }, []);
  function handleSelect(value) {
    if (value === "cancel") {
      onDone();
      return;
    }
    setLoadingState("updating");
    const selectedEnv = environments.find((env) => env.environment_id === value);
    if (!selectedEnv) {
      onDone("\u6240\u9009\u73af\u5883\u672a\u627e\u5230");
      return;
    }
    updateSettingsForSource("localSettings", {
      remote: {
        defaultEnvironmentId: selectedEnv.environment_id
      }
    });
    onDone(`\u5df2\u5c06\u9ed8\u8ba4\u8fdc\u7a0b\u73af\u5883\u8bbe\u4e3a ${source_default.bold(selectedEnv.name)} (${selectedEnv.environment_id})`);
  }
  if (loadingState === "loading") {
    return /* @__PURE__ */ jsx_dev_runtime.jsxDEV(Dialog, {
      title: DIALOG_TITLE,
      onCancel: onDone,
      hideInputGuide: true,
      children: /* @__PURE__ */ jsx_dev_runtime.jsxDEV(LoadingState, {
        message: "\u6b63\u5728\u52a0\u8f7d\u73af\u5883\u2026"
      }, undefined, false, undefined, this)
    }, undefined, false, undefined, this);
  }
  if (error) {
    return /* @__PURE__ */ jsx_dev_runtime.jsxDEV(Dialog, {
      title: DIALOG_TITLE,
      onCancel: onDone,
      children: /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
        color: "error",
        children: [
          "\u9519\u8bef\uff1a ",
          error
        ]
      }, undefined, true, undefined, this)
    }, undefined, false, undefined, this);
  }
  if (!selectedEnvironment) {
    return /* @__PURE__ */ jsx_dev_runtime.jsxDEV(Dialog, {
      title: DIALOG_TITLE,
      subtitle: SETUP_HINT,
      onCancel: onDone,
      children: /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
        children: "\u6682\u65e0\u53ef\u7528\u7684\u8fdc\u7a0b\u73af\u5883\u3002"
      }, undefined, false, undefined, this)
    }, undefined, false, undefined, this);
  }
  if (environments.length === 1) {
    return /* @__PURE__ */ jsx_dev_runtime.jsxDEV(SingleEnvironmentContent, {
      environment: selectedEnvironment,
      onDone
    }, undefined, false, undefined, this);
  }
  return /* @__PURE__ */ jsx_dev_runtime.jsxDEV(MultipleEnvironmentsContent, {
    environments,
    selectedEnvironment,
    selectedEnvironmentSource,
    loadingState,
    onSelect: handleSelect,
    onCancel: onDone
  }, undefined, false, undefined, this);
}
function EnvironmentLabel({
  environment
}) {
  return /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
    children: [
      figures_default.tick,
      " \u6b63\u5728\u4f7f\u7528 ",
      /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
        bold: true,
        children: environment.name
      }, undefined, false, undefined, this),
      " ",
      /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
        dimColor: true,
        children: [
          "(",
          environment.environment_id,
          ")"
        ]
      }, undefined, true, undefined, this)
    ]
  }, undefined, true, undefined, this);
}
function SingleEnvironmentContent({
  environment,
  onDone
}) {
  useKeybinding("confirm:yes", onDone, { context: "Confirmation" });
  return /* @__PURE__ */ jsx_dev_runtime.jsxDEV(Dialog, {
    title: DIALOG_TITLE,
    subtitle: SETUP_HINT,
    onCancel: onDone,
    children: /* @__PURE__ */ jsx_dev_runtime.jsxDEV(EnvironmentLabel, {
      environment
    }, undefined, false, undefined, this)
  }, undefined, false, undefined, this);
}
function MultipleEnvironmentsContent({
  environments,
  selectedEnvironment,
  selectedEnvironmentSource,
  loadingState,
  onSelect,
  onCancel
}) {
  const sourceSuffix = selectedEnvironmentSource && selectedEnvironmentSource !== "localSettings" ? ` \uff08\u6765\u81ea ${getSettingSourceName(selectedEnvironmentSource)} \u8bbe\u7f6e\uff09` : "";
  const subtitle = /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
    children: [
      "\u5f53\u524d\u4f7f\u7528\uff1a ",
      /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
        bold: true,
        children: selectedEnvironment.name
      }, undefined, false, undefined, this),
      sourceSuffix
    ]
  }, undefined, true, undefined, this);
  return /* @__PURE__ */ jsx_dev_runtime.jsxDEV(Dialog, {
    title: DIALOG_TITLE,
    subtitle,
    onCancel,
    hideInputGuide: true,
    children: [
      /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
        dimColor: true,
        children: SETUP_HINT
      }, undefined, false, undefined, this),
      loadingState === "updating" ? /* @__PURE__ */ jsx_dev_runtime.jsxDEV(LoadingState, {
        message: "\u6b63\u5728\u66f4\u65b0\u2026"
      }, undefined, false, undefined, this) : /* @__PURE__ */ jsx_dev_runtime.jsxDEV(Select, {
        options: environments.map((env) => ({
          label: /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
            children: [
              env.name,
              " ",
              /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
                dimColor: true,
                children: [
                  "(",
                  env.environment_id,
                  ")"
                ]
              }, undefined, true, undefined, this)
            ]
          }, undefined, true, undefined, this),
          value: env.environment_id
        })),
        defaultValue: selectedEnvironment.environment_id,
        onChange: onSelect,
        onCancel: () => onSelect("cancel"),
        layout: "compact-vertical"
      }, undefined, false, undefined, this),
      /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
        dimColor: true,
        children: /* @__PURE__ */ jsx_dev_runtime.jsxDEV(Byline, {
          children: [
            /* @__PURE__ */ jsx_dev_runtime.jsxDEV(KeyboardShortcutHint, {
              shortcut: "Enter",
              action: "\u9009\u62e9"
            }, undefined, false, undefined, this),
            /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ConfigurableShortcutHint, {
              action: "confirm:no",
              context: "Confirmation",
              fallback: "Esc",
              description: "\u53d6\u6d88"
            }, undefined, false, undefined, this)
          ]
        }, undefined, true, undefined, this)
      }, undefined, false, undefined, this)
    ]
  }, undefined, true, undefined, this);
}
var import_react, jsx_dev_runtime, DIALOG_TITLE = "\u9009\u62e9\u8fdc\u7a0b\u73af\u5883", SETUP_HINT = `\u5728\u6b64\u914d\u7f6e\u73af\u5883\uff1a https://claude.ai/code`;
var init_RemoteEnvironmentDialog = __esm(() => {
  init_source();
  init_figures();
  init_src();
  init_useKeybinding();
  init_errors();
  init_log();
  init_constants();
  init_settings();
  init_environmentSelection();
  init_ConfigurableShortcutHint();
  init_select();
  init_src();
  import_react = __toESM(require_react(), 1);
  jsx_dev_runtime = __toESM(require_jsx_dev_runtime(), 1);
});

// src/commands/remote-env/remote-env.tsx
async function call(onDone) {
  return /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(RemoteEnvironmentDialog, {
    onDone
  }, undefined, false, undefined, this);
}
var jsx_dev_runtime2;
var init_remote_env = __esm(() => {
  init_RemoteEnvironmentDialog();
  jsx_dev_runtime2 = __toESM(require_jsx_dev_runtime(), 1);
});
init_remote_env();

export {
  call
};
