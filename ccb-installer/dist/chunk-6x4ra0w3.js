// @bun
import {
  init_computerUseLock,
  isLockHeldLocally,
  releaseComputerUseLock
} from "./chunk-cy1z66c2.js";
import {
  init_escHotkey,
  init_withResolvers,
  unregisterEscHotkey,
  withResolvers
} from "./chunk-x95fhbwq.js";
import {
  errorMessage,
  init_debug,
  init_errors,
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
  __esm,
  __require
} from "./chunk-qp2qdcda.js";

// src/utils/computerUse/cleanup.ts
async function cleanupComputerUseAfterTurn(ctx) {
  const appState = ctx.getAppState();
  const hidden = appState.computerUseMcpState?.hiddenDuringTurn;
  if (hidden && hidden.size > 0) {
    const { unhideComputerUseApps } = await import("./chunk-nq1bxxxg.js");
    const unhide = unhideComputerUseApps([...hidden]).catch((err) => logForDebugging(`[Computer Use MCP] auto-unhide failed: ${errorMessage(err)}`));
    const timeout = withResolvers();
    const timer = setTimeout(timeout.resolve, UNHIDE_TIMEOUT_MS);
    await Promise.race([unhide, timeout.promise]).finally(() => clearTimeout(timer));
    ctx.setAppState((prev) => prev.computerUseMcpState?.hiddenDuringTurn === undefined ? prev : {
      ...prev,
      computerUseMcpState: {
        ...prev.computerUseMcpState,
        hiddenDuringTurn: undefined
      }
    });
  }
  if (!isLockHeldLocally())
    return;
  try {
    unregisterEscHotkey();
  } catch (err) {
    logForDebugging(`[Computer Use MCP] unregisterEscHotkey failed: ${errorMessage(err)}`);
  }
  if (await releaseComputerUseLock()) {
    ctx.sendOSNotification?.({
      message: "Claude is done using your computer",
      notificationType: "computer_use_exit"
    });
  }
}
var UNHIDE_TIMEOUT_MS = 5000;
var init_cleanup = __esm(() => {
  init_debug();
  init_errors();
  init_withResolvers();
  init_computerUseLock();
  init_escHotkey();
});
init_cleanup();

export {
  cleanupComputerUseAfterTurn
};
