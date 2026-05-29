// @bun
import {
  fetchReferralRedemptions,
  formatCreditAmount,
  getCachedOrFetchPassesEligibility,
  getCachedRemainingPasses,
  init_referral,
  init_useExitOnCtrlCDWithKeybindings,
  useExitOnCtrlCDWithKeybindings
} from "./chunk-w7xjra5m.js";
import {
  init_useKeybinding
} from "./chunk-s2x040y6.js";
import"./chunk-kyaxezdn.js";
import {
  TEARDROP_ASTERISK,
  getGlobalConfig,
  init_config1 as init_config,
  init_figures,
  saveGlobalConfig
} from "./chunk-mk2vzd2n.js";
import"./chunk-mkae8zj9.js";
import"./chunk-cxmyg49v.js";
import {
  count,
  init_array
} from "./chunk-zwarn9h7.js";
import"./chunk-t16fercx.js";
import"./chunk-7hmy36fh.js";
import"./chunk-6kpbgc5w.js";
import"./chunk-d57t992t.js";
import"./chunk-64c1avct.js";
import"./chunk-0knhp7v5.js";
import"./chunk-8g5pe1gr.js";
import"./chunk-b62vj92a.js";
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
import {
  Link,
  Pane,
  ThemedBox_default,
  ThemedText,
  init_src,
  setClipboard,
  useKeybinding,
  use_input_default
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
import"./chunk-78009jh9.js";
import"./chunk-9awawyvh.js";
import"./chunk-hqpzpr71.js";
import"./chunk-zs5b1dgr.js";
import"./chunk-hnxmafvc.js";
import"./chunk-tv74hgw9.js";
import {
  init_log,
  logError
} from "./chunk-wd8mqz95.js";
import"./chunk-8tnsngw2.js";
import"./chunk-vsbyhpfy.js";
import"./chunk-p7pj6wf8.js";
import"./chunk-5z28bqne.js";
import"./chunk-qajrkk97.js";
import"./chunk-5khwvj1z.js";
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
  __esm,
  __toESM
} from "./chunk-qp2qdcda.js";

// src/components/Passes/Passes.tsx
function Passes({ onDone }) {
  const [loading, setLoading] = import_react.useState(true);
  const [passStatuses, setPassStatuses] = import_react.useState([]);
  const [isAvailable, setIsAvailable] = import_react.useState(false);
  const [referralLink, setReferralLink] = import_react.useState(null);
  const [referrerReward, setReferrerReward] = import_react.useState(undefined);
  const exitState = useExitOnCtrlCDWithKeybindings(() => onDone("Guest passes dialog dismissed", { display: "system" }));
  const handleCancel = import_react.useCallback(() => {
    onDone("Guest passes dialog dismissed", { display: "system" });
  }, [onDone]);
  useKeybinding("confirm:no", handleCancel, { context: "Confirmation" });
  use_input_default((_input, key) => {
    if (key.return && referralLink) {
      setClipboard(referralLink).then((raw) => {
        if (raw)
          process.stdout.write(raw);
        logEvent("tengu_guest_passes_link_copied", {});
        onDone(`Referral link copied to clipboard!`);
      });
    }
  });
  import_react.useEffect(() => {
    async function loadPassesData() {
      try {
        const eligibilityData = await getCachedOrFetchPassesEligibility();
        if (!eligibilityData || !eligibilityData.eligible) {
          setIsAvailable(false);
          setLoading(false);
          return;
        }
        setIsAvailable(true);
        if (eligibilityData.referral_code_details?.referral_link) {
          setReferralLink(eligibilityData.referral_code_details.referral_link);
        }
        setReferrerReward(eligibilityData.referrer_reward);
        const campaign = eligibilityData.referral_code_details?.campaign ?? "claude_code_guest_pass";
        let redemptionsData;
        try {
          redemptionsData = await fetchReferralRedemptions(campaign);
        } catch (err) {
          logError(err);
          setIsAvailable(false);
          setLoading(false);
          return;
        }
        const redemptions = redemptionsData.redemptions || [];
        const maxRedemptions = redemptionsData.limit || 3;
        const statuses = [];
        for (let i = 0;i < maxRedemptions; i++) {
          const redemption = redemptions[i];
          statuses.push({
            passNumber: i + 1,
            isAvailable: !redemption
          });
        }
        setPassStatuses(statuses);
        setLoading(false);
      } catch (err) {
        logError(err);
        setIsAvailable(false);
        setLoading(false);
      }
    }
    loadPassesData();
  }, []);
  if (loading) {
    return /* @__PURE__ */ jsx_dev_runtime.jsxDEV(Pane, {
      children: /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedBox_default, {
        flexDirection: "column",
        gap: 1,
        children: [
          /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
            dimColor: true,
            children: "Loading guest pass information\u2026"
          }, undefined, false, undefined, this),
          /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
            dimColor: true,
            italic: true,
            children: exitState.pending ? /* @__PURE__ */ jsx_dev_runtime.jsxDEV(jsx_dev_runtime.Fragment, {
              children: [
                "\u518d\u6309 ",
                exitState.keyName,
                " \u9000\u51fa"
              ]
            }, undefined, true, undefined, this) : /* @__PURE__ */ jsx_dev_runtime.jsxDEV(jsx_dev_runtime.Fragment, {
              children: "Esc \u53d6\u6d88"
            }, undefined, false, undefined, this)
          }, undefined, false, undefined, this)
        ]
      }, undefined, true, undefined, this)
    }, undefined, false, undefined, this);
  }
  if (!isAvailable) {
    return /* @__PURE__ */ jsx_dev_runtime.jsxDEV(Pane, {
      children: /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedBox_default, {
        flexDirection: "column",
        gap: 1,
        children: [
          /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
            children: "Guest passes are not currently available."
          }, undefined, false, undefined, this),
          /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
            dimColor: true,
            italic: true,
            children: exitState.pending ? /* @__PURE__ */ jsx_dev_runtime.jsxDEV(jsx_dev_runtime.Fragment, {
              children: [
                "\u518d\u6309 ",
                exitState.keyName,
                " \u9000\u51fa"
              ]
            }, undefined, true, undefined, this) : /* @__PURE__ */ jsx_dev_runtime.jsxDEV(jsx_dev_runtime.Fragment, {
              children: "Esc \u53d6\u6d88"
            }, undefined, false, undefined, this)
          }, undefined, false, undefined, this)
        ]
      }, undefined, true, undefined, this)
    }, undefined, false, undefined, this);
  }
  const availableCount = count(passStatuses, (p) => p.isAvailable);
  const sortedPasses = [...passStatuses].sort((a, b) => +b.isAvailable - +a.isAvailable);
  const renderTicket = (pass) => {
    const isRedeemed = !pass.isAvailable;
    if (isRedeemed) {
      return /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedBox_default, {
        flexDirection: "column",
        marginRight: 1,
        children: [
          /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
            dimColor: true,
            children: "\u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2571"
          }, undefined, false, undefined, this),
          /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
            dimColor: true,
            children: ` ) CC ${TEARDROP_ASTERISK} \u250A\u2571`
          }, undefined, false, undefined, this),
          /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
            dimColor: true,
            children: "\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2571"
          }, undefined, false, undefined, this)
        ]
      }, pass.passNumber, true, undefined, this);
    }
    return /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedBox_default, {
      flexDirection: "column",
      marginRight: 1,
      children: [
        /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
          children: "\u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510"
        }, undefined, false, undefined, this),
        /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
          children: [
            " ) CC ",
            /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
              color: "claude",
              children: TEARDROP_ASTERISK
            }, undefined, false, undefined, this),
            " \u250A ( "
          ]
        }, undefined, true, undefined, this),
        /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
          children: "\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518"
        }, undefined, false, undefined, this)
      ]
    }, pass.passNumber, true, undefined, this);
  };
  return /* @__PURE__ */ jsx_dev_runtime.jsxDEV(Pane, {
    children: /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedBox_default, {
      flexDirection: "column",
      gap: 1,
      children: [
        /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
          color: "permission",
          children: [
            "Guest passes \xB7 ",
            availableCount,
            " left"
          ]
        }, undefined, true, undefined, this),
        /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedBox_default, {
          flexDirection: "row",
          marginLeft: 2,
          children: sortedPasses.slice(0, 3).map((pass) => renderTicket(pass))
        }, undefined, false, undefined, this),
        referralLink && /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedBox_default, {
          marginLeft: 2,
          children: /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
            children: referralLink
          }, undefined, false, undefined, this)
        }, undefined, false, undefined, this),
        /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedBox_default, {
          flexDirection: "column",
          marginLeft: 2,
          children: /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
            dimColor: true,
            children: [
              referrerReward ? `Share a free week of Claude Code with friends. If they love it and subscribe, you'll get ${formatCreditAmount(referrerReward)} of extra usage to keep building. ` : "Share a free week of Claude Code with friends. ",
              /* @__PURE__ */ jsx_dev_runtime.jsxDEV(Link, {
                url: referrerReward ? "https://support.claude.com/en/articles/13456702-claude-code-guest-passes" : "https://support.claude.com/en/articles/12875061-claude-code-guest-passes",
                children: "Terms apply."
              }, undefined, false, undefined, this)
            ]
          }, undefined, true, undefined, this)
        }, undefined, false, undefined, this),
        /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedBox_default, {
          children: /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
            dimColor: true,
            italic: true,
            children: exitState.pending ? /* @__PURE__ */ jsx_dev_runtime.jsxDEV(jsx_dev_runtime.Fragment, {
              children: [
                "\u518d\u6309 ",
                exitState.keyName,
                " \u9000\u51fa"
              ]
            }, undefined, true, undefined, this) : /* @__PURE__ */ jsx_dev_runtime.jsxDEV(jsx_dev_runtime.Fragment, {
              children: "Enter \u590d\u5236\u94fe\u63a5 \u00b7 Esc \u53d6\u6d88"
            }, undefined, false, undefined, this)
          }, undefined, false, undefined, this)
        }, undefined, false, undefined, this)
      ]
    }, undefined, true, undefined, this)
  }, undefined, false, undefined, this);
}
var import_react, jsx_dev_runtime;
var init_Passes = __esm(() => {
  init_figures();
  init_useExitOnCtrlCDWithKeybindings();
  init_src();
  init_src();
  init_useKeybinding();
  init_analytics();
  init_referral();
  init_array();
  init_log();
  init_src();
  import_react = __toESM(require_react(), 1);
  jsx_dev_runtime = __toESM(require_jsx_dev_runtime(), 1);
});

// src/commands/passes/passes.tsx
async function call(onDone) {
  const config = getGlobalConfig();
  const isFirstVisit = !config.hasVisitedPasses;
  if (isFirstVisit) {
    const remaining = getCachedRemainingPasses();
    saveGlobalConfig((current) => ({
      ...current,
      hasVisitedPasses: true,
      passesLastSeenRemaining: remaining ?? current.passesLastSeenRemaining
    }));
  }
  logEvent("tengu_guest_passes_visited", { is_first_visit: isFirstVisit });
  return /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(Passes, {
    onDone
  }, undefined, false, undefined, this);
}
var jsx_dev_runtime2;
var init_passes = __esm(() => {
  init_Passes();
  init_analytics();
  init_referral();
  init_config();
  jsx_dev_runtime2 = __toESM(require_jsx_dev_runtime(), 1);
});
init_passes();

export {
  call
};
