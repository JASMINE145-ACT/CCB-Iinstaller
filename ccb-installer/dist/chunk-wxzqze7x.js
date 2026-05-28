// @bun
import {
  init_sideQuestion,
  runSideQuestion
} from "./chunk-1zstccdk.js";
import {
  init_modalContext,
  useModalOrTerminalSize
} from "./chunk-gg8qhy7g.js";
import {
  Markdown,
  SpinnerGlyph,
  asSystemPrompt,
  createAbortController,
  getLastCacheSafeParams,
  getMessagesAfterCompactBoundary,
  getSystemContext,
  getSystemPrompt,
  getUserContext,
  init_Markdown,
  init_SpinnerGlyph,
  init_abortController,
  init_context,
  init_forkedAgent,
  init_messages1 as init_messages,
  init_prompts1 as init_prompts,
  init_systemPromptType,
  init_useTerminalSize
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
  DOWN_ARROW,
  UP_ARROW,
  init_config1 as init_config,
  init_figures,
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
import"./chunk-9qh5f9r3.js";
import"./chunk-xhesahm0.js";
import"./chunk-rh5a2rg9.js";
import"./chunk-p2816w9z.js";
import"./chunk-v9smspw2.js";
import"./chunk-v1kzp02e.js";
import"./chunk-padf4crh.js";
import"./chunk-crmjpsqe.js";
import {
  ScrollBox_default,
  ThemedBox_default,
  ThemedText,
  init_dist,
  init_src,
  useInterval,
  useTerminalSize
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
import {
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
  __esm,
  __toESM
} from "./chunk-qp2qdcda.js";

// src/commands/btw/btw.tsx
function BtwSideQuestion({
  question,
  context,
  onDone
}) {
  const [response, setResponse] = import_react.useState(null);
  const [error, setError] = import_react.useState(null);
  const [frame, setFrame] = import_react.useState(0);
  const scrollRef = import_react.useRef(null);
  const { rows } = useModalOrTerminalSize(useTerminalSize());
  useInterval(() => setFrame((f) => f + 1), response || error ? null : 80);
  function handleKeyDown(e) {
    if (e.key === "escape" || e.key === "return" || e.key === " " || e.ctrl && (e.key === "c" || e.key === "d")) {
      e.preventDefault();
      onDone(undefined, { display: "skip" });
      return;
    }
    if (e.key === "up" || e.ctrl && e.key === "p") {
      e.preventDefault();
      scrollRef.current?.scrollBy(-SCROLL_LINES);
    }
    if (e.key === "down" || e.ctrl && e.key === "n") {
      e.preventDefault();
      scrollRef.current?.scrollBy(SCROLL_LINES);
    }
  }
  import_react.useEffect(() => {
    const abortController = createAbortController();
    async function fetchResponse() {
      try {
        const cacheSafeParams = await buildCacheSafeParams(context);
        const result = await runSideQuestion({ question, cacheSafeParams });
        if (!abortController.signal.aborted) {
          if (result.response) {
            setResponse(result.response);
          } else {
            setError("No response received");
          }
        }
      } catch (err) {
        if (!abortController.signal.aborted) {
          setError(errorMessage(err) || "Failed to get response");
        }
      }
    }
    fetchResponse();
    return () => {
      abortController.abort();
    };
  }, [question, context]);
  const maxContentHeight = Math.max(5, rows - CHROME_ROWS - OUTER_CHROME_ROWS);
  return /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedBox_default, {
    flexDirection: "column",
    paddingLeft: 2,
    marginTop: 1,
    tabIndex: 0,
    autoFocus: true,
    onKeyDown: handleKeyDown,
    children: [
      /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedBox_default, {
        children: [
          /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
            color: "warning",
            bold: true,
            children: [
              "/btw",
              " "
            ]
          }, undefined, true, undefined, this),
          /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
            dimColor: true,
            children: question
          }, undefined, false, undefined, this)
        ]
      }, undefined, true, undefined, this),
      /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedBox_default, {
        marginTop: 1,
        marginLeft: 2,
        maxHeight: maxContentHeight,
        children: /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ScrollBox_default, {
          ref: scrollRef,
          flexDirection: "column",
          flexGrow: 1,
          children: error ? /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
            color: "error",
            children: error
          }, undefined, false, undefined, this) : response ? /* @__PURE__ */ jsx_dev_runtime.jsxDEV(Markdown, {
            children: response
          }, undefined, false, undefined, this) : /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedBox_default, {
            children: [
              /* @__PURE__ */ jsx_dev_runtime.jsxDEV(SpinnerGlyph, {
                frame,
                messageColor: "warning"
              }, undefined, false, undefined, this),
              /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
                color: "warning",
                children: "Answering..."
              }, undefined, false, undefined, this)
            ]
          }, undefined, true, undefined, this)
        }, undefined, false, undefined, this)
      }, undefined, false, undefined, this),
      (response || error) && /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedBox_default, {
        marginTop: 1,
        children: /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
          dimColor: true,
          children: [
            UP_ARROW,
            "/",
            DOWN_ARROW,
            " to scroll \xB7 Space, Enter, or Escape to dismiss"
          ]
        }, undefined, true, undefined, this)
      }, undefined, false, undefined, this)
    ]
  }, undefined, true, undefined, this);
}
function stripInProgressAssistantMessage(messages) {
  const last = messages.at(-1);
  if (last?.type === "assistant" && last.message.stop_reason === null) {
    return messages.slice(0, -1);
  }
  return messages;
}
async function buildCacheSafeParams(context) {
  const forkContextMessages = getMessagesAfterCompactBoundary(stripInProgressAssistantMessage(context.messages));
  const saved = getLastCacheSafeParams();
  if (saved) {
    return {
      systemPrompt: saved.systemPrompt,
      userContext: saved.userContext,
      systemContext: saved.systemContext,
      toolUseContext: context,
      forkContextMessages
    };
  }
  const [rawSystemPrompt, userContext, systemContext] = await Promise.all([
    getSystemPrompt(context.options.tools, context.options.mainLoopModel, [], context.options.mcpClients),
    getUserContext(),
    getSystemContext()
  ]);
  return {
    systemPrompt: asSystemPrompt(rawSystemPrompt),
    userContext,
    systemContext,
    toolUseContext: context,
    forkContextMessages
  };
}
async function call(onDone, context, args) {
  const question = args?.trim();
  if (!question) {
    onDone("Usage: /btw <your question>", { display: "system" });
    return null;
  }
  saveGlobalConfig((current) => ({
    ...current,
    btwUseCount: current.btwUseCount + 1
  }));
  return /* @__PURE__ */ jsx_dev_runtime.jsxDEV(BtwSideQuestion, {
    question,
    context,
    onDone
  }, undefined, false, undefined, this);
}
var import_react, jsx_dev_runtime, CHROME_ROWS = 5, OUTER_CHROME_ROWS = 6, SCROLL_LINES = 3;
var init_btw = __esm(() => {
  init_dist();
  init_Markdown();
  init_SpinnerGlyph();
  init_figures();
  init_prompts();
  init_modalContext();
  init_context();
  init_useTerminalSize();
  init_src();
  init_src();
  init_abortController();
  init_config();
  init_errors();
  init_forkedAgent();
  init_messages();
  init_sideQuestion();
  init_systemPromptType();
  import_react = __toESM(require_react(), 1);
  jsx_dev_runtime = __toESM(require_jsx_dev_runtime(), 1);
});
init_btw();

export {
  call
};
