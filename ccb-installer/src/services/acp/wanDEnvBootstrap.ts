/**
 * Must load before AgentTool (module-level isBackgroundTasksDisabled).
 */
if (!process.env.CLAUDE_CODE_DISABLE_BACKGROUND_TASKS) {
  process.env.CLAUDE_CODE_DISABLE_BACKGROUND_TASKS = '1'
}
