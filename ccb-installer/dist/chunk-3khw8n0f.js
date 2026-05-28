// @bun
import {
  Select,
  init_CustomSelect
} from "./chunk-xg5k46jr.js";
import {
  init_config1 as init_config,
  saveGlobalConfig
} from "./chunk-mk2vzd2n.js";
import {
  Dialog,
  ThemedText,
  init_src
} from "./chunk-z9bw4q7j.js";
import {
  require_jsx_dev_runtime
} from "./chunk-evwb3c85.js";
import {
  __toESM
} from "./chunk-qp2qdcda.js";

// src/components/ApproveApiKey.tsx
init_src();
init_config();
init_CustomSelect();
var jsx_dev_runtime = __toESM(require_jsx_dev_runtime(), 1);
function ApproveApiKey({
  customApiKeyTruncated,
  onDone
}) {
  function onChange(value) {
    switch (value) {
      case "yes": {
        saveGlobalConfig((current) => ({
          ...current,
          customApiKeyResponses: {
            ...current.customApiKeyResponses,
            approved: [
              ...current.customApiKeyResponses?.approved ?? [],
              customApiKeyTruncated
            ]
          }
        }));
        onDone(true);
        break;
      }
      case "no": {
        saveGlobalConfig((current) => ({
          ...current,
          customApiKeyResponses: {
            ...current.customApiKeyResponses,
            rejected: [
              ...current.customApiKeyResponses?.rejected ?? [],
              customApiKeyTruncated
            ]
          }
        }));
        onDone(false);
        break;
      }
    }
  }
  return /* @__PURE__ */ jsx_dev_runtime.jsxDEV(Dialog, {
    title: "Detected a custom API key in your environment",
    color: "warning",
    onCancel: () => onChange("no"),
    children: [
      /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
        children: [
          /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
            bold: true,
            children: "ANTHROPIC_API_KEY"
          }, undefined, false, undefined, this),
          /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
            children: [
              ": sk-ant-...",
              customApiKeyTruncated
            ]
          }, undefined, true, undefined, this)
        ]
      }, undefined, true, undefined, this),
      /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
        children: "Do you want to use this API key?"
      }, undefined, false, undefined, this),
      /* @__PURE__ */ jsx_dev_runtime.jsxDEV(Select, {
        defaultValue: "no",
        defaultFocusValue: "no",
        options: [
          { label: "Yes", value: "yes" },
          {
            label: /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
              children: [
                "No (",
                /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
                  bold: true,
                  children: "recommended"
                }, undefined, false, undefined, this),
                ")"
              ]
            }, undefined, true, undefined, this),
            value: "no"
          }
        ],
        onChange: (value) => onChange(value),
        onCancel: () => onChange("no")
      }, undefined, false, undefined, this)
    ]
  }, undefined, true, undefined, this);
}

export { ApproveApiKey };
