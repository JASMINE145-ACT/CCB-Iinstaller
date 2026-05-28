// @bun
import {
  init_partition,
  partition_default
} from "./chunk-4mtbywdz.js";
import {
  COORDINATOR_MODE_ALLOWED_TOOLS,
  exports_coordinatorMode,
  init_coordinatorMode,
  init_tools,
  init_uniqBy,
  init_utils,
  isMcpTool,
  uniqBy_default
} from "./chunk-xg5k46jr.js";
import {
  __esm,
  __toCommonJS
} from "./chunk-qp2qdcda.js";

// src/utils/toolPool.ts
function isPrActivitySubscriptionTool(name) {
  return PR_ACTIVITY_TOOL_SUFFIXES.some((suffix) => name.endsWith(suffix));
}
function applyCoordinatorToolFilter(tools) {
  return tools.filter((t) => COORDINATOR_MODE_ALLOWED_TOOLS.has(t.name) || isPrActivitySubscriptionTool(t.name));
}
function mergeAndFilterTools(initialTools, assembled, mode) {
  const [mcp, builtIn] = partition_default(uniqBy_default([...initialTools, ...assembled], "name"), isMcpTool);
  const byName = (a, b) => a.name.localeCompare(b.name);
  const tools = [...builtIn.sort(byName), ...mcp.sort(byName)];
  if (coordinatorModeModule) {
    if (coordinatorModeModule.isCoordinatorMode()) {
      return applyCoordinatorToolFilter(tools);
    }
  }
  return tools;
}
var PR_ACTIVITY_TOOL_SUFFIXES, coordinatorModeModule;
var init_toolPool = __esm(() => {
  init_partition();
  init_uniqBy();
  init_tools();
  init_utils();
  PR_ACTIVITY_TOOL_SUFFIXES = [
    "subscribe_pr_activity",
    "unsubscribe_pr_activity"
  ];
  coordinatorModeModule = (init_coordinatorMode(), __toCommonJS(exports_coordinatorMode));
});

export { isPrActivitySubscriptionTool, applyCoordinatorToolFilter, mergeAndFilterTools, init_toolPool };
