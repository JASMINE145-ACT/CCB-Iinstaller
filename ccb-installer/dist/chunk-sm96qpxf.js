// @bun
import {
  init_SSETransport,
  parseSSEFrames
} from "./chunk-14j3wq7z.js";
import {
  createAssistantAPIErrorMessage,
  init_api,
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
import"./chunk-mk2vzd2n.js";
import {
  init_json,
  safeParseJSON
} from "./chunk-mkae8zj9.js";
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
  errorMessage,
  init_debug,
  init_errors,
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

// src/services/api/gemini/client.ts
function getGeminiBaseUrl() {
  return (process.env.GEMINI_BASE_URL || DEFAULT_GEMINI_BASE_URL).replace(/\/+$/, "");
}
function getGeminiModelPath(model) {
  const normalized = model.replace(/^\/+/, "");
  return normalized.startsWith("models/") ? normalized : `models/${normalized}`;
}
async function* streamGeminiGenerateContent(params) {
  const fetchImpl = params.fetchOverride ?? fetch;
  const url = `${getGeminiBaseUrl()}/${getGeminiModelPath(params.model)}:streamGenerateContent?alt=sse`;
  const response = await fetchImpl(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": process.env.GEMINI_API_KEY || ""
    },
    body: JSON.stringify(params.body),
    signal: params.signal,
    ...getProxyFetchOptions({ forAnthropicAPI: false })
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Gemini API request failed (${response.status} ${response.statusText}): ${body || "empty response body"}`);
  }
  if (!response.body) {
    throw new Error("Gemini API returned no response body");
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder;
  let buffer = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done)
        break;
      buffer += decoder.decode(value, STREAM_DECODE_OPTS);
      const { frames: frames2, remaining } = parseSSEFrames(buffer);
      buffer = remaining;
      for (const frame of frames2) {
        if (!frame.data || frame.data === "[DONE]")
          continue;
        try {
          yield JSON.parse(frame.data);
        } catch (error) {
          throw new Error(`Failed to parse Gemini SSE payload: ${errorMessage(error)}`);
        }
      }
    }
    buffer += decoder.decode();
    const { frames } = parseSSEFrames(buffer);
    for (const frame of frames) {
      if (!frame.data || frame.data === "[DONE]")
        continue;
      try {
        yield JSON.parse(frame.data);
      } catch (error) {
        throw new Error(`Failed to parse trailing Gemini SSE payload: ${errorMessage(error)}`);
      }
    }
  } finally {
    reader.releaseLock();
  }
}
var DEFAULT_GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta", STREAM_DECODE_OPTS;
var init_client = __esm(() => {
  init_SSETransport();
  init_errors();
  init_proxy();
  STREAM_DECODE_OPTS = { stream: true };
});

// src/services/api/gemini/types.ts
var GEMINI_THOUGHT_SIGNATURE_FIELD = "_geminiThoughtSignature";
var init_types = () => {};

// src/services/api/gemini/convertMessages.ts
function anthropicMessagesToGemini(messages, systemPrompt) {
  const contents = [];
  const toolNamesById = new Map;
  for (const msg of messages) {
    if (msg.type === "assistant") {
      const content = convertInternalAssistantMessage(msg);
      if (content.parts.length > 0) {
        contents.push(content);
      }
      const assistantContent = msg.message.content;
      if (Array.isArray(assistantContent)) {
        for (const block of assistantContent) {
          if (typeof block !== "string" && block.type === "tool_use") {
            toolNamesById.set(block.id, block.name);
          }
        }
      }
      continue;
    }
    if (msg.type === "user") {
      const content = convertInternalUserMessage(msg, toolNamesById);
      if (content.parts.length > 0) {
        contents.push(content);
      }
    }
  }
  const systemText = systemPromptToText(systemPrompt);
  return {
    contents,
    ...systemText ? {
      systemInstruction: {
        parts: [{ text: systemText }]
      }
    } : {}
  };
}
function systemPromptToText(systemPrompt) {
  if (!systemPrompt || systemPrompt.length === 0)
    return "";
  return systemPrompt.filter(Boolean).join(`

`);
}
function convertInternalUserMessage(msg, toolNamesById) {
  const content = msg.message.content;
  if (typeof content === "string") {
    return {
      role: "user",
      parts: createTextGeminiParts(content)
    };
  }
  if (!Array.isArray(content)) {
    return { role: "user", parts: [] };
  }
  return {
    role: "user",
    parts: content.flatMap((block) => convertUserContentBlockToGeminiParts(block, toolNamesById))
  };
}
function convertUserContentBlockToGeminiParts(block, toolNamesById) {
  if (typeof block === "string") {
    return createTextGeminiParts(block);
  }
  if (block.type === "text") {
    return createTextGeminiParts(block.text);
  }
  if (block.type === "tool_result") {
    const toolResult = block;
    return [
      {
        functionResponse: {
          name: toolNamesById.get(toolResult.tool_use_id) ?? toolResult.tool_use_id,
          response: toolResultToResponseObject(toolResult)
        }
      }
    ];
  }
  if (block.type === "image") {
    const source = block.source;
    if (source?.type === "base64" && typeof source.data === "string") {
      const mediaType = source.media_type || "image/png";
      return [
        {
          inlineData: {
            mimeType: mediaType,
            data: source.data
          }
        }
      ];
    }
    if (source?.type === "url" && typeof source.url === "string") {
      return createTextGeminiParts(`[image: ${source.url}]`);
    }
  }
  return [];
}
function convertInternalAssistantMessage(msg) {
  const content = msg.message.content;
  if (typeof content === "string") {
    return {
      role: "model",
      parts: createTextGeminiParts(content)
    };
  }
  if (!Array.isArray(content)) {
    return { role: "model", parts: [] };
  }
  const parts = [];
  for (const block of content) {
    if (typeof block === "string") {
      parts.push(...createTextGeminiParts(block));
      continue;
    }
    if (block.type === "text") {
      parts.push(...createTextGeminiParts(block.text, getGeminiThoughtSignature(block)));
      continue;
    }
    if (block.type === "thinking") {
      const thinkingPart = createThinkingGeminiPart(block.thinking, block.signature);
      if (thinkingPart) {
        parts.push(thinkingPart);
      }
      continue;
    }
    if (block.type === "tool_use") {
      const toolUse = block;
      parts.push({
        functionCall: {
          name: toolUse.name,
          args: normalizeToolUseInput(toolUse.input)
        },
        ...getGeminiThoughtSignature(block) && {
          thoughtSignature: getGeminiThoughtSignature(block)
        }
      });
    }
  }
  return { role: "model", parts };
}
function createTextGeminiParts(value, thoughtSignature) {
  if (typeof value !== "string" || value.length === 0) {
    return [];
  }
  return [
    {
      text: value,
      ...thoughtSignature && { thoughtSignature }
    }
  ];
}
function createThinkingGeminiPart(value, thoughtSignature) {
  if (typeof value !== "string" || value.length === 0) {
    return;
  }
  return {
    text: value,
    thought: true,
    ...thoughtSignature && { thoughtSignature }
  };
}
function normalizeToolUseInput(input) {
  if (typeof input === "string") {
    const parsed = safeParseJSON(input);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed;
    }
    return parsed === null ? {} : { value: parsed };
  }
  if (input && typeof input === "object" && !Array.isArray(input)) {
    return input;
  }
  return input === undefined ? {} : { value: input };
}
function toolResultToResponseObject(block) {
  const result = normalizeToolResultContent(block.content);
  if (result && typeof result === "object" && !Array.isArray(result)) {
    return block.is_error ? { ...result, is_error: true } : result;
  }
  return {
    result,
    ...block.is_error ? { is_error: true } : {}
  };
}
function normalizeToolResultContent(content) {
  if (typeof content === "string") {
    const parsed = safeParseJSON(content);
    return parsed ?? content;
  }
  if (Array.isArray(content)) {
    const text = content.map((part) => {
      if (typeof part === "string")
        return part;
      if (part && typeof part === "object" && "text" in part && typeof part.text === "string") {
        return part.text;
      }
      return "";
    }).filter(Boolean).join(`
`);
    const parsed = safeParseJSON(text);
    return parsed ?? text;
  }
  return content ?? "";
}
function getGeminiThoughtSignature(block) {
  const signature = block[GEMINI_THOUGHT_SIGNATURE_FIELD];
  return typeof signature === "string" && signature.length > 0 ? signature : undefined;
}
var init_convertMessages = __esm(() => {
  init_json();
  init_types();
});

// src/services/api/gemini/convertTools.ts
function normalizeGeminiJsonSchemaType(value) {
  if (typeof value === "string") {
    return GEMINI_JSON_SCHEMA_TYPES.has(value) ? value : undefined;
  }
  if (Array.isArray(value)) {
    const normalized = value.filter((item) => typeof item === "string" && GEMINI_JSON_SCHEMA_TYPES.has(item));
    const unique = Array.from(new Set(normalized));
    if (unique.length === 0)
      return;
    return unique.length === 1 ? unique[0] : unique;
  }
  return;
}
function inferGeminiJsonSchemaTypeFromValue(value) {
  if (value === null)
    return "null";
  if (Array.isArray(value))
    return "array";
  if (typeof value === "string")
    return "string";
  if (typeof value === "boolean")
    return "boolean";
  if (typeof value === "number") {
    return Number.isInteger(value) ? "integer" : "number";
  }
  if (typeof value === "object")
    return "object";
  return;
}
function inferGeminiJsonSchemaTypeFromEnum(values) {
  const inferred = values.map(inferGeminiJsonSchemaTypeFromValue).filter((value) => value !== undefined);
  const unique = Array.from(new Set(inferred));
  if (unique.length === 0)
    return;
  return unique.length === 1 ? unique[0] : unique;
}
function addNullToGeminiJsonSchemaType(value) {
  if (value === undefined)
    return ["null"];
  if (Array.isArray(value)) {
    return value.includes("null") ? value : [...value, "null"];
  }
  return value === "null" ? value : [value, "null"];
}
function sanitizeGeminiJsonSchemaProperties(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return;
  }
  const sanitizedEntries = Object.entries(value).map(([key, schema]) => [key, sanitizeGeminiJsonSchema(schema)]).filter(([, schema]) => Object.keys(schema).length > 0);
  if (sanitizedEntries.length === 0) {
    return;
  }
  return Object.fromEntries(sanitizedEntries);
}
function sanitizeGeminiJsonSchemaArray(value) {
  if (!Array.isArray(value))
    return;
  const sanitized = value.map((item) => sanitizeGeminiJsonSchema(item)).filter((item) => Object.keys(item).length > 0);
  return sanitized.length > 0 ? sanitized : undefined;
}
function sanitizeGeminiJsonSchema(schema) {
  if (!schema || typeof schema !== "object" || Array.isArray(schema)) {
    return {};
  }
  const source = schema;
  const result = {};
  let type = normalizeGeminiJsonSchemaType(source.type);
  if (source.const !== undefined) {
    result.enum = [source.const];
    type = type ?? inferGeminiJsonSchemaTypeFromValue(source.const);
  } else if (Array.isArray(source.enum) && source.enum.length > 0) {
    result.enum = source.enum;
    type = type ?? inferGeminiJsonSchemaTypeFromEnum(source.enum);
  }
  if (!type) {
    if (source.properties && typeof source.properties === "object") {
      type = "object";
    } else if (source.items !== undefined || source.prefixItems !== undefined) {
      type = "array";
    }
  }
  if (source.nullable === true) {
    type = addNullToGeminiJsonSchemaType(type);
  }
  if (type) {
    result.type = type;
  }
  if (typeof source.title === "string") {
    result.title = source.title;
  }
  if (typeof source.description === "string") {
    result.description = source.description;
  }
  if (typeof source.format === "string") {
    result.format = source.format;
  }
  if (typeof source.pattern === "string") {
    result.pattern = source.pattern;
  }
  if (typeof source.minimum === "number") {
    result.minimum = source.minimum;
  } else if (typeof source.exclusiveMinimum === "number") {
    result.minimum = source.exclusiveMinimum;
  }
  if (typeof source.maximum === "number") {
    result.maximum = source.maximum;
  } else if (typeof source.exclusiveMaximum === "number") {
    result.maximum = source.exclusiveMaximum;
  }
  if (typeof source.minItems === "number") {
    result.minItems = source.minItems;
  }
  if (typeof source.maxItems === "number") {
    result.maxItems = source.maxItems;
  }
  if (typeof source.minLength === "number") {
    result.minLength = source.minLength;
  }
  if (typeof source.maxLength === "number") {
    result.maxLength = source.maxLength;
  }
  if (typeof source.minProperties === "number") {
    result.minProperties = source.minProperties;
  }
  if (typeof source.maxProperties === "number") {
    result.maxProperties = source.maxProperties;
  }
  const properties = sanitizeGeminiJsonSchemaProperties(source.properties);
  if (properties) {
    result.properties = properties;
    result.propertyOrdering = Object.keys(properties);
  }
  if (Array.isArray(source.required)) {
    const required = source.required.filter((item) => typeof item === "string");
    if (required.length > 0) {
      result.required = required;
    }
  }
  if (typeof source.additionalProperties === "boolean") {
    result.additionalProperties = source.additionalProperties;
  } else {
    const additionalProperties = sanitizeGeminiJsonSchema(source.additionalProperties);
    if (Object.keys(additionalProperties).length > 0) {
      result.additionalProperties = additionalProperties;
    }
  }
  const items = sanitizeGeminiJsonSchema(source.items);
  if (Object.keys(items).length > 0) {
    result.items = items;
  }
  const prefixItems = sanitizeGeminiJsonSchemaArray(source.prefixItems);
  if (prefixItems) {
    result.prefixItems = prefixItems;
  }
  const anyOf = sanitizeGeminiJsonSchemaArray(source.anyOf ?? source.oneOf);
  if (anyOf) {
    result.anyOf = anyOf;
  }
  return result;
}
function sanitizeGeminiFunctionParameters(schema) {
  const sanitized = sanitizeGeminiJsonSchema(schema);
  if (Object.keys(sanitized).length > 0) {
    return sanitized;
  }
  return {
    type: "object",
    properties: {}
  };
}
function anthropicToolsToGemini(tools) {
  const functionDeclarations = tools.filter((tool) => {
    const toolType = tool.type;
    return tool.type === "custom" || !("type" in tool) || toolType !== "server";
  }).map((tool) => {
    const anyTool = tool;
    const name = anyTool.name || "";
    const description = anyTool.description || "";
    const inputSchema = anyTool.input_schema ?? {
      type: "object",
      properties: {}
    };
    return {
      name,
      description,
      parametersJsonSchema: sanitizeGeminiFunctionParameters(inputSchema)
    };
  });
  return functionDeclarations.length > 0 ? [{ functionDeclarations }] : [];
}
function anthropicToolChoiceToGemini(toolChoice) {
  if (!toolChoice || typeof toolChoice !== "object")
    return;
  const tc = toolChoice;
  const type = tc.type;
  switch (type) {
    case "auto":
      return { mode: "AUTO" };
    case "any":
      return { mode: "ANY" };
    case "tool":
      return {
        mode: "ANY",
        allowedFunctionNames: typeof tc.name === "string" ? [tc.name] : undefined
      };
    default:
      return;
  }
}
var GEMINI_JSON_SCHEMA_TYPES;
var init_convertTools = __esm(() => {
  GEMINI_JSON_SCHEMA_TYPES = new Set([
    "string",
    "number",
    "integer",
    "boolean",
    "object",
    "array",
    "null"
  ]);
});

// src/services/api/gemini/modelMapping.ts
function getModelFamily(model) {
  if (/haiku/i.test(model))
    return "haiku";
  if (/opus/i.test(model))
    return "opus";
  if (/sonnet/i.test(model))
    return "sonnet";
  return null;
}
function resolveGeminiModel(anthropicModel) {
  if (process.env.GEMINI_MODEL) {
    return process.env.GEMINI_MODEL;
  }
  const cleanModel = anthropicModel.replace(/\[1m\]$/i, "");
  const family = getModelFamily(cleanModel);
  if (!family) {
    return cleanModel;
  }
  const geminiEnvVar = `GEMINI_DEFAULT_${family.toUpperCase()}_MODEL`;
  const geminiModel = process.env[geminiEnvVar];
  if (geminiModel) {
    return geminiModel;
  }
  const sharedEnvVar = `ANTHROPIC_DEFAULT_${family.toUpperCase()}_MODEL`;
  const resolvedModel = process.env[sharedEnvVar];
  if (resolvedModel) {
    return resolvedModel;
  }
  throw new Error(`Gemini provider requires GEMINI_MODEL or ${geminiEnvVar} (or ${sharedEnvVar} for backward compatibility) to be configured.`);
}
var init_modelMapping = () => {};

// src/services/api/gemini/streamAdapter.ts
import { randomUUID } from "crypto";
async function* adaptGeminiStreamToAnthropic(stream, model) {
  const messageId = `msg_${randomUUID().replace(/-/g, "").slice(0, 24)}`;
  let started = false;
  let stopped = false;
  let nextContentIndex = 0;
  let openTextLikeBlock = null;
  let sawToolUse = false;
  let finishReason;
  let inputTokens = 0;
  let outputTokens = 0;
  for await (const chunk of stream) {
    const usage = chunk.usageMetadata;
    if (usage) {
      inputTokens = usage.promptTokenCount ?? inputTokens;
      outputTokens = (usage.candidatesTokenCount ?? 0) + (usage.thoughtsTokenCount ?? 0);
    }
    if (!started) {
      started = true;
      yield {
        type: "message_start",
        message: {
          id: messageId,
          type: "message",
          role: "assistant",
          content: [],
          model,
          stop_reason: null,
          stop_sequence: null,
          usage: {
            input_tokens: inputTokens,
            output_tokens: 0,
            cache_creation_input_tokens: 0,
            cache_read_input_tokens: 0
          }
        }
      };
    }
    const candidate = chunk.candidates?.[0];
    const parts = candidate?.content?.parts ?? [];
    for (const part of parts) {
      if (part.functionCall) {
        if (openTextLikeBlock) {
          yield {
            type: "content_block_stop",
            index: openTextLikeBlock.index
          };
          openTextLikeBlock = null;
        }
        sawToolUse = true;
        const toolIndex = nextContentIndex++;
        const toolId = `toolu_${randomUUID().replace(/-/g, "").slice(0, 24)}`;
        yield {
          type: "content_block_start",
          index: toolIndex,
          content_block: {
            type: "tool_use",
            id: toolId,
            name: part.functionCall.name || "",
            input: {}
          }
        };
        if (part.thoughtSignature) {
          yield {
            type: "content_block_delta",
            index: toolIndex,
            delta: {
              type: "signature_delta",
              signature: part.thoughtSignature
            }
          };
        }
        if (part.functionCall.args && Object.keys(part.functionCall.args).length > 0) {
          yield {
            type: "content_block_delta",
            index: toolIndex,
            delta: {
              type: "input_json_delta",
              partial_json: JSON.stringify(part.functionCall.args)
            }
          };
        }
        yield {
          type: "content_block_stop",
          index: toolIndex
        };
        continue;
      }
      const textLikeType = getTextLikeBlockType(part);
      if (textLikeType) {
        if (!openTextLikeBlock || openTextLikeBlock.type !== textLikeType) {
          if (openTextLikeBlock) {
            yield {
              type: "content_block_stop",
              index: openTextLikeBlock.index
            };
          }
          openTextLikeBlock = {
            index: nextContentIndex++,
            type: textLikeType
          };
          yield {
            type: "content_block_start",
            index: openTextLikeBlock.index,
            content_block: textLikeType === "thinking" ? {
              type: "thinking",
              thinking: "",
              signature: ""
            } : {
              type: "text",
              text: ""
            }
          };
        }
        if (part.text) {
          yield {
            type: "content_block_delta",
            index: openTextLikeBlock.index,
            delta: textLikeType === "thinking" ? {
              type: "thinking_delta",
              thinking: part.text
            } : {
              type: "text_delta",
              text: part.text
            }
          };
        }
        if (part.thoughtSignature) {
          yield {
            type: "content_block_delta",
            index: openTextLikeBlock.index,
            delta: {
              type: "signature_delta",
              signature: part.thoughtSignature
            }
          };
        }
        continue;
      }
      if (part.thoughtSignature && openTextLikeBlock) {
        yield {
          type: "content_block_delta",
          index: openTextLikeBlock.index,
          delta: {
            type: "signature_delta",
            signature: part.thoughtSignature
          }
        };
      }
    }
    if (candidate?.finishReason) {
      finishReason = candidate.finishReason;
    }
  }
  if (!started) {
    return;
  }
  if (openTextLikeBlock) {
    yield {
      type: "content_block_stop",
      index: openTextLikeBlock.index
    };
  }
  if (!stopped) {
    yield {
      type: "message_delta",
      delta: {
        stop_reason: mapGeminiFinishReason(finishReason, sawToolUse),
        stop_sequence: null
      },
      usage: {
        output_tokens: outputTokens
      }
    };
    yield {
      type: "message_stop"
    };
    stopped = true;
  }
}
function getTextLikeBlockType(part) {
  if (typeof part.text !== "string") {
    return null;
  }
  return part.thought ? "thinking" : "text";
}
function mapGeminiFinishReason(reason, sawToolUse) {
  switch (reason) {
    case "MAX_TOKENS":
      return "max_tokens";
    case "STOP":
    case "FINISH_REASON_UNSPECIFIED":
    case "SAFETY":
    case "RECITATION":
    case "BLOCKLIST":
    case "PROHIBITED_CONTENT":
    case "SPII":
    case "MALFORMED_FUNCTION_CALL":
    default:
      return sawToolUse ? "tool_use" : "end_turn";
  }
}
var init_streamAdapter = () => {};

// src/services/api/gemini/index.ts
import { randomUUID as randomUUID2 } from "crypto";
async function* queryModelGemini(messages, systemPrompt, tools, signal, options, thinkingConfig) {
  try {
    const geminiModel = resolveGeminiModel(options.model);
    const messagesForAPI = normalizeMessagesForAPI(messages, tools);
    const toolSchemas = await Promise.all(tools.map((tool) => toolToAPISchema(tool, {
      getToolPermissionContext: options.getToolPermissionContext,
      tools,
      agents: options.agents,
      allowedAgentTypes: options.allowedAgentTypes,
      model: options.model
    })));
    const standardTools = toolSchemas.filter((t) => {
      const anyTool = t;
      return anyTool.type !== "advisor_20260301" && anyTool.type !== "computer_20250124";
    });
    const { contents, systemInstruction } = anthropicMessagesToGemini(messagesForAPI, systemPrompt);
    const geminiTools = anthropicToolsToGemini(standardTools);
    const toolChoice = anthropicToolChoiceToGemini(options.toolChoice);
    const stream = streamGeminiGenerateContent({
      model: geminiModel,
      signal,
      fetchOverride: options.fetchOverride,
      body: {
        contents,
        ...systemInstruction && { systemInstruction },
        ...geminiTools.length > 0 && { tools: geminiTools },
        ...toolChoice && {
          toolConfig: {
            functionCallingConfig: toolChoice
          }
        },
        generationConfig: {
          ...options.temperatureOverride !== undefined && {
            temperature: options.temperatureOverride
          },
          ...thinkingConfig.type !== "disabled" && {
            thinkingConfig: {
              includeThoughts: true,
              ...thinkingConfig.type === "enabled" && {
                thinkingBudget: thinkingConfig.budgetTokens
              }
            }
          }
        }
      }
    });
    logForDebugging(`[Gemini] Calling model=${geminiModel}, messages=${contents.length}, tools=${geminiTools.length}`);
    const adaptedStream = adaptGeminiStreamToAnthropic(stream, geminiModel);
    const contentBlocks = {};
    let partialMessage = undefined;
    let ttftMs = 0;
    const start = Date.now();
    for await (const event of adaptedStream) {
      switch (event.type) {
        case "message_start":
          partialMessage = event.message;
          ttftMs = Date.now() - start;
          break;
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
            if (block.type === "thinking") {
              block.signature = delta.signature;
            } else {
              block[GEMINI_THOUGHT_SIGNATURE_FIELD] = delta.signature;
            }
          }
          break;
        }
        case "content_block_stop": {
          const idx = event.index;
          const block = contentBlocks[idx];
          if (!block || !partialMessage)
            break;
          const message = {
            message: {
              ...partialMessage,
              content: normalizeContentFromAPI([block], tools, options.agentId)
            },
            requestId: undefined,
            type: "assistant",
            uuid: randomUUID2(),
            timestamp: new Date().toISOString()
          };
          yield message;
          break;
        }
        case "message_delta":
        case "message_stop":
          break;
      }
      yield {
        type: "stream_event",
        event,
        ...event.type === "message_start" ? { ttftMs } : undefined
      };
    }
  } catch (error) {
    const errorMessage2 = error instanceof Error ? error.message : String(error);
    logForDebugging(`[Gemini] Error: ${errorMessage2}`, { level: "error" });
    yield createAssistantAPIErrorMessage({
      content: `API Error: ${errorMessage2}`,
      apiError: "api_error",
      error: error instanceof Error ? error : new Error(String(error))
    });
  }
}
var init_gemini = __esm(() => {
  init_api();
  init_debug();
  init_messages();
  init_client();
  init_convertMessages();
  init_convertTools();
  init_modelMapping();
  init_streamAdapter();
  init_types();
});
init_gemini();

export {
  queryModelGemini
};
