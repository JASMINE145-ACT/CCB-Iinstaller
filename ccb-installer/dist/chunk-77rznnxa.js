// @bun
import {
  BashTool,
  ShellProgressMessage,
  UserBashInputMessage,
  createSyntheticUserCaveatMessage,
  createUserInterruptionMessage,
  createUserMessage,
  escapeXml,
  exports_PowerShellTool,
  init_BashTool,
  init_PowerShellTool,
  init_ShellProgressMessage,
  init_UserBashInputMessage,
  init_messages1 as init_messages,
  init_shellToolUtils,
  init_toolResultStorage,
  init_xml,
  isPowerShellToolEnabled,
  prepareUserContent,
  processToolResultBlock
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
  getInitialSettings,
  init_settings1 as init_settings
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
  init_src
} from "./chunk-z9bw4q7j.js";
import {
  require_jsx_dev_runtime
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
import {
  ShellError,
  errorMessage,
  init_errors
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
  __toCommonJS,
  __toESM
} from "./chunk-qp2qdcda.js";

// src/utils/processUserInput/processBashCommand.tsx
import { randomUUID } from "crypto";

// src/components/BashModeProgress.tsx
init_src();
init_BashTool();
init_UserBashInputMessage();
init_ShellProgressMessage();
var jsx_dev_runtime = __toESM(require_jsx_dev_runtime(), 1);
function BashModeProgress({
  input,
  progress,
  verbose
}) {
  return /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedBox_default, {
    flexDirection: "column",
    marginTop: 1,
    children: [
      /* @__PURE__ */ jsx_dev_runtime.jsxDEV(UserBashInputMessage, {
        addMargin: false,
        param: { text: `<bash-input>${input}</bash-input>`, type: "text" }
      }, undefined, false, undefined, this),
      progress ? /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ShellProgressMessage, {
        fullOutput: progress.fullOutput,
        output: progress.output,
        elapsedTimeSeconds: progress.elapsedTimeSeconds,
        totalLines: progress.totalLines,
        verbose
      }, undefined, false, undefined, this) : BashTool.renderToolUseProgressMessage?.([], {
        verbose,
        tools: [],
        terminalSize: undefined
      })
    ]
  }, undefined, true, undefined, this);
}

// src/utils/processUserInput/processBashCommand.tsx
init_BashTool();
init_analytics();
init_errors();
init_messages();

// src/utils/shell/resolveDefaultShell.ts
init_settings();
function resolveDefaultShell() {
  return getInitialSettings().defaultShell ?? "bash";
}

// src/utils/processUserInput/processBashCommand.tsx
init_shellToolUtils();
init_toolResultStorage();
init_xml();
var jsx_dev_runtime2 = __toESM(require_jsx_dev_runtime(), 1);
async function processBashCommand(inputString, precedingInputBlocks, attachmentMessages, context, setToolJSX) {
  const usePowerShell = isPowerShellToolEnabled() && resolveDefaultShell() === "powershell";
  logEvent("tengu_input_bash", { powershell: usePowerShell });
  const userMessage = createUserMessage({
    content: prepareUserContent({
      inputString: `<bash-input>${inputString}</bash-input>`,
      precedingInputBlocks
    })
  });
  let jsx;
  setToolJSX({
    jsx: /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(BashModeProgress, {
      input: inputString,
      progress: null,
      verbose: context.options.verbose
    }, undefined, false, undefined, this),
    shouldHidePromptInput: false
  });
  try {
    const bashModeContext = {
      ...context,
      setToolJSX: (_) => {
        jsx = _?.jsx;
      }
    };
    const onProgress = (progress) => {
      setToolJSX({
        jsx: /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(jsx_dev_runtime2.Fragment, {
          children: [
            /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(BashModeProgress, {
              input: inputString,
              progress: progress.data,
              verbose: context.options.verbose
            }, undefined, false, undefined, this),
            jsx
          ]
        }, undefined, true, undefined, this),
        shouldHidePromptInput: false,
        showSpinner: false
      });
    };
    let PowerShellTool = null;
    if (usePowerShell) {
      PowerShellTool = (init_PowerShellTool(), __toCommonJS(exports_PowerShellTool)).PowerShellTool;
    }
    const shellTool = PowerShellTool ?? BashTool;
    const response = PowerShellTool ? await PowerShellTool.call({ command: inputString, dangerouslyDisableSandbox: true }, bashModeContext, undefined, undefined, onProgress) : await BashTool.call({
      command: inputString,
      dangerouslyDisableSandbox: true
    }, bashModeContext, undefined, undefined, onProgress);
    const data = response.data;
    if (!data) {
      throw new Error("No result received from shell command");
    }
    const stderr = data.stderr;
    const mapped = await processToolResultBlock(shellTool, { ...data, stderr: "" }, randomUUID());
    const stdout = typeof mapped.content === "string" ? mapped.content : escapeXml(data.stdout);
    return {
      messages: [
        createSyntheticUserCaveatMessage(),
        userMessage,
        ...attachmentMessages,
        createUserMessage({
          content: `<bash-stdout>${stdout}</bash-stdout><bash-stderr>${escapeXml(stderr)}</bash-stderr>`
        })
      ],
      shouldQuery: false
    };
  } catch (e) {
    if (e instanceof ShellError) {
      if (e.interrupted) {
        return {
          messages: [
            createSyntheticUserCaveatMessage(),
            userMessage,
            createUserInterruptionMessage({ toolUse: false }),
            ...attachmentMessages
          ],
          shouldQuery: false
        };
      }
      return {
        messages: [
          createSyntheticUserCaveatMessage(),
          userMessage,
          ...attachmentMessages,
          createUserMessage({
            content: `<bash-stdout>${escapeXml(e.stdout)}</bash-stdout><bash-stderr>${escapeXml(e.stderr)}</bash-stderr>`
          })
        ],
        shouldQuery: false
      };
    }
    return {
      messages: [
        createSyntheticUserCaveatMessage(),
        userMessage,
        ...attachmentMessages,
        createUserMessage({
          content: `<bash-stderr>Command failed: ${escapeXml(errorMessage(e))}</bash-stderr>`
        })
      ],
      shouldQuery: false
    };
  } finally {
    setToolJSX(null);
  }
}
export {
  processBashCommand
};
