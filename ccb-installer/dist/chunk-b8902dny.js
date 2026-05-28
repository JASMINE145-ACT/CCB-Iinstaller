// @bun
import {
  StdioServerTransport,
  init_stdio
} from "./chunk-x46ck0yq.js";
import {
  init_sink,
  initializeAnalyticsSink
} from "./chunk-kkrf47xh.js";
import {
  getComputerUseHostAdapter,
  init_hostAdapter
} from "./chunk-dhpmxxmx.js";
import {
  getChicagoCoordinateMode,
  init_gates
} from "./chunk-yg1k879b.js";
import {
  init_datadog,
  shutdownDatadog
} from "./chunk-435qaxw3.js";
import"./chunk-c9pb40ft.js";
import {
  buildComputerUseTools,
  createComputerUseMcpServer,
  init_src
} from "./chunk-ad6rg8vz.js";
import"./chunk-x95fhbwq.js";
import {
  enableConfigs,
  init_config1 as init_config,
  init_firstPartyEventLogger,
  shutdown1PEventLogging
} from "./chunk-mk2vzd2n.js";
import"./chunk-mkae8zj9.js";
import"./chunk-cxmyg49v.js";
import"./chunk-zwarn9h7.js";
import"./chunk-t16fercx.js";
import"./chunk-7hmy36fh.js";
import"./chunk-6kpbgc5w.js";
import"./chunk-d57t992t.js";
import"./chunk-64c1avct.js";
import"./chunk-0knhp7v5.js";
import"./chunk-8g5pe1gr.js";
import"./chunk-b62vj92a.js";
import {
  ListToolsRequestSchema,
  init_types
} from "./chunk-4cp6193g.js";
import"./chunk-8g747a8x.js";
import"./chunk-d7886r6a.js";
import"./chunk-f5ma3nh5.js";
import"./chunk-6y2wszkc.js";
import"./chunk-3c25bcsw.js";
import"./chunk-9qh5f9r3.js";
import"./chunk-xhesahm0.js";
import"./chunk-rh5a2rg9.js";
import"./chunk-p2816w9z.js";
import"./chunk-v1kzp02e.js";
import"./chunk-padf4crh.js";
import"./chunk-crmjpsqe.js";
import"./chunk-z9bw4q7j.js";
import"./chunk-evwb3c85.js";
import"./chunk-h0rbjg6x.js";
import"./chunk-0vkfrmqm.js";
import"./chunk-0xjaqda8.js";
import"./chunk-9awawyvh.js";
import"./chunk-hqpzpr71.js";
import"./chunk-zs5b1dgr.js";
import"./chunk-hnxmafvc.js";
import"./chunk-tv74hgw9.js";
import"./chunk-wd8mqz95.js";
import"./chunk-8tnsngw2.js";
import"./chunk-vsbyhpfy.js";
import"./chunk-p7pj6wf8.js";
import"./chunk-5z28bqne.js";
import"./chunk-qajrkk97.js";
import {
  init_debug,
  logForDebugging
} from "./chunk-5khwvj1z.js";
import"./chunk-fbv4apne.js";
import"./chunk-gzp6rza1.js";
import"./chunk-50dgek10.js";
import"./chunk-7wm5s02e.js";
import"./chunk-z0csm2zq.js";
import"./chunk-hxhwzgnn.js";
import"./chunk-qx8z601m.js";
import"./chunk-cgm6758j.js";
import"./chunk-9m27g5s1.js";
import"./chunk-8pn8tvgg.js";
import"./chunk-netzwgv1.js";
import {
  __esm
} from "./chunk-qp2qdcda.js";

// src/utils/computerUse/appNames.ts
function isUserFacingPath(path, homeDir) {
  if (PATH_ALLOWLIST.some((root) => path.startsWith(root)))
    return true;
  if (homeDir) {
    const userApps = homeDir.endsWith("/") ? `${homeDir}Applications/` : `${homeDir}/Applications/`;
    if (path.startsWith(userApps))
      return true;
  }
  return false;
}
function isNoisyName(name) {
  return NAME_PATTERN_BLOCKLIST.some((re) => re.test(name));
}
function sanitizeCore(raw, applyCharFilter) {
  const seen = new Set;
  return raw.map((name) => name.trim()).filter((trimmed) => {
    if (!trimmed)
      return false;
    if (trimmed.length > APP_NAME_MAX_LEN)
      return false;
    if (applyCharFilter && !APP_NAME_ALLOWED.test(trimmed))
      return false;
    if (seen.has(trimmed))
      return false;
    seen.add(trimmed);
    return true;
  }).sort((a, b) => a.localeCompare(b));
}
function sanitizeAppNames(raw) {
  const filtered = sanitizeCore(raw, true);
  if (filtered.length <= APP_NAME_MAX_COUNT)
    return filtered;
  return [
    ...filtered.slice(0, APP_NAME_MAX_COUNT),
    `\u2026 and ${filtered.length - APP_NAME_MAX_COUNT} more`
  ];
}
function sanitizeTrustedNames(raw) {
  return sanitizeCore(raw, false);
}
function filterAppsForDescription(installed, homeDir) {
  const { alwaysKept, rest } = installed.reduce((acc, app) => {
    if (ALWAYS_KEEP_BUNDLE_IDS.has(app.bundleId)) {
      acc.alwaysKept.push(app.displayName);
    } else if (isUserFacingPath(app.path, homeDir) && !isNoisyName(app.displayName)) {
      acc.rest.push(app.displayName);
    }
    return acc;
  }, { alwaysKept: [], rest: [] });
  const sanitizedAlways = sanitizeTrustedNames(alwaysKept);
  const alwaysSet = new Set(sanitizedAlways);
  return [
    ...sanitizedAlways,
    ...sanitizeAppNames(rest).filter((n) => !alwaysSet.has(n))
  ];
}
var PATH_ALLOWLIST, NAME_PATTERN_BLOCKLIST, ALWAYS_KEEP_BUNDLE_IDS, APP_NAME_ALLOWED, APP_NAME_MAX_LEN = 40, APP_NAME_MAX_COUNT = 50;
var init_appNames = __esm(() => {
  PATH_ALLOWLIST = [
    "/Applications/",
    "/System/Applications/"
  ];
  NAME_PATTERN_BLOCKLIST = [
    /Helper(?:$|\s\()/,
    /Agent(?:$|\s\()/,
    /Service(?:$|\s\()/,
    /Uninstaller(?:$|\s\()/,
    /Updater(?:$|\s\()/,
    /^\./
  ];
  ALWAYS_KEEP_BUNDLE_IDS = new Set([
    "com.apple.Safari",
    "com.google.Chrome",
    "com.microsoft.edgemac",
    "org.mozilla.firefox",
    "company.thebrowser.Browser",
    "com.tinyspeck.slackmacgap",
    "us.zoom.xos",
    "com.microsoft.teams2",
    "com.microsoft.teams",
    "com.apple.MobileSMS",
    "com.apple.mail",
    "com.microsoft.Word",
    "com.microsoft.Excel",
    "com.microsoft.Powerpoint",
    "com.microsoft.Outlook",
    "com.apple.iWork.Pages",
    "com.apple.iWork.Numbers",
    "com.apple.iWork.Keynote",
    "com.google.GoogleDocs",
    "notion.id",
    "com.apple.Notes",
    "md.obsidian",
    "com.linear",
    "com.figma.Desktop",
    "com.microsoft.VSCode",
    "com.apple.Terminal",
    "com.googlecode.iterm2",
    "com.github.GitHubDesktop",
    "com.apple.finder",
    "com.apple.iCal",
    "com.apple.systempreferences"
  ]);
  APP_NAME_ALLOWED = /^[\p{L}\p{M}\p{N}_ .&'()+-]+$/u;
});

// src/utils/computerUse/mcpServer.ts
import { homedir } from "os";
async function tryGetInstalledAppNames() {
  const adapter = getComputerUseHostAdapter();
  const enumP = adapter.executor.listInstalledApps();
  let timer;
  const timeoutP = new Promise((resolve) => {
    timer = setTimeout(resolve, APP_ENUM_TIMEOUT_MS, undefined);
  });
  const installed = await Promise.race([enumP, timeoutP]).catch(() => {
    return;
  }).finally(() => clearTimeout(timer));
  if (!installed) {
    enumP.catch(() => {});
    logForDebugging(`[Computer Use MCP] app enumeration exceeded ${APP_ENUM_TIMEOUT_MS}ms or failed; tool description omits list`);
    return;
  }
  return filterAppsForDescription(installed, homedir());
}
async function createComputerUseMcpServerForCli() {
  const adapter = getComputerUseHostAdapter();
  const coordinateMode = getChicagoCoordinateMode();
  const server = createComputerUseMcpServer(adapter, coordinateMode);
  const installedAppNames = await tryGetInstalledAppNames();
  const tools = buildComputerUseTools(adapter.executor.capabilities, coordinateMode, installedAppNames);
  server.setRequestHandler(ListToolsRequestSchema, async () => adapter.isDisabled() ? { tools: [] } : { tools });
  return server;
}
async function runComputerUseMcpServer() {
  enableConfigs();
  initializeAnalyticsSink();
  const server = await createComputerUseMcpServerForCli();
  const transport = new StdioServerTransport;
  let exiting = false;
  const shutdownAndExit = async () => {
    if (exiting)
      return;
    exiting = true;
    await Promise.all([shutdown1PEventLogging(), shutdownDatadog()]);
    process.exit(0);
  };
  process.stdin.on("end", () => void shutdownAndExit());
  process.stdin.on("error", () => void shutdownAndExit());
  logForDebugging("[Computer Use MCP] Starting MCP server");
  await server.connect(transport);
  logForDebugging("[Computer Use MCP] MCP server started");
}
var APP_ENUM_TIMEOUT_MS = 1000;
var init_mcpServer = __esm(() => {
  init_src();
  init_sink();
  init_stdio();
  init_types();
  init_datadog();
  init_firstPartyEventLogger();
  init_config();
  init_debug();
  init_appNames();
  init_gates();
  init_hostAdapter();
});
init_mcpServer();

export {
  runComputerUseMcpServer,
  createComputerUseMcpServerForCli
};
