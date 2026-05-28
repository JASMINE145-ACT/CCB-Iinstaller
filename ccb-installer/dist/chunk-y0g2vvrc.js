// @bun
import {
  init_pluginIdentifier,
  parsePluginIdentifier
} from "./chunk-e86bxpak.js";
import {
  getFeatureValue_CACHED_MAY_BE_STALE,
  init_growthbook
} from "./chunk-mk2vzd2n.js";
import {
  init_lazySchema,
  lazySchema
} from "./chunk-64c1avct.js";
import {
  init_v4
} from "./chunk-8g747a8x.js";
import {
  exports_external
} from "./chunk-d7886r6a.js";
import {
  __esm
} from "./chunk-qp2qdcda.js";

// src/services/mcp/channelAllowlist.ts
function getChannelAllowlist() {
  const raw = getFeatureValue_CACHED_MAY_BE_STALE("tengu_harbor_ledger", []);
  const parsed = ChannelAllowlistSchema().safeParse(raw);
  return parsed.success ? parsed.data : [];
}
function isChannelsEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_harbor", false);
}
function isChannelAllowlisted(pluginSource) {
  if (!pluginSource)
    return false;
  const { name, marketplace } = parsePluginIdentifier(pluginSource);
  if (!marketplace)
    return false;
  return getChannelAllowlist().some((e) => e.plugin === name && e.marketplace === marketplace);
}
var ChannelAllowlistSchema;
var init_channelAllowlist = __esm(() => {
  init_v4();
  init_lazySchema();
  init_pluginIdentifier();
  init_growthbook();
  ChannelAllowlistSchema = lazySchema(() => exports_external.array(exports_external.object({
    marketplace: exports_external.string(),
    plugin: exports_external.string()
  })));
});

export { getChannelAllowlist, isChannelsEnabled, isChannelAllowlisted, init_channelAllowlist };
