// @bun
import {
  useManagePlugins
} from "./chunk-501cczvn.js";
import"./chunk-4m92p4f5.js";
import {
  WelcomeV2
} from "./chunk-rk9t7am2.js";
import {
  onChangeAppState
} from "./chunk-g2yh44sk.js";
import"./chunk-erp1vm33.js";
import {
  MCPConnectionManager,
  init_MCPConnectionManager
} from "./chunk-70v3g94d.js";
import"./chunk-6br07t2f.js";
import"./chunk-63esd9a3.js";
import"./chunk-s4n6fj7k.js";
import"./chunk-hva9axqx.js";
import"./chunk-y0g2vvrc.js";
import {
  AppStateProvider,
  KeybindingSetup,
  init_AppState,
  init_KeybindingProviderSetup
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
  init_auth,
  isAnthropicAuthEnabled
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
  ThemedBox_default,
  ThemedText,
  init_src
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
  __require,
  __toESM
} from "./chunk-qp2qdcda.js";

// src/cli/handlers/util.tsx
var import_react = __toESM(require_react(), 1);
import { cwd } from "process";
init_src();
init_KeybindingProviderSetup();
init_analytics();
init_MCPConnectionManager();
init_AppState();
init_auth();
var jsx_dev_runtime = __toESM(require_jsx_dev_runtime(), 1);
async function setupTokenHandler(root) {
  logEvent("tengu_setup_token_command", {});
  const showAuthWarning = !isAnthropicAuthEnabled();
  const { ConsoleOAuthFlow } = await import("./chunk-r1f990pp.js");
  await new Promise((resolve) => {
    root.render(/* @__PURE__ */ jsx_dev_runtime.jsxDEV(AppStateProvider, {
      onChangeAppState,
      children: /* @__PURE__ */ jsx_dev_runtime.jsxDEV(KeybindingSetup, {
        children: /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedBox_default, {
          flexDirection: "column",
          gap: 1,
          children: [
            /* @__PURE__ */ jsx_dev_runtime.jsxDEV(WelcomeV2, {}, undefined, false, undefined, this),
            showAuthWarning && /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedBox_default, {
              flexDirection: "column",
              children: [
                /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
                  color: "warning",
                  children: "Warning: You already have authentication configured via environment variable or API key helper."
                }, undefined, false, undefined, this),
                /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
                  color: "warning",
                  children: "The setup-token command will create a new OAuth token which you can use instead."
                }, undefined, false, undefined, this)
              ]
            }, undefined, true, undefined, this),
            /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ConsoleOAuthFlow, {
              onDone: () => {
                resolve();
              },
              mode: "setup-token",
              startingMessage: "This will guide you through long-lived (1-year) auth token setup for your Claude account. Claude subscription required."
            }, undefined, false, undefined, this)
          ]
        }, undefined, true, undefined, this)
      }, undefined, false, undefined, this)
    }, undefined, false, undefined, this));
  });
  root.unmount();
  process.exit(0);
}
var DoctorLazy = import_react.default.lazy(() => import("./chunk-r5qrrtyn.js").then((m) => ({ default: m.Doctor })));
function DoctorWithPlugins({
  onDone
}) {
  useManagePlugins();
  return /* @__PURE__ */ jsx_dev_runtime.jsxDEV(import_react.default.Suspense, {
    fallback: null,
    children: /* @__PURE__ */ jsx_dev_runtime.jsxDEV(DoctorLazy, {
      onDone
    }, undefined, false, undefined, this)
  }, undefined, false, undefined, this);
}
async function doctorHandler(root) {
  logEvent("tengu_doctor_command", {});
  await new Promise((resolve) => {
    root.render(/* @__PURE__ */ jsx_dev_runtime.jsxDEV(AppStateProvider, {
      children: /* @__PURE__ */ jsx_dev_runtime.jsxDEV(KeybindingSetup, {
        children: /* @__PURE__ */ jsx_dev_runtime.jsxDEV(MCPConnectionManager, {
          dynamicMcpConfig: undefined,
          isStrictMcpConfig: false,
          children: /* @__PURE__ */ jsx_dev_runtime.jsxDEV(DoctorWithPlugins, {
            onDone: () => {
              resolve();
            }
          }, undefined, false, undefined, this)
        }, undefined, false, undefined, this)
      }, undefined, false, undefined, this)
    }, undefined, false, undefined, this));
  });
  root.unmount();
  process.exit(0);
}
async function installHandler(target, options) {
  const { setup } = await import("./chunk-cxp6x9vs.js");
  await setup(cwd(), "default", false, false, undefined, false);
  const { install } = await import("./chunk-qeg9xfpe.js");
  await new Promise((resolve) => {
    const args = [];
    if (target)
      args.push(target);
    if (options.force)
      args.push("--force");
    install.call((result) => {
      resolve();
      process.exit(result.includes("failed") ? 1 : 0);
    }, {}, args);
  });
}
export {
  setupTokenHandler,
  installHandler,
  doctorHandler
};
