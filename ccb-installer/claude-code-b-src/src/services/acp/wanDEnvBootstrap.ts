/**
 * Must load before AgentTool (module-level isBackgroundTasksDisabled).
 * WanD orchestrator needs sync Agent() completion in ACP — async breaks Accurate/quotation table delivery.
 */
if (!process.env.CLAUDE_CODE_DISABLE_BACKGROUND_TASKS) {
  process.env.CLAUDE_CODE_DISABLE_BACKGROUND_TASKS = '1'
}
