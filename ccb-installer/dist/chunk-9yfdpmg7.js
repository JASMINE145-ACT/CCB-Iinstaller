// @bun
import {
  ModelPicker,
  init_ModelPicker,
  init_extraUsage,
  isBilledAsExtraUsage
} from "./chunk-epvn7n5s.js";
import {
  checkOpus1mAccess,
  checkSonnet1mAccess,
  init_AppState,
  init_check1mAccess,
  init_validateModel,
  useAppState,
  useSetAppState,
  validateModel
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
  MODEL_ALIASES,
  clearFastModeCooldown,
  getDefaultMainLoopModelSetting,
  init_aliases,
  init_fastMode,
  init_model,
  init_modelAllowlist,
  isFastModeAvailable,
  isFastModeEnabled,
  isFastModeSupportedByModel,
  isModelAllowed,
  isOpus1mMergeEnabled,
  renderDefaultModelSetting
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
  init_source,
  source_default
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
import"./chunk-9awawyvh.js";
import"./chunk-hqpzpr71.js";
import"./chunk-zs5b1dgr.js";
import"./chunk-hnxmafvc.js";
import"./chunk-tv74hgw9.js";
import {
  COMMON_HELP_ARGS,
  COMMON_INFO_ARGS,
  init_xml
} from "./chunk-wd8mqz95.js";
import"./chunk-8tnsngw2.js";
import"./chunk-vsbyhpfy.js";
import"./chunk-p7pj6wf8.js";
import"./chunk-5z28bqne.js";
import"./chunk-qajrkk97.js";
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
  __toESM
} from "./chunk-qp2qdcda.js";

// src/commands/model/model.tsx
function ModelPickerWrapper({
  onDone
}) {
  const mainLoopModel = useAppState((s) => s.mainLoopModel);
  const mainLoopModelForSession = useAppState((s) => s.mainLoopModelForSession);
  const isFastMode = useAppState((s) => s.fastMode);
  const setAppState = useSetAppState();
  function handleCancel() {
    logEvent("tengu_model_command_menu", {
      action: "cancel"
    });
    const displayModel = renderModelLabel(mainLoopModel);
    onDone(`Kept model as ${source_default.bold(displayModel)}`, {
      display: "system"
    });
  }
  function handleSelect(model, effort) {
    logEvent("tengu_model_command_menu", {
      action: model,
      from_model: mainLoopModel,
      to_model: model
    });
    setAppState((prev) => ({
      ...prev,
      mainLoopModel: model,
      mainLoopModelForSession: null
    }));
    let message = `Set model to ${source_default.bold(renderModelLabel(model))}`;
    if (effort !== undefined) {
      message += ` with ${source_default.bold(effort)} effort`;
    }
    let wasFastModeToggledOn = undefined;
    if (isFastModeEnabled()) {
      clearFastModeCooldown();
      if (!isFastModeSupportedByModel(model) && isFastMode) {
        setAppState((prev) => ({
          ...prev,
          fastMode: false
        }));
        wasFastModeToggledOn = false;
      } else if (isFastModeSupportedByModel(model) && isFastModeAvailable() && isFastMode) {
        message += ` \xB7 Fast mode ON`;
        wasFastModeToggledOn = true;
      }
    }
    if (isBilledAsExtraUsage(model, wasFastModeToggledOn === true, isOpus1mMergeEnabled())) {
      message += ` \xB7 Billed as extra usage`;
    }
    if (wasFastModeToggledOn === false) {
      message += ` \xB7 Fast mode OFF`;
    }
    onDone(message);
  }
  return /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ModelPicker, {
    initial: mainLoopModel,
    sessionModel: mainLoopModelForSession,
    onSelect: handleSelect,
    onCancel: handleCancel,
    isStandaloneCommand: true,
    showFastModeNotice: isFastModeEnabled() && isFastMode && isFastModeSupportedByModel(mainLoopModel) && isFastModeAvailable()
  }, undefined, false, undefined, this);
}
function SetModelAndClose({
  args,
  onDone
}) {
  const isFastMode = useAppState((s) => s.fastMode);
  const setAppState = useSetAppState();
  const model = args === "default" ? null : args;
  React.useEffect(() => {
    async function handleModelChange() {
      if (model && !isModelAllowed(model)) {
        onDone(`Model '${model}' is not available. Your organization restricts model selection.`, { display: "system" });
        return;
      }
      if (model && isOpus1mUnavailable(model)) {
        onDone(`Opus 4.6 with 1M context is not available for your account. Learn more: https://code.claude.com/docs/en/model-config#extended-context-with-1m`, { display: "system" });
        return;
      }
      if (model && isSonnet1mUnavailable(model)) {
        onDone(`Sonnet 4.6 with 1M context is not available for your account. Learn more: https://code.claude.com/docs/en/model-config#extended-context-with-1m`, { display: "system" });
        return;
      }
      if (!model) {
        setModel(null);
        return;
      }
      if (isKnownAlias(model)) {
        setModel(model);
        return;
      }
      try {
        const { valid, error } = await validateModel(model);
        if (valid) {
          setModel(model);
        } else {
          onDone(error || `Model '${model}' not found`, {
            display: "system"
          });
        }
      } catch (error) {
        onDone(`Failed to validate model: ${error.message}`, {
          display: "system"
        });
      }
    }
    function setModel(modelValue) {
      setAppState((prev) => ({
        ...prev,
        mainLoopModel: modelValue,
        mainLoopModelForSession: null
      }));
      let message = `Set model to ${source_default.bold(renderModelLabel(modelValue))}`;
      let wasFastModeToggledOn = undefined;
      if (isFastModeEnabled()) {
        clearFastModeCooldown();
        if (!isFastModeSupportedByModel(modelValue) && isFastMode) {
          setAppState((prev) => ({
            ...prev,
            fastMode: false
          }));
          wasFastModeToggledOn = false;
        } else if (isFastModeSupportedByModel(modelValue) && isFastMode) {
          message += ` \xB7 Fast mode ON`;
          wasFastModeToggledOn = true;
        }
      }
      if (isBilledAsExtraUsage(modelValue, wasFastModeToggledOn === true, isOpus1mMergeEnabled())) {
        message += ` \xB7 Billed as extra usage`;
      }
      if (wasFastModeToggledOn === false) {
        message += ` \xB7 Fast mode OFF`;
      }
      onDone(message);
    }
    handleModelChange();
  }, [model, onDone, setAppState]);
  return null;
}
function isKnownAlias(model) {
  return MODEL_ALIASES.includes(model.toLowerCase().trim());
}
function isOpus1mUnavailable(model) {
  const m = model.toLowerCase();
  return !checkOpus1mAccess() && !isOpus1mMergeEnabled() && m.includes("opus") && m.includes("[1m]");
}
function isSonnet1mUnavailable(model) {
  const m = model.toLowerCase();
  return !checkSonnet1mAccess() && (m.includes("sonnet[1m]") || m.includes("sonnet-4-6[1m]"));
}
function ShowModelAndClose({
  onDone
}) {
  const mainLoopModel = useAppState((s) => s.mainLoopModel);
  const mainLoopModelForSession = useAppState((s) => s.mainLoopModelForSession);
  const effortValue = useAppState((s) => s.effortValue);
  const displayModel = renderModelLabel(mainLoopModel);
  const effortInfo = effortValue !== undefined ? ` (effort: ${effortValue})` : "";
  if (mainLoopModelForSession) {
    onDone(`Current model: ${source_default.bold(renderModelLabel(mainLoopModelForSession))} (session override from plan mode)
Base model: ${displayModel}${effortInfo}`);
  } else {
    onDone(`Current model: ${displayModel}${effortInfo}`);
  }
  return null;
}
function renderModelLabel(model) {
  const rendered = renderDefaultModelSetting(model ?? getDefaultMainLoopModelSetting());
  return model === null ? `${rendered} (default)` : rendered;
}
var React, jsx_dev_runtime, call = async (onDone, _context, args) => {
  args = args?.trim() || "";
  if (COMMON_INFO_ARGS.includes(args)) {
    logEvent("tengu_model_command_inline_help", {
      args
    });
    return /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ShowModelAndClose, {
      onDone
    }, undefined, false, undefined, this);
  }
  if (COMMON_HELP_ARGS.includes(args)) {
    onDone("Run /model to open the model selection menu, or /model [modelName] to set the model.", { display: "system" });
    return;
  }
  if (args) {
    logEvent("tengu_model_command_inline", {
      args
    });
    return /* @__PURE__ */ jsx_dev_runtime.jsxDEV(SetModelAndClose, {
      args,
      onDone
    }, undefined, false, undefined, this);
  }
  return /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ModelPickerWrapper, {
    onDone
  }, undefined, false, undefined, this);
};
var init_model2 = __esm(() => {
  init_source();
  init_ModelPicker();
  init_xml();
  init_analytics();
  init_AppState();
  init_extraUsage();
  init_fastMode();
  init_aliases();
  init_check1mAccess();
  init_model();
  init_modelAllowlist();
  init_validateModel();
  React = __toESM(require_react(), 1);
  jsx_dev_runtime = __toESM(require_jsx_dev_runtime(), 1);
});
init_model2();

export {
  call
};
