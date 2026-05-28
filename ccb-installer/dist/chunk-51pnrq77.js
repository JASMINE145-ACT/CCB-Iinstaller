// @bun
import {
  getClaudeAIOAuthTokens,
  getFeatureValue_CACHED_MAY_BE_STALE,
  init_auth,
  init_growthbook,
  isAnthropicAuthEnabled
} from "./chunk-mk2vzd2n.js";
import {
  __esm
} from "./chunk-qp2qdcda.js";

// src/voice/voiceModeEnabled.ts
function isVoiceGrowthBookEnabled() {
  return !getFeatureValue_CACHED_MAY_BE_STALE("tengu_amber_quartz_disabled", false);
}
function hasVoiceAuth() {
  if (!isAnthropicAuthEnabled()) {
    return false;
  }
  const tokens = getClaudeAIOAuthTokens();
  return Boolean(tokens?.accessToken);
}
function isVoiceModeEnabled() {
  return hasVoiceAuth() && isVoiceGrowthBookEnabled();
}
var init_voiceModeEnabled = __esm(() => {
  init_growthbook();
  init_auth();
});

export { isVoiceGrowthBookEnabled, hasVoiceAuth, isVoiceModeEnabled, init_voiceModeEnabled };
