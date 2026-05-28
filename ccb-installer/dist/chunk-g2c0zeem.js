// @bun
import {
  init_semver
} from "./chunk-ps49ymvj.js";
import {
  init_bridgeConfig
} from "./chunk-kten1z0y.js";
import {
  init_auth,
  init_growthbook
} from "./chunk-mk2vzd2n.js";
import {
  init_envUtils
} from "./chunk-hxhwzgnn.js";
import {
  __esm
} from "./chunk-qp2qdcda.js";

// src/bridge/bridgeEnabled.ts
function isBridgeEnabled() {
  if (false) {}
  return false;
}
async function isBridgeEnabledBlocking() {
  if (false) {}
  return false;
}
function isEnvLessBridgeEnabled() {
  return false;
}
function isCseShimEnabled() {
  return true;
}
function checkBridgeMinVersion() {
  if (false) {}
  return null;
}
var init_bridgeEnabled = __esm(() => {
  init_growthbook();
  init_bridgeConfig();
  init_auth();
  init_envUtils();
  init_semver();
});

export { isBridgeEnabled, isBridgeEnabledBlocking, isEnvLessBridgeEnabled, isCseShimEnabled, checkBridgeMinVersion, init_bridgeEnabled };
