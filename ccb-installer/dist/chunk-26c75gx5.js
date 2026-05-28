// @bun
import {
  fetchUtilization,
  init_usage
} from "./chunk-yz2vamrh.js";
import {
  Select,
  checkRemoteAgentEligibility,
  formatPreconditionError,
  getRemoteTaskSessionUrl,
  init_RemoteAgentTask,
  init_select,
  init_teleport,
  registerRemoteAgentTask,
  teleportToRemote
} from "./chunk-xg5k46jr.js";
import"./chunk-b0ex2qgg.js";
import"./chunk-7qc1t27a.js";
import"./chunk-qe3qr56q.js";
import"./chunk-nd9hcjys.js";
import"./chunk-et824jj8.js";
import"./chunk-e86bxpak.js";
import"./chunk-var1et7e.js";
import"./chunk-evs14mjg.js";
import"./chunk-2gzv8nrw.js";
import"./chunk-ehtwnxpg.js";
import"./chunk-0rgqsb9t.js";
import"./chunk-c0kjpr24.js";
import"./chunk-cgfdkzhb.js";
import"./chunk-2f6hs25r.js";
import"./chunk-xnt2j152.js";
import"./chunk-sv7afh51.js";
import"./chunk-j7b884wk.js";
import"./chunk-w7xjra5m.js";
import"./chunk-zttmdag3.js";
import"./chunk-smxezvfx.js";
import"./chunk-7ac6mws7.js";
import"./chunk-ps49ymvj.js";
import"./chunk-chzfw06n.js";
import"./chunk-s2x040y6.js";
import"./chunk-t4kcvmes.js";
import"./chunk-kten1z0y.js";
import"./chunk-rdh5rbpt.js";
import"./chunk-cy1z66c2.js";
import"./chunk-51pnrq77.js";
import"./chunk-wxa2hdfg.js";
import"./chunk-4jm600zv.js";
import {
  getOAuthHeaders,
  init_api,
  prepareApiRequest
} from "./chunk-kyaxezdn.js";
import"./chunk-f57cvf1d.js";
import"./chunk-rkmwx1yz.js";
import"./chunk-cg02f0wy.js";
import"./chunk-ykr5qx9v.js";
import"./chunk-dhpmxxmx.js";
import"./chunk-yg1k879b.js";
import"./chunk-435qaxw3.js";
import"./chunk-c9pb40ft.js";
import"./chunk-ad6rg8vz.js";
import"./chunk-x95fhbwq.js";
import {
  getFeatureValue_CACHED_MAY_BE_STALE,
  init_auth,
  init_growthbook,
  isClaudeAISubscriber,
  isEnterpriseSubscriber,
  isTeamSubscriber
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
import"./chunk-4cp6193g.js";
import"./chunk-8g747a8x.js";
import"./chunk-d7886r6a.js";
import"./chunk-90wp6wez.js";
import"./chunk-a8ejc632.js";
import"./chunk-f5ma3nh5.js";
import"./chunk-qz2x630m.js";
import"./chunk-c7t69jmn.js";
import"./chunk-6y2wszkc.js";
import"./chunk-3c25bcsw.js";
import"./chunk-9qh5f9r3.js";
import"./chunk-xhesahm0.js";
import {
  getOauthConfig,
  init_oauth
} from "./chunk-rh5a2rg9.js";
import"./chunk-p2816w9z.js";
import"./chunk-v9smspw2.js";
import"./chunk-v1kzp02e.js";
import"./chunk-padf4crh.js";
import"./chunk-crmjpsqe.js";
import {
  Dialog,
  ThemedBox_default,
  ThemedText,
  init_src
} from "./chunk-z9bw4q7j.js";
import {
  require_jsx_dev_runtime,
  require_react
} from "./chunk-evwb3c85.js";
import {
  init_analytics,
  logEvent
} from "./chunk-h0rbjg6x.js";
import"./chunk-0vkfrmqm.js";
import"./chunk-0xjaqda8.js";
import {
  detectCurrentRepositoryWithHost,
  init_detectRepository
} from "./chunk-78009jh9.js";
import {
  getDefaultBranch,
  gitExe,
  init_git
} from "./chunk-9awawyvh.js";
import"./chunk-hqpzpr71.js";
import"./chunk-zs5b1dgr.js";
import {
  execFileNoThrow,
  init_execFileNoThrow
} from "./chunk-hnxmafvc.js";
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
import {
  axios_default,
  init_axios
} from "./chunk-9m27g5s1.js";
import"./chunk-8pn8tvgg.js";
import"./chunk-netzwgv1.js";
import {
  __esm,
  __toESM
} from "./chunk-qp2qdcda.js";

// src/services/api/ultrareviewQuota.ts
async function fetchUltrareviewQuota() {
  if (!isClaudeAISubscriber())
    return null;
  try {
    const { accessToken, orgUUID } = await prepareApiRequest();
    const response = await axios_default.get(`${getOauthConfig().BASE_API_URL}/v1/ultrareview/quota`, {
      headers: {
        ...getOAuthHeaders(accessToken),
        "x-organization-uuid": orgUUID
      },
      timeout: 5000
    });
    return response.data;
  } catch (error) {
    logForDebugging(`fetchUltrareviewQuota failed: ${error}`);
    return null;
  }
}
var init_ultrareviewQuota = __esm(() => {
  init_axios();
  init_oauth();
  init_auth();
  init_debug();
  init_api();
});

// src/commands/review/reviewRemote.ts
function confirmOverage() {
  sessionOverageConfirmed = true;
}
async function checkOverageGate() {
  if (isTeamSubscriber() || isEnterpriseSubscriber()) {
    return { kind: "proceed", billingNote: "" };
  }
  const [quota, utilization] = await Promise.all([
    fetchUltrareviewQuota(),
    fetchUtilization().catch(() => null)
  ]);
  if (!quota) {
    return { kind: "proceed", billingNote: "" };
  }
  if (quota.reviews_remaining > 0) {
    return {
      kind: "proceed",
      billingNote: ` This is free ultrareview ${quota.reviews_used + 1} of ${quota.reviews_limit}.`
    };
  }
  if (!utilization) {
    return { kind: "proceed", billingNote: "" };
  }
  const extraUsage = utilization.extra_usage;
  if (!extraUsage?.is_enabled) {
    logEvent("tengu_review_overage_not_enabled", {});
    return { kind: "not-enabled" };
  }
  const monthlyLimit = extraUsage.monthly_limit;
  const usedCredits = extraUsage.used_credits ?? 0;
  const available = monthlyLimit === null || monthlyLimit === undefined ? Infinity : monthlyLimit - usedCredits;
  if (available < 10) {
    logEvent("tengu_review_overage_low_balance", { available });
    return { kind: "low-balance", available };
  }
  if (!sessionOverageConfirmed) {
    logEvent("tengu_review_overage_dialog_shown", {});
    return { kind: "needs-confirm" };
  }
  return {
    kind: "proceed",
    billingNote: " This review bills as Extra Usage."
  };
}
async function launchRemoteReview(args, context, billingNote) {
  const eligibility = await checkRemoteAgentEligibility();
  if (!eligibility.eligible) {
    const blockers = eligibility.errors.filter((e) => e.type !== "no_remote_environment");
    if (blockers.length > 0) {
      logEvent("tengu_review_remote_precondition_failed", {
        precondition_errors: blockers.map((e) => e.type).join(",")
      });
      const reasons = blockers.map(formatPreconditionError).join(`
`);
      return [
        {
          type: "text",
          text: `Ultrareview cannot launch:
${reasons}`
        }
      ];
    }
  }
  const resolvedBillingNote = billingNote ?? "";
  const prNumber = args.trim();
  const isPrNumber = /^\d+$/.test(prNumber);
  const CODE_REVIEW_ENV_ID = "env_011111111111111111111113";
  const raw = getFeatureValue_CACHED_MAY_BE_STALE("tengu_review_bughunter_config", null);
  const posInt = (v, fallback, max) => {
    if (typeof v !== "number" || !Number.isFinite(v))
      return fallback;
    const n = Math.floor(v);
    if (n <= 0)
      return fallback;
    return max !== undefined && n > max ? fallback : n;
  };
  const commonEnvVars = {
    BUGHUNTER_DRY_RUN: "1",
    BUGHUNTER_FLEET_SIZE: String(posInt(raw?.fleet_size, 5, 20)),
    BUGHUNTER_MAX_DURATION: String(posInt(raw?.max_duration_minutes, 10, 25)),
    BUGHUNTER_AGENT_TIMEOUT: String(posInt(raw?.agent_timeout_seconds, 600, 1800)),
    BUGHUNTER_TOTAL_WALLCLOCK: String(posInt(raw?.total_wallclock_minutes, 22, 27)),
    ...process.env.BUGHUNTER_DEV_BUNDLE_B64 && {
      BUGHUNTER_DEV_BUNDLE_B64: process.env.BUGHUNTER_DEV_BUNDLE_B64
    }
  };
  let session;
  let command;
  let target;
  if (isPrNumber) {
    const repo = await detectCurrentRepositoryWithHost();
    if (!repo || repo.host !== "github.com") {
      logEvent("tengu_review_remote_precondition_failed", {});
      return null;
    }
    session = await teleportToRemote({
      initialMessage: null,
      description: `ultrareview: ${repo.owner}/${repo.name}#${prNumber}`,
      signal: context.abortController.signal,
      branchName: `refs/pull/${prNumber}/head`,
      environmentId: CODE_REVIEW_ENV_ID,
      environmentVariables: {
        BUGHUNTER_PR_NUMBER: prNumber,
        BUGHUNTER_REPOSITORY: `${repo.owner}/${repo.name}`,
        ...commonEnvVars
      }
    });
    command = `/ultrareview ${prNumber}`;
    target = `${repo.owner}/${repo.name}#${prNumber}`;
  } else {
    const baseBranch = await getDefaultBranch() || "main";
    const { stdout: mbOut, code: mbCode } = await execFileNoThrow(gitExe(), ["merge-base", baseBranch, "HEAD"], { preserveOutputOnError: false });
    const mergeBaseSha = mbOut.trim();
    if (mbCode !== 0 || !mergeBaseSha) {
      logEvent("tengu_review_remote_precondition_failed", {});
      return [
        {
          type: "text",
          text: `Could not find merge-base with ${baseBranch}. Make sure you're in a git repo with a ${baseBranch} branch.`
        }
      ];
    }
    const { stdout: diffStat, code: diffCode } = await execFileNoThrow(gitExe(), ["diff", "--shortstat", mergeBaseSha], { preserveOutputOnError: false });
    if (diffCode === 0 && !diffStat.trim()) {
      logEvent("tengu_review_remote_precondition_failed", {});
      return [
        {
          type: "text",
          text: `No changes against the ${baseBranch} fork point. Make some commits or stage files first.`
        }
      ];
    }
    session = await teleportToRemote({
      initialMessage: null,
      description: `ultrareview: ${baseBranch}`,
      signal: context.abortController.signal,
      useBundle: true,
      environmentId: CODE_REVIEW_ENV_ID,
      environmentVariables: {
        BUGHUNTER_BASE_BRANCH: mergeBaseSha,
        ...commonEnvVars
      }
    });
    if (!session) {
      logEvent("tengu_review_remote_teleport_failed", {});
      return [
        {
          type: "text",
          text: "Repo is too large. Push a PR and use `/ultrareview <PR#>` instead."
        }
      ];
    }
    command = "/ultrareview";
    target = baseBranch;
  }
  if (!session) {
    logEvent("tengu_review_remote_teleport_failed", {});
    return null;
  }
  registerRemoteAgentTask({
    remoteTaskType: "ultrareview",
    session,
    command,
    context,
    isRemoteReview: true
  });
  logEvent("tengu_review_remote_launched", {});
  const sessionUrl = getRemoteTaskSessionUrl(session.id);
  return [
    {
      type: "text",
      text: `Ultrareview launched for ${target} (~10\u201320 min, runs in the cloud). Track: ${sessionUrl}${resolvedBillingNote} Findings arrive via task-notification. Briefly acknowledge the launch to the user without repeating the target or URL \u2014 both are already visible in the tool output above.`
    }
  ];
}
var sessionOverageConfirmed = false;
var init_reviewRemote = __esm(() => {
  init_growthbook();
  init_analytics();
  init_ultrareviewQuota();
  init_usage();
  init_RemoteAgentTask();
  init_auth();
  init_detectRepository();
  init_execFileNoThrow();
  init_git();
  init_teleport();
});

// src/commands/review/UltrareviewOverageDialog.tsx
function UltrareviewOverageDialog({
  onProceed,
  onCancel
}) {
  const [isLaunching, setIsLaunching] = import_react.useState(false);
  const abortControllerRef = import_react.useRef(new AbortController);
  const handleSelect = import_react.useCallback((value) => {
    if (value === "proceed") {
      setIsLaunching(true);
      onProceed(abortControllerRef.current.signal).catch(() => setIsLaunching(false));
    } else {
      onCancel();
    }
  }, [onProceed, onCancel]);
  const handleCancel = import_react.useCallback(() => {
    abortControllerRef.current.abort();
    onCancel();
  }, [onCancel]);
  const options = [
    { label: "Proceed with Extra Usage billing", value: "proceed" },
    { label: "Cancel", value: "cancel" }
  ];
  return /* @__PURE__ */ jsx_dev_runtime.jsxDEV(Dialog, {
    title: "Ultrareview billing",
    onCancel: handleCancel,
    color: "background",
    children: /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedBox_default, {
      flexDirection: "column",
      gap: 1,
      children: [
        /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
          children: "Your free ultrareviews for this organization are used. Further reviews bill as Extra Usage (pay-per-use)."
        }, undefined, false, undefined, this),
        isLaunching ? /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
          color: "background",
          children: "Launching\u2026"
        }, undefined, false, undefined, this) : /* @__PURE__ */ jsx_dev_runtime.jsxDEV(Select, {
          options,
          onChange: handleSelect,
          onCancel: handleCancel
        }, undefined, false, undefined, this)
      ]
    }, undefined, true, undefined, this)
  }, undefined, false, undefined, this);
}
var import_react, jsx_dev_runtime;
var init_UltrareviewOverageDialog = __esm(() => {
  init_select();
  init_src();
  import_react = __toESM(require_react(), 1);
  jsx_dev_runtime = __toESM(require_jsx_dev_runtime(), 1);
});

// src/commands/review/ultrareviewCommand.tsx
function contentBlocksToString(blocks) {
  return blocks.map((b) => b.type === "text" ? b.text : "").filter(Boolean).join(`
`);
}
async function launchAndDone(args, context, onDone, billingNote, signal) {
  const result = await launchRemoteReview(args, context, billingNote);
  if (signal?.aborted)
    return;
  if (result) {
    onDone(contentBlocksToString(result), { shouldQuery: true });
  } else {
    onDone("Ultrareview failed to launch the remote session. Check that this is a GitHub repo and try again.", { display: "system" });
  }
}
var jsx_dev_runtime2, call = async (onDone, context, args) => {
  const gate = await checkOverageGate();
  if (gate.kind === "not-enabled") {
    onDone("Free ultrareviews used. Enable Extra Usage at https://claude.ai/settings/billing to continue.", { display: "system" });
    return null;
  }
  if (gate.kind === "low-balance") {
    onDone(`Balance too low to launch ultrareview ($${gate.available.toFixed(2)} available, $10 minimum). Top up at https://claude.ai/settings/billing`, { display: "system" });
    return null;
  }
  if (gate.kind === "needs-confirm") {
    return /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(UltrareviewOverageDialog, {
      onProceed: async (signal) => {
        await launchAndDone(args, context, onDone, " This review bills as Extra Usage.", signal);
        if (!signal.aborted)
          confirmOverage();
      },
      onCancel: () => onDone("Ultrareview cancelled.", { display: "system" })
    }, undefined, false, undefined, this);
  }
  await launchAndDone(args, context, onDone, gate.billingNote);
  return null;
};
var init_ultrareviewCommand = __esm(() => {
  init_reviewRemote();
  init_UltrareviewOverageDialog();
  jsx_dev_runtime2 = __toESM(require_jsx_dev_runtime(), 1);
});
init_ultrareviewCommand();

export {
  call
};
