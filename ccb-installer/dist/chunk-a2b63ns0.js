// @bun
import {
  init_setup,
  isChromeExtensionInstalled
} from "./chunk-dv364qq7.js";
import"./chunk-ym5r3jnk.js";
import"./chunk-var1et7e.js";
import"./chunk-sv7afh51.js";
import {
  init_config1 as init_config,
  saveGlobalConfig
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
import"./chunk-f5ma3nh5.js";
import"./chunk-6y2wszkc.js";
import"./chunk-3c25bcsw.js";
import"./chunk-9qh5f9r3.js";
import"./chunk-xhesahm0.js";
import"./chunk-rh5a2rg9.js";
import"./chunk-p2816w9z.js";
import"./chunk-v1kzp02e.js";
import"./chunk-padf4crh.js";
import"./chunk-crmjpsqe.js";
import {
  Dialog,
  Link,
  Newline,
  ThemedBox_default,
  ThemedText,
  init_src,
  use_input_default
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
  __toESM
} from "./chunk-qp2qdcda.js";

// src/components/ClaudeInChromeOnboarding.tsx
init_analytics();
init_src();
init_setup();
init_config();
var import_react = __toESM(require_react(), 1);
var jsx_dev_runtime = __toESM(require_jsx_dev_runtime(), 1);
var CHROME_EXTENSION_URL = "https://claude.ai/chrome";
var CHROME_PERMISSIONS_URL = "https://clau.de/chrome/permissions";
function ClaudeInChromeOnboarding({ onDone }) {
  const [isExtensionInstalled, setIsExtensionInstalled] = import_react.default.useState(false);
  import_react.default.useEffect(() => {
    logEvent("tengu_claude_in_chrome_onboarding_shown", {});
    isChromeExtensionInstalled().then(setIsExtensionInstalled);
    saveGlobalConfig((current) => {
      return { ...current, hasCompletedClaudeInChromeOnboarding: true };
    });
  }, []);
  use_input_default((_input, key) => {
    if (key.return) {
      onDone();
    }
  });
  return /* @__PURE__ */ jsx_dev_runtime.jsxDEV(Dialog, {
    title: "Claude in Chrome (Beta)",
    onCancel: onDone,
    color: "chromeYellow",
    children: /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedBox_default, {
      flexDirection: "column",
      gap: 1,
      children: [
        /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
          children: [
            "Claude in Chrome works with the Chrome extension to let you control your browser directly from Claude Code. You can navigate websites, fill forms, capture screenshots, record GIFs, and debug with console logs and network requests.",
            !isExtensionInstalled && /* @__PURE__ */ jsx_dev_runtime.jsxDEV(jsx_dev_runtime.Fragment, {
              children: [
                /* @__PURE__ */ jsx_dev_runtime.jsxDEV(Newline, {}, undefined, false, undefined, this),
                /* @__PURE__ */ jsx_dev_runtime.jsxDEV(Newline, {}, undefined, false, undefined, this),
                "Requires the Chrome extension. Get started at",
                " ",
                /* @__PURE__ */ jsx_dev_runtime.jsxDEV(Link, {
                  url: CHROME_EXTENSION_URL
                }, undefined, false, undefined, this)
              ]
            }, undefined, true, undefined, this)
          ]
        }, undefined, true, undefined, this),
        /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
          dimColor: true,
          children: [
            "Site-level permissions are inherited from the Chrome extension. Manage permissions in the Chrome extension settings to control which sites Claude can browse, click, and type on",
            isExtensionInstalled && /* @__PURE__ */ jsx_dev_runtime.jsxDEV(jsx_dev_runtime.Fragment, {
              children: [
                " ",
                "(",
                /* @__PURE__ */ jsx_dev_runtime.jsxDEV(Link, {
                  url: CHROME_PERMISSIONS_URL
                }, undefined, false, undefined, this),
                ")"
              ]
            }, undefined, true, undefined, this),
            "."
          ]
        }, undefined, true, undefined, this),
        /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
          dimColor: true,
          children: [
            "For more info, use",
            " ",
            /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
              bold: true,
              color: "chromeYellow",
              children: "/chrome"
            }, undefined, false, undefined, this),
            " ",
            "or visit ",
            /* @__PURE__ */ jsx_dev_runtime.jsxDEV(Link, {
              url: "https://code.claude.com/docs/en/chrome"
            }, undefined, false, undefined, this)
          ]
        }, undefined, true, undefined, this)
      ]
    }, undefined, true, undefined, this)
  }, undefined, false, undefined, this);
}
export {
  ClaudeInChromeOnboarding
};
