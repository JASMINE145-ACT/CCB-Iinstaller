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
  TOOL_SEARCH_TOOL_NAME,
  addToTotalSessionCost,
  createAssistantAPIErrorMessage,
  extractDiscoveredToolNames,
  getEmptyToolPermissionContext,
  init_Tool,
  init_api,
  init_cost_tracker,
  init_messages1 as init_messages,
  init_prompt8 as init_prompt,
  init_toolSearch,
  isDeferredTool,
  isToolSearchEnabled,
  normalizeContentFromAPI,
  normalizeMessagesForAPI,
  toolMatchesName,
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
  getModelMaxOutputTokens,
  init_context,
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
import {
  init_envUtils,
  isEnvDefinedFalsy,
  isEnvTruthy
} from "./chunk-hxhwzgnn.js";
import"./chunk-qx8z601m.js";
import"./chunk-cgm6758j.js";
import"./chunk-9m27g5s1.js";
import"./chunk-8pn8tvgg.js";
import"./chunk-netzwgv1.js";
import {
  __esm
} from "./chunk-qp2qdcda.js";

// src/services/api/openai/client.ts
function getOpenAIClient(options) {
  if (cachedClient)
    return cachedClient;
  const apiKey = process.env.OPENAI_API_KEY || "";
  const baseURL = process.env.OPENAI_BASE_URL;
  const client = new OpenAI({
    apiKey,
    ...baseURL && { baseURL },
    maxRetries: options?.maxRetries ?? 0,
    timeout: parseInt(process.env.API_TIMEOUT_MS || String(600 * 1000), 10),
    dangerouslyAllowBrowser: true,
    ...process.env.OPENAI_ORG_ID && { organization: process.env.OPENAI_ORG_ID },
    ...process.env.OPENAI_PROJECT_ID && { project: process.env.OPENAI_PROJECT_ID },
    fetchOptions: getProxyFetchOptions({ forAnthropicAPI: false }),
    ...options?.fetchOverride && { fetch: options.fetchOverride }
  });
  if (!options?.fetchOverride) {
    cachedClient = client;
  }
  return client;
}
var cachedClient = null;
var init_client = __esm(() => {
  init_openai();
  init_proxy();
});

// src/services/api/openai/modelMapping.ts
function getModelFamily(model) {
  if (/haiku/i.test(model))
    return "haiku";
  if (/opus/i.test(model))
    return "opus";
  if (/sonnet/i.test(model))
    return "sonnet";
  return null;
}
function resolveOpenAIModel(anthropicModel) {
  if (process.env.OPENAI_MODEL) {
    return process.env.OPENAI_MODEL;
  }
  const cleanModel = anthropicModel.replace(/\[1m\]$/, "");
  const family = getModelFamily(cleanModel);
  if (family) {
    const openaiEnvVar = `OPENAI_DEFAULT_${family.toUpperCase()}_MODEL`;
    const openaiOverride = process.env[openaiEnvVar];
    if (openaiOverride)
      return openaiOverride;
    const anthropicEnvVar = `ANTHROPIC_DEFAULT_${family.toUpperCase()}_MODEL`;
    const anthropicOverride = process.env[anthropicEnvVar];
    if (anthropicOverride)
      return anthropicOverride;
  }
  return DEFAULT_MODEL_MAP[cleanModel] ?? cleanModel;
}
var DEFAULT_MODEL_MAP;
var init_modelMapping = __esm(() => {
  DEFAULT_MODEL_MAP = {
    "claude-sonnet-4-20250514": "gpt-4o",
    "claude-sonnet-4-5-20250929": "gpt-4o",
    "claude-sonnet-4-6": "gpt-4o",
    "claude-opus-4-20250514": "o3",
    "claude-opus-4-1-20250805": "o3",
    "claude-opus-4-5-20251101": "o3",
    "claude-opus-4-6": "o3",
    "claude-haiku-4-5-20251001": "gpt-4o-mini",
    "claude-3-5-haiku-20241022": "gpt-4o-mini",
    "claude-3-7-sonnet-20250219": "gpt-4o",
    "claude-3-5-sonnet-20241022": "gpt-4o"
  };
});

// src/services/api/openai/index.ts
import { randomUUID } from "crypto";
function isOpenAIThinkingEnabled(model) {
  if (isEnvDefinedFalsy(process.env.OPENAI_ENABLE_THINKING))
    return false;
  if (isEnvTruthy(process.env.OPENAI_ENABLE_THINKING))
    return true;
  const modelLower = model.toLowerCase();
  return modelLower.includes("deepseek-reasoner") || modelLower.includes("deepseek-v3.2");
}
function resolveOpenAIMaxTokens(upperLimit, maxOutputTokensOverride) {
  return maxOutputTokensOverride ?? (process.env.OPENAI_MAX_TOKENS ? parseInt(process.env.OPENAI_MAX_TOKENS, 10) || undefined : undefined) ?? (process.env.CLAUDE_CODE_MAX_OUTPUT_TOKENS ? parseInt(process.env.CLAUDE_CODE_MAX_OUTPUT_TOKENS, 10) || undefined : undefined) ?? upperLimit;
}
function buildOpenAIRequestBody(params) {
  const { model, messages, tools, toolChoice, enableThinking, maxTokens, temperatureOverride } = params;
  return {
    model,
    messages,
    max_tokens: maxTokens,
    ...tools.length > 0 && {
      tools,
      ...toolChoice && { tool_choice: toolChoice }
    },
    stream: true,
    stream_options: { include_usage: true },
    ...enableThinking && {
      thinking: { type: "enabled" },
      enable_thinking: true,
      chat_template_kwargs: { thinking: true }
    },
    ...!enableThinking && temperatureOverride !== undefined && {
      temperature: temperatureOverride
    }
  };
}
function assembleFinalAssistantOutputs(params) {
  const { partialMessage, contentBlocks, tools, agentId, usage, stopReason, maxTokens } = params;
  const outputs = [];
  const allBlocks = Object.keys(contentBlocks).sort((a, b) => Number(a) - Number(b)).map((k) => contentBlocks[Number(k)]).filter(Boolean);
  if (allBlocks.length > 0) {
    outputs.push({
      message: {
        ...partialMessage,
        content: normalizeContentFromAPI(allBlocks, tools, agentId),
        usage,
        stop_reason: stopReason,
        stop_sequence: null
      },
      requestId: undefined,
      type: "assistant",
      uuid: randomUUID(),
      timestamp: new Date().toISOString()
    });
  }
  if (stopReason === "max_tokens") {
    outputs.push(createAssistantAPIErrorMessage({
      content: `Output truncated: response exceeded the ${maxTokens} token limit. ` + `Set OPENAI_MAX_TOKENS or CLAUDE_CODE_MAX_OUTPUT_TOKENS to override.`,
      apiError: "max_output_tokens",
      error: "max_output_tokens"
    }));
  }
  return outputs;
}
async function* queryModelOpenAI(messages, systemPrompt, tools, signal, options) {
  try {
    const openaiModel = resolveOpenAIModel(options.model);
    const messagesForAPI = normalizeMessagesForAPI(messages, tools);
    const useToolSearch = await isToolSearchEnabled(options.model, tools, options.getToolPermissionContext || (async () => getEmptyToolPermissionContext()), options.agents || [], options.querySource);
    const deferredToolNames = new Set;
    if (useToolSearch) {
      for (const t of tools) {
        if (isDeferredTool(t))
          deferredToolNames.add(t.name);
      }
    }
    let filteredTools = tools;
    if (useToolSearch && deferredToolNames.size > 0) {
      const discoveredToolNames = extractDiscoveredToolNames(messages);
      filteredTools = tools.filter((tool) => {
        if (!deferredToolNames.has(tool.name))
          return true;
        if (toolMatchesName(tool, TOOL_SEARCH_TOOL_NAME))
          return true;
        return discoveredToolNames.has(tool.name);
      });
    }
    const toolSchemas = await Promise.all(filteredTools.map((tool) => toolToAPISchema(tool, {
      getToolPermissionContext: options.getToolPermissionContext,
      tools,
      agents: options.agents,
      allowedAgentTypes: options.allowedAgentTypes,
      model: options.model,
      deferLoading: useToolSearch && deferredToolNames.has(tool.name)
    })));
    const standardTools = toolSchemas.filter((t) => {
      const anyT = t;
      return anyT.type !== "advisor_20260301" && anyT.type !== "computer_20250124";
    });
    const enableThinking = isOpenAIThinkingEnabled(openaiModel);
    const openaiMessages = anthropicMessagesToOpenAI(messagesForAPI, systemPrompt, {
      enableThinking
    });
    const openaiTools = anthropicToolsToOpenAI(standardTools);
    const openaiToolChoice = anthropicToolChoiceToOpenAI(options.toolChoice);
    if (useToolSearch) {
      const includedDeferredTools = filteredTools.filter((t) => deferredToolNames.has(t.name)).length;
      logForDebugging(`[OpenAI] Tool search enabled: ${includedDeferredTools}/${deferredToolNames.size} deferred tools included, total tools=${openaiTools.length}`);
    } else {
      logForDebugging(`[OpenAI] Tool search disabled, total tools=${openaiTools.length}`);
    }
    const { upperLimit } = getModelMaxOutputTokens(openaiModel);
    const maxTokens = resolveOpenAIMaxTokens(upperLimit, options.maxOutputTokensOverride);
    const client = getOpenAIClient({
      maxRetries: 0,
      fetchOverride: options.fetchOverride,
      source: options.querySource
    });
    logForDebugging(`[OpenAI] Calling model=${openaiModel}, messages=${openaiMessages.length}, tools=${openaiTools.length}, thinking=${enableThinking}`);
    const requestBody = buildOpenAIRequestBody({
      model: openaiModel,
      messages: openaiMessages,
      tools: openaiTools,
      toolChoice: openaiToolChoice,
      enableThinking,
      maxTokens,
      temperatureOverride: options.temperatureOverride
    });
    const stream = await client.chat.completions.create(requestBody, { signal });
    const adaptedStream = adaptOpenAIStreamToAnthropic(stream, openaiModel);
    const contentBlocks = {};
    let partialMessage;
    let stopReason = null;
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
            usage = {
              ...usage,
              ...event.message.usage
            };
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
          break;
        }
        case "message_delta": {
          const deltaUsage = event.usage;
          if (deltaUsage) {
            usage = { ...usage, ...deltaUsage };
          }
          if (event.delta?.stop_reason != null) {
            stopReason = event.delta.stop_reason;
          }
          break;
        }
        case "message_stop": {
          if (partialMessage) {
            for (const output of assembleFinalAssistantOutputs({
              partialMessage,
              contentBlocks,
              tools,
              agentId: options.agentId,
              usage,
              stopReason,
              maxTokens
            })) {
              yield output;
            }
            partialMessage = null;
          }
          if (usage.input_tokens + usage.output_tokens > 0) {
            const costUSD = calculateUSDCost(openaiModel, usage);
            addToTotalSessionCost(costUSD, usage, options.model);
          }
          break;
        }
      }
      yield {
        type: "stream_event",
        event,
        ...event.type === "message_start" ? { ttftMs } : undefined
      };
    }
    if (partialMessage) {
      for (const output of assembleFinalAssistantOutputs({
        partialMessage,
        contentBlocks,
        tools,
        agentId: options.agentId,
        usage,
        stopReason,
        maxTokens
      })) {
        yield output;
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logForDebugging(`[OpenAI] Error: ${errorMessage}`, { level: "error" });
    yield createAssistantAPIErrorMessage({
      content: `API Error: ${errorMessage}`,
      apiError: "api_error",
      error: error instanceof Error ? error : new Error(String(error))
    });
  }
}
var init_openai2 = __esm(() => {
  init_client();
  init_convertMessages();
  init_convertTools();
  init_streamAdapter();
  init_modelMapping();
  init_messages();
  init_api();
  init_Tool();
  init_debug();
  init_cost_tracker();
  init_modelCost();
  init_envUtils();
  init_context();
  init_messages();
  init_toolSearch();
  init_prompt();
});
init_openai2();

export {
  resolveOpenAIMaxTokens,
  queryModelOpenAI,
  isOpenAIThinkingEnabled,
  buildOpenAIRequestBody
};
