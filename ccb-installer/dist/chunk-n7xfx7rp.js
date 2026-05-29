// @bun
import {
  init_ListItem
} from "./chunk-kt36qhep.js";
import {
  buildCliLaunch,
  init_cliLaunch,
  spawnCli
} from "./chunk-r5mqktt5.js";
import {
  init_Dialog
} from "./chunk-ng1fnnp8.js";
import {
  init_overlayContext,
  useRegisterOverlay
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
import"./chunk-mk2vzd2n.js";
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
  Dialog,
  ListItem,
  ThemedBox_default,
  ThemedText,
  init_src,
  useKeybindings
} from "./chunk-z9bw4q7j.js";
import {
  require_jsx_dev_runtime,
  require_react
} from "./chunk-evwb3c85.js";
import"./chunk-h0rbjg6x.js";
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
import"./chunk-tv74hgw9.js";
import"./chunk-wd8mqz95.js";
import"./chunk-8tnsngw2.js";
import"./chunk-vsbyhpfy.js";
import"./chunk-p7pj6wf8.js";
import"./chunk-5z28bqne.js";
import"./chunk-qajrkk97.js";
import"./chunk-5khwvj1z.js";
import"./chunk-fbv4apne.js";
import {
  getKairosActive,
  init_state,
  setKairosActive
} from "./chunk-gzp6rza1.js";
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

// src/commands/assistant/assistant.tsx
import { resolve } from "path";
async function computeDefaultInstallDir() {
  const cwd = process.cwd();
  const gitRoot = findGitRoot(cwd);
  return gitRoot || resolve(cwd);
}
function NewInstallWizard({ defaultDir, onInstalled, onCancel, onError }) {
  useRegisterOverlay("assistant-install-wizard");
  const [focusIndex, setFocusIndex] = import_react.useState(0);
  const [starting, setStarting] = import_react.useState(false);
  useKeybindings({
    "select:next": () => setFocusIndex((i) => (i + 1) % 2),
    "select:previous": () => setFocusIndex((i) => (i - 1 + 2) % 2),
    "select:accept": () => {
      if (focusIndex === 0) {
        startDaemon();
      } else {
        onCancel();
      }
    }
  }, { context: "Select" });
  function startDaemon() {
    if (starting)
      return;
    setStarting(true);
    const dir = defaultDir || resolve(".");
    try {
      const launch = buildCliLaunch(["daemon", "start", `--dir=${dir}`]);
      const child = spawnCli(launch, {
        cwd: dir,
        stdio: "ignore",
        detached: true
      });
      child.unref();
      child.on("error", (err) => {
        onError(`Failed to start daemon: ${err.message}`);
      });
      setTimeout(() => {
        onInstalled(dir);
      }, 1500);
    } catch (err) {
      onError(`Failed to start daemon: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  if (starting) {
    return /* @__PURE__ */ jsx_dev_runtime.jsxDEV(Dialog, {
      title: "Assistant Setup",
      onCancel,
      hideInputGuide: true,
      children: /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
        children: [
          "Starting daemon in ",
          defaultDir,
          "..."
        ]
      }, undefined, true, undefined, this)
    }, undefined, false, undefined, this);
  }
  return /* @__PURE__ */ jsx_dev_runtime.jsxDEV(Dialog, {
    title: "Assistant Setup",
    onCancel,
    hideInputGuide: true,
    children: /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedBox_default, {
      flexDirection: "column",
      gap: 1,
      children: [
        /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
          children: "No active assistant sessions found."
        }, undefined, false, undefined, this),
        /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
          children: [
            "Start a daemon in ",
            /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
              bold: true,
              children: defaultDir || "."
            }, undefined, false, undefined, this),
            " to create a cloud session?"
          ]
        }, undefined, true, undefined, this),
        /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedBox_default, {
          flexDirection: "column",
          children: [
            /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ListItem, {
              isFocused: focusIndex === 0,
              children: /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
                children: "Start assistant daemon"
              }, undefined, false, undefined, this)
            }, undefined, false, undefined, this),
            /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ListItem, {
              isFocused: focusIndex === 1,
              children: /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
                children: "Cancel"
              }, undefined, false, undefined, this)
            }, undefined, false, undefined, this)
          ]
        }, undefined, true, undefined, this),
        /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
          dimColor: true,
          children: "Enter \u9009\u62e9 \u00b7 Esc \u53d6\u6d88"
        }, undefined, false, undefined, this)
      ]
    }, undefined, true, undefined, this)
  }, undefined, false, undefined, this);
}
async function call(onDone, context, _args) {
  const { setAppState, getAppState } = context;
  if (!getKairosActive()) {
    setKairosActive(true);
    setAppState((prev) => ({
      ...prev,
      kairosEnabled: true,
      assistantPanelVisible: true
    }));
    onDone("KAIROS assistant mode activated.", { display: "system" });
    return null;
  }
  const current = getAppState();
  const isVisible = current.assistantPanelVisible;
  if (isVisible) {
    setAppState((prev) => ({
      ...prev,
      assistantPanelVisible: false
    }));
    onDone("Assistant panel hidden.", { display: "system" });
  } else {
    setAppState((prev) => ({
      ...prev,
      assistantPanelVisible: true
    }));
    onDone("Assistant panel opened.", { display: "system" });
  }
  return null;
}
var import_react, jsx_dev_runtime;
var init_assistant = __esm(() => {
  init_src();
  init_Dialog();
  init_ListItem();
  init_overlayContext();
  init_useKeybinding();
  init_git();
  init_cliLaunch();
  init_state();
  import_react = __toESM(require_react(), 1);
  jsx_dev_runtime = __toESM(require_jsx_dev_runtime(), 1);
});
init_assistant();

export {
  computeDefaultInstallDir,
  call,
  NewInstallWizard
};
