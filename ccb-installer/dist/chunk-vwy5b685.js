// @bun
import {
  init_useMainLoopModel,
  useMainLoopModel
} from "./chunk-hp7sfsyg.js";
import {
  getDisplayedEffortLevel,
  getEffortEnvOverride,
  getEffortValueDescription,
  init_AppState,
  init_effort,
  isEffortLevel,
  toPersistableEffort,
  useAppState,
  useSetAppState
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
import"./chunk-z9bw4q7j.js";
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
import"./chunk-wd8mqz95.js";
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

// src/commands/effort/effort.tsx
function setEffortValue(effortValue) {
  const persistable = toPersistableEffort(effortValue);
  if (persistable !== undefined) {
    const result = updateSettingsForSource("userSettings", {
      effortLevel: persistable
    });
    if (result.error) {
      return {
        message: `Failed to set effort level: ${result.error.message}`
      };
    }
  }
  logEvent("tengu_effort_command", {
    effort: effortValue
  });
  const envOverride = getEffortEnvOverride();
  if (envOverride !== undefined && envOverride !== effortValue) {
    const envRaw = process.env.CLAUDE_CODE_EFFORT_LEVEL;
    if (persistable === undefined) {
      return {
        message: `Not applied: CLAUDE_CODE_EFFORT_LEVEL=${envRaw} overrides effort this session, and ${effortValue} is session-only (nothing saved)`,
        effortUpdate: { value: effortValue }
      };
    }
    return {
      message: `CLAUDE_CODE_EFFORT_LEVEL=${envRaw} overrides this session \u2014 clear it and ${effortValue} takes over`,
      effortUpdate: { value: effortValue }
    };
  }
  const description = getEffortValueDescription(effortValue);
  const suffix = persistable !== undefined ? "" : " (this session only)";
  return {
    message: `Set effort level to ${effortValue}${suffix}: ${description}`,
    effortUpdate: { value: effortValue }
  };
}
function showCurrentEffort(appStateEffort, model) {
  const envOverride = getEffortEnvOverride();
  const effectiveValue = envOverride === null ? undefined : envOverride ?? appStateEffort;
  if (effectiveValue === undefined) {
    const level = getDisplayedEffortLevel(model, appStateEffort);
    return { message: `Effort level: auto (currently ${level})` };
  }
  const description = getEffortValueDescription(effectiveValue);
  return {
    message: `Current effort level: ${effectiveValue} (${description})`
  };
}
function unsetEffortLevel() {
  const result = updateSettingsForSource("userSettings", {
    effortLevel: undefined
  });
  if (result.error) {
    return {
      message: `Failed to set effort level: ${result.error.message}`
    };
  }
  logEvent("tengu_effort_command", {
    effort: "auto"
  });
  const envOverride = getEffortEnvOverride();
  if (envOverride !== undefined && envOverride !== null) {
    const envRaw = process.env.CLAUDE_CODE_EFFORT_LEVEL;
    return {
      message: `Cleared effort from settings, but CLAUDE_CODE_EFFORT_LEVEL=${envRaw} still controls this session`,
      effortUpdate: { value: undefined }
    };
  }
  return {
    message: "Effort level set to auto",
    effortUpdate: { value: undefined }
  };
}
function executeEffort(args) {
  const normalized = args.toLowerCase();
  if (normalized === "auto" || normalized === "unset") {
    return unsetEffortLevel();
  }
  if (!isEffortLevel(normalized)) {
    return {
      message: `Invalid argument: ${args}. Valid options are: low, medium, high, max, auto`
    };
  }
  return setEffortValue(normalized);
}
function ShowCurrentEffort({
  onDone
}) {
  const effortValue = useAppState((s) => s.effortValue);
  const model = useMainLoopModel();
  const { message } = showCurrentEffort(effortValue, model);
  onDone(message);
  return null;
}
function ApplyEffortAndClose({
  result,
  onDone
}) {
  const setAppState = useSetAppState();
  const { effortUpdate, message } = result;
  React.useEffect(() => {
    if (effortUpdate) {
      setAppState((prev) => ({
        ...prev,
        effortValue: effortUpdate.value
      }));
    }
    onDone(message);
  }, [setAppState, effortUpdate, message, onDone]);
  return null;
}
async function call(onDone, _context, args) {
  args = args?.trim() || "";
  if (COMMON_HELP_ARGS.includes(args)) {
    onDone(`Usage: /effort [low|medium|high|max|auto]

Effort levels:
- low: Quick, straightforward implementation
- medium: Balanced approach with standard testing
- high: Comprehensive implementation with extensive testing
- max: Maximum capability with deepest reasoning (Opus 4.6 only)
- auto: Use the default effort level for your model`);
    return;
  }
  if (!args || args === "current" || args === "status") {
    return /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ShowCurrentEffort, {
      onDone
    }, undefined, false, undefined, this);
  }
  const result = executeEffort(args);
  return /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ApplyEffortAndClose, {
    result,
    onDone
  }, undefined, false, undefined, this);
}
var React, jsx_dev_runtime, COMMON_HELP_ARGS;
var init_effort2 = __esm(() => {
  init_useMainLoopModel();
  init_analytics();
  init_AppState();
  init_effort();
  init_settings();
  React = __toESM(require_react(), 1);
  jsx_dev_runtime = __toESM(require_jsx_dev_runtime(), 1);
  COMMON_HELP_ARGS = ["help", "-h", "--help"];
});
init_effort2();

export {
  showCurrentEffort,
  executeEffort,
  call
};
