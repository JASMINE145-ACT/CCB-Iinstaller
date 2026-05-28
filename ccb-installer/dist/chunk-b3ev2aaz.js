// @bun
import {
  init_debug,
  logForDebugging
} from "./chunk-5khwvj1z.js";
import"./chunk-fbv4apne.js";
import"./chunk-gzp6rza1.js";
import"./chunk-50dgek10.js";
import"./chunk-z0csm2zq.js";
import"./chunk-hxhwzgnn.js";
import"./chunk-qx8z601m.js";
import"./chunk-cgm6758j.js";
import {
  __require
} from "./chunk-qp2qdcda.js";

// src/assistant/sessionDiscovery.ts
init_debug();
async function discoverAssistantSessions() {
  const { fetchCodeSessionsFromSessionsAPI } = await import("./chunk-04s2ykc2.js");
  let allSessions;
  try {
    allSessions = await fetchCodeSessionsFromSessionsAPI();
  } catch (err) {
    logForDebugging(`[assistant:discovery] fetchCodeSessionsFromSessionsAPI failed: ${err}`);
    throw err;
  }
  return allSessions.filter((s) => s.status === "idle" || s.status === "working" || s.status === "waiting").map((s) => ({
    id: s.id,
    title: s.title || "Untitled",
    status: s.status,
    created_at: s.created_at ?? ""
  }));
}
export {
  discoverAssistantSessions
};
