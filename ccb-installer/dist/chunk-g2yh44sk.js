// @bun
import {
  notifyPermissionModeChanged,
  notifySessionMetadataChanged
} from "./chunk-erp1vm33.js";
import {
  applyConfigEnvironmentVariables,
  init_managedEnv
} from "./chunk-xg5k46jr.js";
import {
  clearApiKeyHelperCache,
  clearAwsCredentialsCache,
  clearGcpCredentialsCache,
  getGlobalConfig,
  init_PermissionMode,
  init_auth,
  init_config1 as init_config,
  init_settings1 as init_settings,
  permissionModeFromString,
  saveGlobalConfig,
  toExternalPermissionMode,
  updateSettingsForSource
} from "./chunk-mk2vzd2n.js";
import {
  init_log,
  logError
} from "./chunk-wd8mqz95.js";
import {
  init_errors,
  toError
} from "./chunk-5khwvj1z.js";
import {
  init_state,
  setMainLoopModelOverride
} from "./chunk-gzp6rza1.js";

// src/state/onChangeAppState.ts
init_state();
init_auth();
init_config();
init_errors();
init_log();
init_managedEnv();
init_PermissionMode();
init_settings();
function externalMetadataToAppState(metadata) {
  return (prev) => ({
    ...prev,
    ...typeof metadata.permission_mode === "string" ? {
      toolPermissionContext: {
        ...prev.toolPermissionContext,
        mode: permissionModeFromString(metadata.permission_mode)
      }
    } : {},
    ...typeof metadata.is_ultraplan_mode === "boolean" ? { isUltraplanMode: metadata.is_ultraplan_mode } : {}
  });
}
function onChangeAppState({
  newState,
  oldState
}) {
  const prevMode = oldState.toolPermissionContext.mode;
  const newMode = newState.toolPermissionContext.mode;
  if (prevMode !== newMode) {
    const prevExternal = toExternalPermissionMode(prevMode);
    const newExternal = toExternalPermissionMode(newMode);
    if (prevExternal !== newExternal) {
      const isUltraplan = newExternal === "plan" && newState.isUltraplanMode && !oldState.isUltraplanMode ? true : null;
      notifySessionMetadataChanged({
        permission_mode: newExternal,
        is_ultraplan_mode: isUltraplan
      });
    }
    notifyPermissionModeChanged(newMode);
  }
  if (newState.mainLoopModel !== oldState.mainLoopModel && newState.mainLoopModel === null) {
    updateSettingsForSource("userSettings", { model: undefined });
    setMainLoopModelOverride(null);
  }
  if (newState.mainLoopModel !== oldState.mainLoopModel && newState.mainLoopModel !== null) {
    updateSettingsForSource("userSettings", { model: newState.mainLoopModel });
    setMainLoopModelOverride(newState.mainLoopModel);
  }
  if (newState.expandedView !== oldState.expandedView) {
    const showExpandedTodos = newState.expandedView === "tasks";
    const showSpinnerTree = newState.expandedView === "teammates";
    if (getGlobalConfig().showExpandedTodos !== showExpandedTodos || getGlobalConfig().showSpinnerTree !== showSpinnerTree) {
      saveGlobalConfig((current) => ({
        ...current,
        showExpandedTodos,
        showSpinnerTree
      }));
    }
  }
  if (newState.verbose !== oldState.verbose && getGlobalConfig().verbose !== newState.verbose) {
    const verbose = newState.verbose;
    saveGlobalConfig((current) => ({
      ...current,
      verbose
    }));
  }
  if (process.env.USER_TYPE === "ant") {
    if (newState.tungstenPanelVisible !== oldState.tungstenPanelVisible && newState.tungstenPanelVisible !== undefined && getGlobalConfig().tungstenPanelVisible !== newState.tungstenPanelVisible) {
      const tungstenPanelVisible = newState.tungstenPanelVisible;
      saveGlobalConfig((current) => ({ ...current, tungstenPanelVisible }));
    }
  }
  if (newState.settings !== oldState.settings) {
    try {
      clearApiKeyHelperCache();
      clearAwsCredentialsCache();
      clearGcpCredentialsCache();
      if (newState.settings.env !== oldState.settings.env) {
        applyConfigEnvironmentVariables();
      }
    } catch (error) {
      logError(toError(error));
    }
  }
}

export { externalMetadataToAppState, onChangeAppState };
