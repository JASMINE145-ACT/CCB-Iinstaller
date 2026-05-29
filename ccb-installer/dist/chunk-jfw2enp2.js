// @bun
import {
  init_setup,
  isChromeExtensionInstalled
} from "./chunk-dv364qq7.js";
import"./chunk-ym5r3jnk.js";
import {
  Select,
  init_AppState,
  init_select,
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
import {
  CLAUDE_IN_CHROME_MCP_SERVER_NAME,
  init_common,
  openInChrome
} from "./chunk-sv7afh51.js";
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
import {
  init_browser,
  openBrowser
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
  getGlobalConfig,
  init_auth,
  init_config1 as init_config,
  isClaudeAISubscriber,
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
import"./chunk-padf4crh.js";
import"./chunk-crmjpsqe.js";
import {
  Dialog,
  ThemedBox_default,
  ThemedText,
  init_src
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
import {
  init_envUtils,
  isRunningOnHomespace
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

// src/commands/chrome/chrome.tsx
function ClaudeInChromeMenu({
  onDone,
  isExtensionInstalled: installed,
  configEnabled,
  isClaudeAISubscriber: isClaudeAISubscriber2,
  isWSL
}) {
  const mcpClients = useAppState((s) => s.mcp.clients);
  const [selectKey, setSelectKey] = import_react.useState(0);
  const [enabledByDefault, setEnabledByDefault] = import_react.useState(configEnabled ?? false);
  const [showInstallHint, setShowInstallHint] = import_react.useState(false);
  const [isExtensionInstalled, setIsExtensionInstalled] = import_react.useState(installed);
  const isHomespace = process.env.USER_TYPE === "ant" && isRunningOnHomespace();
  const chromeClient = mcpClients.find((c) => c.name === CLAUDE_IN_CHROME_MCP_SERVER_NAME);
  const isConnected = chromeClient?.type === "connected";
  function openUrl(url) {
    if (isHomespace) {
      openBrowser(url);
    } else {
      openInChrome(url);
    }
  }
  function handleAction(action) {
    switch (action) {
      case "install-extension":
        setSelectKey((k) => k + 1);
        setShowInstallHint(true);
        openUrl(CHROME_EXTENSION_URL);
        break;
      case "reconnect":
        setSelectKey((k) => k + 1);
        isChromeExtensionInstalled().then((installed2) => {
          setIsExtensionInstalled(installed2);
          if (installed2) {
            setShowInstallHint(false);
          }
        });
        openUrl(CHROME_RECONNECT_URL);
        break;
      case "manage-permissions":
        setSelectKey((k) => k + 1);
        openUrl(CHROME_PERMISSIONS_URL);
        break;
      case "toggle-default": {
        const newValue = !enabledByDefault;
        saveGlobalConfig((current) => ({
          ...current,
          claudeInChromeDefaultEnabled: newValue
        }));
        setEnabledByDefault(newValue);
        break;
      }
    }
  }
  const options = [];
  const requiresExtensionSuffix = isExtensionInstalled ? "" : " (requires extension)";
  if (!isExtensionInstalled && !isHomespace) {
    options.push({
      label: "Install Chrome extension",
      value: "install-extension"
    });
  }
  options.push({
    label: /* @__PURE__ */ jsx_dev_runtime.jsxDEV(jsx_dev_runtime.Fragment, {
      children: [
        /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
          children: "\u7ba1\u7406\u6743\u9650"
        }, undefined, false, undefined, this),
        /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
          dimColor: true,
          children: requiresExtensionSuffix
        }, undefined, false, undefined, this)
      ]
    }, undefined, true, undefined, this),
    value: "manage-permissions"
  }, {
    label: /* @__PURE__ */ jsx_dev_runtime.jsxDEV(jsx_dev_runtime.Fragment, {
      children: [
        /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
          children: "\u91cd\u65b0\u8fde\u63a5\u6269\u5c55"
        }, undefined, false, undefined, this),
        /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
          dimColor: true,
          children: requiresExtensionSuffix
        }, undefined, false, undefined, this)
      ]
    }, undefined, true, undefined, this),
    value: "reconnect"
  }, {
    label: `Enabled by default: ${enabledByDefault ? "Yes" : "No"}`,
    value: "toggle-default"
  });
  const isDisabled = isWSL || process.env.USER_TYPE !== "ant" && !isClaudeAISubscriber2;
  return /* @__PURE__ */ jsx_dev_runtime.jsxDEV(Dialog, {
    title: "Claude in Chrome (Beta)",
    onCancel: () => onDone(),
    color: "chromeYellow",
    children: /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedBox_default, {
      flexDirection: "column",
      gap: 1,
      children: [
        /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
          children: "Claude in Chrome \u914d\u5408 Chrome \u6269\u5c55\uff0c\u53ef\u4ece Claude Code \u76f4\u63a5\u63a7\u5236\u6d4f\u89c8\u5668\u3002\u6d4f\u89c8\u7f51\u9875\u3001\u586b\u5199\u8868\u5355\u3001\u622a\u56fe\u3001\u5f55\u5236 GIF\uff0c\u4ee5\u53ca\u901a\u8fc7\u63a7\u5236\u53f0\u65e5\u5fd7\u548c\u7f51\u7edc\u8bf7\u6c42\u8c03\u8bd5\u3002"
        }, undefined, false, undefined, this),
        isWSL && /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
          color: "error",
          children: "Claude in Chrome \u6682\u4e0d\u652f\u6301 WSL\u3002"
        }, undefined, false, undefined, this),
        process.env.USER_TYPE !== "ant" && !isClaudeAISubscriber2 && /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
          color: "error",
          children: "Claude in Chrome \u9700\u8981 claude.ai \u8ba2\u9605\u3002"
        }, undefined, false, undefined, this),
        !isDisabled && /* @__PURE__ */ jsx_dev_runtime.jsxDEV(jsx_dev_runtime.Fragment, {
          children: [
            !isHomespace && /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedBox_default, {
              flexDirection: "column",
              children: [
                /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
                  children: [
                    "Status:",
                    " ",
                    isConnected ? /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
                      color: "success",
                      children: "\u5df2\u542f\u7528"
                    }, undefined, false, undefined, this) : /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
                      color: "inactive",
                      children: "\u5df2\u7981\u7528"
                    }, undefined, false, undefined, this)
                  ]
                }, undefined, true, undefined, this),
                /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
                  children: [
                    "Extension:",
                    " ",
                    isExtensionInstalled ? /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
                      color: "success",
                      children: "\u5df2\u5b89\u88c5"
                    }, undefined, false, undefined, this) : /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
                      color: "warning",
                      children: "\u672a\u68c0\u6d4b\u5230"
                    }, undefined, false, undefined, this)
                  ]
                }, undefined, true, undefined, this)
              ]
            }, undefined, true, undefined, this),
            /* @__PURE__ */ jsx_dev_runtime.jsxDEV(Select, {
              options,
              onChange: handleAction,
              hideIndexes: true
            }, selectKey, false, undefined, this),
            showInstallHint && /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
              color: "warning",
              children: [
                "Once installed, select ",
                '"Reconnect extension"',
                " to connect."
              ]
            }, undefined, true, undefined, this),
            /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
              children: [
                /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
                  dimColor: true,
                  children: "\u7528\u6cd5\uff1a "
                }, undefined, false, undefined, this),
                /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
                  children: "claude --chrome"
                }, undefined, false, undefined, this),
                /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
                  dimColor: true,
                  children: " or "
                }, undefined, false, undefined, this),
                /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
                  children: "claude --no-chrome"
                }, undefined, false, undefined, this)
              ]
            }, undefined, true, undefined, this),
            /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
              dimColor: true,
              children: "\u7ad9\u70b9\u6743\u9650\u6765\u81ea Chrome \u6269\u5c55\u3002\u5728\u6269\u5c55\u8bbe\u7f6e\u4e2d\u7ba1\u7406\u6743\u9650\uff0c\u63a7\u5236 Claude \u53ef\u6d4f\u89c8\u3001\u70b9\u51fb\u548c\u8f93\u5165\u7684\u7f51\u7ad9\u3002"
            }, undefined, false, undefined, this)
          ]
        }, undefined, true, undefined, this),
        /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
          dimColor: true,
          children: "\u4e86\u89e3\u66f4\u591a\uff1a https://code.claude.com/docs/en/chrome"
        }, undefined, false, undefined, this)
      ]
    }, undefined, true, undefined, this)
  }, undefined, false, undefined, this);
}
var import_react, jsx_dev_runtime, CHROME_EXTENSION_URL = "https://claude.ai/chrome", CHROME_PERMISSIONS_URL = "https://clau.de/chrome/permissions", CHROME_RECONNECT_URL = "https://clau.de/chrome/reconnect", call = async function(onDone) {
  const isExtensionInstalled = await isChromeExtensionInstalled();
  const config = getGlobalConfig();
  const isSubscriber = isClaudeAISubscriber();
  const isWSL = env.isWslEnvironment();
  return /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ClaudeInChromeMenu, {
    onDone,
    isExtensionInstalled,
    configEnabled: config.claudeInChromeDefaultEnabled,
    isClaudeAISubscriber: isSubscriber,
    isWSL
  }, undefined, false, undefined, this);
};
var init_chrome = __esm(() => {
  init_select();
  init_src();
  init_src();
  init_AppState();
  init_auth();
  init_browser();
  init_common();
  init_setup();
  init_config();
  init_env();
  init_envUtils();
  import_react = __toESM(require_react(), 1);
  jsx_dev_runtime = __toESM(require_jsx_dev_runtime(), 1);
});
init_chrome();

export {
  call
};
