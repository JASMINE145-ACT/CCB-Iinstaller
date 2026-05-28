// @bun
import {
  getKairosActive,
  init_state
} from "./chunk-gzp6rza1.js";
import {
  getClaudeConfigHomeDir,
  init_envUtils
} from "./chunk-hxhwzgnn.js";
import {
  __esm,
  __export
} from "./chunk-qp2qdcda.js";

// src/assistant/index.ts
var exports_assistant = {};
__export(exports_assistant, {
  markAssistantForced: () => markAssistantForced,
  isAssistantMode: () => isAssistantMode,
  isAssistantForced: () => isAssistantForced,
  initializeAssistantTeam: () => initializeAssistantTeam,
  getAssistantSystemPromptAddendum: () => getAssistantSystemPromptAddendum,
  getAssistantActivationPath: () => getAssistantActivationPath
});
import { readFileSync } from "fs";
import { join } from "path";
function isAssistantMode() {
  return getKairosActive();
}
function markAssistantForced() {
  _assistantForced = true;
}
function isAssistantForced() {
  return _assistantForced;
}
async function initializeAssistantTeam() {
  return;
}
function getAssistantSystemPromptAddendum() {
  try {
    return readFileSync(join(getClaudeConfigHomeDir(), "agents", "assistant.md"), "utf-8");
  } catch {
    return "";
  }
}
function getAssistantActivationPath() {
  if (!isAssistantMode())
    return;
  return _assistantForced ? "daemon" : "gate";
}
var _assistantForced = false;
var init_assistant = __esm(() => {
  init_state();
  init_envUtils();
});

export { exports_assistant, init_assistant };
