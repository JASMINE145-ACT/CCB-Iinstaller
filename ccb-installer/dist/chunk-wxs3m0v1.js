// @bun
import {
  OpenAI,
  adaptOpenAIStreamToAnthropic,
  anthropicMessagesToOpenAI,
  anthropicToolChoiceToOpenAI,
  anthropicToolsToOpenAI,
  init_convertMessages,
  init_convertTools,
  init_openai,
  init_streamAdapter
} from "./chunk-j5eb93j4.js";
import {
  addToTotalSessionCost,
  createAssistantAPIErrorMessage,
  init_api,
  init_cost_tracker,
  init_messages1 as init_messages,
  normalizeContentFromAPI,
  normalizeMessagesForAPI,
  toolToAPISchema
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
  calculateUSDCost,
  init_modelCost
} from "./chunk-mk2vzd2n.js";
import"./chunk-mkae8zj9.js";
import"./chunk-cxmyg49v.js";
import"./chunk-zwarn9h7.js";
import {
  getProxyFetchOptions,
  init_proxy
} from "./chunk-t16fercx.js";
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
import"./chunk-evwb3c85.js";
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
  init_debug,
  logForDebugging
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
  __esm
} from "./chunk-qp2qdcda.js";

// src/services/api/grok/client.ts
function getGrokClient(options) {
  if (cachedClient)
    return cachedClient;
  const apiKey = process.env.GROK_API_KEY || process.env.XAI_API_KEY || "";
  const baseURL = process.env.GROK_BASE_URL || DEFAULT_BASE_URL;
  const client = new OpenAI({
    apiKey,
    baseURL,
    maxRetries: options?.maxRetries ?? 0,
    timeout: parseInt(process.env.API_TIMEOUT_MS || String(600 * 1000), 10),
    dangerouslyAllowBrowser: true,
    fetchOptions: getProxyFetchOptions({ forAnthropicAPI: false }),
    ...options?.fetchOverride && { fetch: options.fetchOverride }
  });
  if (!options?.fetchOverride) {
    cachedClient = client;
  }
  return client;
}
var DEFAULT_BASE_URL = "https://api.x.ai/v1", cachedClient = null;
var init_client = __esm(() => {
  init_openai();
  init_proxy();
});

// src/services/api/grok/modelMapping.ts
function getModelFamily(model) {
  if (/haiku/i.test(model))
    return "haiku";
  if (/opus/i.test(model))
    return "opus";
  if (/sonnet/i.test(model))
    return "sonnet";
  return null;
}
function getUserModelMap() {
  const raw = process.env.GROK_MODEL_MAP;
  if (!raw)
    return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed;
    }
  } catch {}
  return null;
}
function resolveGrokModel(anthropicModel) {
  if (process.env.GROK_MODEL) {
    return process.env.GROK_MODEL;
  }
  const cleanModel = anthropicModel.replace(/\[1m\]$/, "");
  const family = getModelFamily(cleanModel);
  const userMap = getUserModelMap();
  if (userMap && family && userMap[family]) {
    return userMap[family];
  }
  if (family) {
    const grokEnvVar = `GROK_DEFAULT_${family.toUpperCase()}_MODEL`;
    const grokOverride = process.env[grokEnvVar];
    if (grokOverride)
      return grokOverride;
    const anthropicEnvVar = `ANTHROPIC_DEFAULT_${family.toUpperCase()}_MODEL`;
    const anthropicOverride = process.env[anthropicEnvVar];
    if (anthropicOverride)
      return anthropicOverride;
  }
  if (DEFAULT_MODEL_MAP[cleanModel]) {
    return DEFAULT_MODEL_MAP[cleanModel];
  }
  if (family && DEFAULT_FAMILY_MAP[family]) {
    return DEFAULT_FAMILY_MAP[family];
  }
  return cleanModel;
}
var DEFAULT_MODEL_MAP, DEFAULT_FAMILY_MAP;
var init_modelMapping = __esm(() => {
  DEFAULT_MODEL_MAP = {
    "claude-sonnet-4-20250514": "grok-3-mini-fast",
    "claude-sonnet-4-5-20250929": "grok-3-mini-fast",
    "claude-sonnet-4-6": "grok-3-mini-fast",
    "claude-opus-4-20250514": "grok-4.20-reasoning",
    "claude-opus-4-1-20250805": "grok-4.20-reasoning",
    "claude-opus-4-5-20251101": "grok-4.20-reasoning",
    "claude-opus-4-6": "grok-4.20-reasoning",
    "claude-haiku-4-5-20251001": "grok-3-mini-fast",
    "claude-3-5-haiku-20241022": "grok-3-mini-fast",
    "claude-3-7-sonnet-20250219": "grok-3-mini-fast",
    "claude-3-5-sonnet-20241022": "grok-3-mini-fast"
  };
  DEFAULT_FAMILY_MAP = {
    opus: "grok-4.20-reasoning",
    sonnet: "grok-3-mini-fast",
    haiku: "grok-3-mini-fast"
  };
});

// src/services/api/grok/index.ts
import { randomUUID } from "crypto";
async function* queryModelGrok(messages, systemPrompt, tools, signal, options) {
  try {
    const grokModel = resolveGrokModel(options.model);
    const messagesForAPI = normalizeMessagesForAPI(messages, tools);
    const toolSchemas = await Promise.all(tools.map((tool) => toolToAPISchema(tool, {
      getToolPermissionContext: options.getToolPermissionContext,
      tools,
      agents: options.agents,
      allowedAgentTypes: options.allowedAgentTypes,
      model: options.model
    })));
    const standardTools = toolSchemas.filter((t) => {
      const anyT = t;
      return anyT.type !== "advisor_20260301" && anyT.type !== "computer_20250124";
    });
    const openaiMessages = anthropicMessagesToOpenAI(messagesForAPI, systemPrompt);
    const openaiTools = anthropicToolsToOpenAI(standardTools);
    const openaiToolChoice = anthropicToolChoiceToOpenAI(options.toolChoice);
    const client = getGrokClient({
      maxRetries: 0,
      fetchOverride: options.fetchOverride,
      source: options.querySource
    });
    logForDebugging(`[Grok] Calling model=${grokModel}, messages=${openaiMessages.length}, tools=${openaiTools.length}`);
    const stream = await client.chat.completions.create({
      model: grokModel,
      messages: openaiMessages,
      ...openaiTools.length > 0 && {
        tools: openaiTools,
        ...openaiToolChoice && { tool_choice: openaiToolChoice }
      },
      stream: true,
      stream_options: { include_usage: true },
      ...options.temperatureOverride !== undefined && {
        temperature: options.temperatureOverride
      }
    }, {
      signal
    });
    const adaptedStream = adaptOpenAIStreamToAnthropic(stream, grokModel);
    const contentBlocks = {};
    let partialMessage = undefined;
    let usage = {
      input_tokens: 0,
      output_tokens: 0,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0
    };
    let ttftMs = 0;
    const start = Date.now();
    for await (const event of adaptedStream) {
      switch (event.type) {
        case "message_start": {
          partialMessage = event.message;
          ttftMs = Date.now() - start;
          if (event.message?.usage) {
            usage = { ...usage, ...event.message.usage };
          }
          break;
        }
        case "content_block_start": {
          const idx = event.index;
          const cb = event.content_block;
          if (cb.type === "tool_use") {
            contentBlocks[idx] = { ...cb, input: "" };
          } else if (cb.type === "text") {
            contentBlocks[idx] = { ...cb, text: "" };
          } else if (cb.type === "thinking") {
            contentBlocks[idx] = { ...cb, thinking: "", signature: "" };
          } else {
            contentBlocks[idx] = { ...cb };
          }
          break;
        }
        case "content_block_delta": {
          const idx = event.index;
          const delta = event.delta;
          const block = contentBlocks[idx];
          if (!block)
            break;
          if (delta.type === "text_delta") {
            block.text = (block.text || "") + delta.text;
          } else if (delta.type === "input_json_delta") {
            block.input = (block.input || "") + delta.partial_json;
          } else if (delta.type === "thinking_delta") {
            block.thinking = (block.thinking || "") + delta.thinking;
          } else if (delta.type === "signature_delta") {
            block.signature = delta.signature;
          }
          break;
        }
        case "content_block_stop": {
          const idx = event.index;
          const block = contentBlocks[idx];
          if (!block || !partialMessage)
            break;
          const m = {
            message: {
              ...partialMessage,
              content: normalizeContentFromAPI([block], tools, options.agentId)
            },
            requestId: undefined,
            type: "assistant",
            uuid: randomUUID(),
            timestamp: new Date().toISOString()
          };
          yield m;
          break;
        }
        case "message_delta": {
          const deltaUsage = event.usage;
          if (deltaUsage) {
            usage = { ...usage, ...deltaUsage };
          }
          break;
        }
        case "message_stop":
          break;
      }
      if (event.type === "message_stop" && usage.input_tokens + usage.output_tokens > 0) {
        const costUSD = calculateUSDCost(grokModel, usage);
        addToTotalSessionCost(costUSD, usage, options.model);
      }
      yield {
        type: "stream_event",
        event,
        ...event.type === "message_start" ? { ttftMs } : undefined
      };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logForDebugging(`[Grok] Error: ${errorMessage}`, { level: "error" });
    yield createAssistantAPIErrorMessage({
      content: `API Error: ${errorMessage}`,
      apiError: "api_error",
      error: error instanceof Error ? error : new Error(String(error))
    });
  }
}
var init_grok = __esm(() => {
  init_client();
  init_convertMessages();
  init_convertTools();
  init_streamAdapter();
  init_modelMapping();
  init_messages();
  init_api();
  init_debug();
  init_cost_tracker();
  init_modelCost();
  init_messages();
});
init_grok();

export {
  queryModelGrok
};
