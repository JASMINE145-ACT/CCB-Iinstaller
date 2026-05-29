// @bun
import {
  getDefaultSubagentModel,
  init_agent
} from "./chunk-xg5k46jr.js";
import {
  getSourceDisplayName,
  init_constants
} from "./chunk-mk2vzd2n.js";
import {
  __esm
} from "./chunk-qp2qdcda.js";

// packages/builtin-tools/src/tools/AgentTool/agentDisplay.ts
function resolveAgentOverrides(allAgents, activeAgents) {
  const activeMap = new Map;
  for (const agent of activeAgents) {
    activeMap.set(agent.agentType, agent);
  }
  const seen = new Set;
  const resolved = [];
  for (const agent of allAgents) {
    const key = `${agent.agentType}:${agent.source}`;
    if (seen.has(key))
      continue;
    seen.add(key);
    const active = activeMap.get(agent.agentType);
    const overriddenBy = active && active.source !== agent.source ? active.source : undefined;
    resolved.push({ ...agent, overriddenBy });
  }
  return resolved;
}
function resolveAgentModelDisplay(agent) {
  const model = agent.model || getDefaultSubagentModel();
  if (!model)
    return;
  return model === "inherit" ? "inherit" : model;
}
function getOverrideSourceLabel(source) {
  return getSourceDisplayName(source).toLowerCase();
}
function compareAgentsByName(a, b) {
  return a.agentType.localeCompare(b.agentType, undefined, {
    sensitivity: "base"
  });
}
var AGENT_SOURCE_GROUPS;
var init_agentDisplay = __esm(() => {
  init_agent();
  init_constants();
  AGENT_SOURCE_GROUPS = [
    { label: "\u7528\u6237 agent", source: "userSettings" },
    { label: "\u9879\u76ee agent", source: "projectSettings" },
    { label: "\u672c\u5730 agent", source: "localSettings" },
    { label: "\u6258\u7ba1 agent", source: "policySettings" },
    { label: "\u63d2\u4ef6 agent", source: "plugin" },
    { label: "CLI \u53c2\u6570 agent", source: "flagSettings" },
    { label: "\u5185\u7f6e agent", source: "built-in" }
  ];
});

export { AGENT_SOURCE_GROUPS, resolveAgentOverrides, resolveAgentModelDisplay, getOverrideSourceLabel, compareAgentsByName, init_agentDisplay };
