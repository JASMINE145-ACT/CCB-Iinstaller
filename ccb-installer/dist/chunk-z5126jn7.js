// @bun
import {
  ConfigurableShortcutHint,
  Select,
  Spinner,
  TeleportError,
  init_ConfigurableShortcutHint,
  init_CustomSelect,
  init_Spinner,
  init_TeleportError,
  init_teleport,
  init_useShortcutDisplay,
  init_useTerminalSize,
  teleportResumeCodeSession,
  useShortcutDisplay
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
import {
  init_useKeybinding
} from "./chunk-s2x040y6.js";
import"./chunk-t4kcvmes.js";
import"./chunk-kten1z0y.js";
import"./chunk-rdh5rbpt.js";
import"./chunk-cy1z66c2.js";
import"./chunk-51pnrq77.js";
import"./chunk-wxa2hdfg.js";
import"./chunk-4jm600zv.js";
import {
  fetchCodeSessionsFromSessionsAPI,
  init_api
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
import"./chunk-mk2vzd2n.js";
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
import"./chunk-rh5a2rg9.js";
import"./chunk-p2816w9z.js";
import"./chunk-v9smspw2.js";
import"./chunk-v1kzp02e.js";
import {
  formatRelativeTime,
  init_format
} from "./chunk-padf4crh.js";
import"./chunk-crmjpsqe.js";
import {
  Byline,
  KeyboardShortcutHint,
  ThemedBox_default,
  ThemedText,
  init_src,
  useKeybinding,
  useTerminalSize,
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
import {
  detectCurrentRepository,
  init_detectRepository
} from "./chunk-78009jh9.js";
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
  TeleportOperationError,
  errorMessage,
  init_debug,
  init_errors,
  logForDebugging
} from "./chunk-5khwvj1z.js";
import"./chunk-fbv4apne.js";
import {
  init_state,
  setTeleportedSessionInfo
} from "./chunk-gzp6rza1.js";
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
  __toESM
} from "./chunk-qp2qdcda.js";

// src/components/TeleportResumeWrapper.tsx
init_analytics();
var import_react3 = __toESM(require_react(), 1);

// src/hooks/useTeleportResume.tsx
init_state();
init_analytics();
init_errors();
init_teleport();
var import_react = __toESM(require_react(), 1);
function useTeleportResume(source) {
  const [isResuming, setIsResuming] = import_react.useState(false);
  const [error, setError] = import_react.useState(null);
  const [selectedSession, setSelectedSession] = import_react.useState(null);
  const resumeSession = import_react.useCallback(async (session) => {
    setIsResuming(true);
    setError(null);
    setSelectedSession(session);
    logEvent("tengu_teleport_resume_session", {
      source,
      session_id: session.id
    });
    try {
      const result = await teleportResumeCodeSession(session.id);
      setTeleportedSessionInfo({ sessionId: session.id });
      setIsResuming(false);
      return result;
    } catch (err) {
      const teleportError = {
        message: err instanceof TeleportOperationError ? err.message : errorMessage(err),
        formattedMessage: err instanceof TeleportOperationError ? err.formattedMessage : undefined,
        isOperationError: err instanceof TeleportOperationError
      };
      setError(teleportError);
      setIsResuming(false);
      return null;
    }
  }, [source]);
  const clearError = import_react.useCallback(() => {
    setError(null);
  }, []);
  return {
    resumeSession,
    isResuming,
    error,
    selectedSession,
    clearError
  };
}

// src/components/TeleportResumeWrapper.tsx
init_src();
init_useKeybinding();

// src/components/ResumeTask.tsx
init_useTerminalSize();
init_api();
init_src();
init_useKeybinding();
init_useShortcutDisplay();
init_debug();
init_detectRepository();
init_format();
init_ConfigurableShortcutHint();
init_CustomSelect();
init_src();
init_Spinner();
init_TeleportError();
var import_react2 = __toESM(require_react(), 1);
var jsx_dev_runtime = __toESM(require_jsx_dev_runtime(), 1);
var UPDATED_STRING = "\u66f4\u65b0";
var SPACE_BETWEEN_TABLE_COLUMNS = "  ";
function ResumeTask({
  onSelect,
  onCancel,
  isEmbedded = false
}) {
  const { rows } = useTerminalSize();
  const [sessions, setSessions] = import_react2.useState([]);
  const [currentRepo, setCurrentRepo] = import_react2.useState(null);
  const [loading, setLoading] = import_react2.useState(true);
  const [loadErrorType, setLoadErrorType] = import_react2.useState(null);
  const [retrying, setRetrying] = import_react2.useState(false);
  const [hasCompletedTeleportErrorFlow, setHasCompletedTeleportErrorFlow] = import_react2.useState(false);
  const [focusedIndex, setFocusedIndex] = import_react2.useState(1);
  const escKey = useShortcutDisplay("confirm:no", "Confirmation", "Esc");
  const loadSessions = import_react2.useCallback(async () => {
    try {
      setLoading(true);
      setLoadErrorType(null);
      const detectedRepo = await detectCurrentRepository();
      setCurrentRepo(detectedRepo);
      logForDebugging(`Current repository: ${detectedRepo || "not detected"}`);
      const codeSessions = await fetchCodeSessionsFromSessionsAPI();
      let filteredSessions = codeSessions;
      if (detectedRepo) {
        filteredSessions = codeSessions.filter((session) => {
          if (!session.repo)
            return false;
          const sessionRepo = `${session.repo.owner.login}/${session.repo.name}`;
          return sessionRepo === detectedRepo;
        });
        logForDebugging(`Filtered ${filteredSessions.length} sessions for repo ${detectedRepo} from ${codeSessions.length} total`);
      }
      const sortedSessions = [...filteredSessions].sort((a, b) => {
        const dateA = new Date(a.updated_at);
        const dateB = new Date(b.updated_at);
        return dateB.getTime() - dateA.getTime();
      });
      setSessions(sortedSessions);
    } catch (err) {
      const errorMessage2 = err instanceof Error ? err.message : String(err);
      logForDebugging(`Error loading code sessions: ${errorMessage2}`);
      setLoadErrorType(determineErrorType(errorMessage2));
    } finally {
      setLoading(false);
      setRetrying(false);
    }
  }, []);
  const handleRetry = () => {
    setRetrying(true);
    loadSessions();
  };
  useKeybinding("confirm:no", onCancel, { context: "Confirmation" });
  use_input_default((input, key) => {
    if (key.ctrl && input === "c") {
      onCancel();
      return;
    }
    if (key.ctrl && input === "r" && loadErrorType) {
      handleRetry();
      return;
    }
    if (loadErrorType !== null && key.return) {
      onCancel();
      return;
    }
  });
  const handleErrorComplete = import_react2.useCallback(() => {
    setHasCompletedTeleportErrorFlow(true);
    loadSessions();
  }, [setHasCompletedTeleportErrorFlow, loadSessions]);
  if (!hasCompletedTeleportErrorFlow) {
    return /* @__PURE__ */ jsx_dev_runtime.jsxDEV(TeleportError, {
      onComplete: handleErrorComplete
    }, undefined, false, undefined, this);
  }
  if (loading) {
    return /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedBox_default, {
      flexDirection: "column",
      padding: 1,
      children: [
        /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedBox_default, {
          flexDirection: "row",
          children: [
            /* @__PURE__ */ jsx_dev_runtime.jsxDEV(Spinner, {}, undefined, false, undefined, this),
            /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
              bold: true,
              children: "\u6b63\u5728\u52a0\u8f7d Claude Code \u4f1a\u8bdd\u2026"
            }, undefined, false, undefined, this)
          ]
        }, undefined, true, undefined, this),
        /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
          dimColor: true,
          children: retrying ? "\u6b63\u5728\u91cd\u8bd5\u2026" : "\u6b63\u5728\u83b7\u53d6 Claude Code \u4f1a\u8bdd\u2026"
        }, undefined, false, undefined, this)
      ]
    }, undefined, true, undefined, this);
  }
  if (loadErrorType) {
    return /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedBox_default, {
      flexDirection: "column",
      padding: 1,
      children: [
        /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
          bold: true,
          color: "error",
          children: "\u52a0\u8f7d Claude Code \u4f1a\u8bdd\u5931\u8d25"
        }, undefined, false, undefined, this),
        renderErrorSpecificGuidance(loadErrorType),
        /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
          dimColor: true,
          children: [
            "\u6309 ",
            /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
              bold: true,
              children: "Ctrl+R"
            }, undefined, false, undefined, this),
            " \u91cd\u8bd5 \xb7 \u6309",
            " ",
            /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
              bold: true,
              children: escKey
            }, undefined, false, undefined, this),
            " \u53d6\u6d88"
          ]
        }, undefined, true, undefined, this)
      ]
    }, undefined, true, undefined, this);
  }
  if (sessions.length === 0) {
    return /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedBox_default, {
      flexDirection: "column",
      padding: 1,
      children: [
        /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
          bold: true,
          children: [
            "\u672a\u627e\u5230 Claude Code \u4f1a\u8bdd",
            currentRepo && /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
              children: [
                " \uff08",
                currentRepo,
                "\uff09"
              ]
            }, undefined, true, undefined, this)
          ]
        }, undefined, true, undefined, this),
        /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedBox_default, {
          marginTop: 1,
          children: /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
            dimColor: true,
            children: [
              "\u6309 ",
              /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
                bold: true,
                children: escKey
              }, undefined, false, undefined, this),
              " \u53d6\u6d88"
            ]
          }, undefined, true, undefined, this)
        }, undefined, false, undefined, this)
      ]
    }, undefined, true, undefined, this);
  }
  const sessionMetadata = sessions.map((session) => ({
    ...session,
    timeString: formatRelativeTime(new Date(session.updated_at))
  }));
  const maxTimeStringLength = Math.max(UPDATED_STRING.length, ...sessionMetadata.map((meta) => meta.timeString.length));
  const options = sessionMetadata.map(({ timeString, title, id }) => {
    const paddedTime = timeString.padEnd(maxTimeStringLength, " ");
    return {
      label: `${paddedTime}  ${title}`,
      value: id
    };
  });
  const layoutOverhead = 7;
  const maxVisibleOptions = Math.max(1, isEmbedded ? Math.min(sessions.length, 5, rows - 6 - layoutOverhead) : Math.min(sessions.length, rows - 1 - layoutOverhead));
  const maxHeight = maxVisibleOptions + layoutOverhead;
  const showScrollPosition = sessions.length > maxVisibleOptions;
  return /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedBox_default, {
    flexDirection: "column",
    padding: 1,
    height: maxHeight,
    children: [
      /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
        bold: true,
        children: [
          "\u9009\u62e9\u8981\u6062\u590d\u7684\u4f1a\u8bdd",
          showScrollPosition && /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
            dimColor: true,
            children: [
              " ",
              "\uff08",
              focusedIndex,
              " / ",
              sessions.length,
              "\uff09"
            ]
          }, undefined, true, undefined, this),
          currentRepo && /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
            dimColor: true,
            children: [
              " \uff08",
              currentRepo,
              "\uff09"
            ]
          }, undefined, true, undefined, this),
          ":"
        ]
      }, undefined, true, undefined, this),
      /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedBox_default, {
        flexDirection: "column",
        marginTop: 1,
        flexGrow: 1,
        children: [
          /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedBox_default, {
            marginLeft: 2,
            children: /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
              bold: true,
              children: [
                UPDATED_STRING.padEnd(maxTimeStringLength, " "),
                SPACE_BETWEEN_TABLE_COLUMNS,
                "\u4f1a\u8bdd\u6807\u9898"
              ]
            }, undefined, true, undefined, this)
          }, undefined, false, undefined, this),
          /* @__PURE__ */ jsx_dev_runtime.jsxDEV(Select, {
            visibleOptionCount: maxVisibleOptions,
            options,
            onChange: (value) => {
              const session = sessions.find((s) => s.id === value);
              if (session) {
                onSelect(session);
              }
            },
            onFocus: (value) => {
              const index = options.findIndex((o) => o.value === value);
              if (index >= 0) {
                setFocusedIndex(index + 1);
              }
            }
          }, undefined, false, undefined, this)
        ]
      }, undefined, true, undefined, this),
      /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedBox_default, {
        flexDirection: "row",
        children: /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
          dimColor: true,
          children: /* @__PURE__ */ jsx_dev_runtime.jsxDEV(Byline, {
            children: [
              /* @__PURE__ */ jsx_dev_runtime.jsxDEV(KeyboardShortcutHint, {
                shortcut: "\u2191/\u2193",
                action: "\u9009\u62e9"
              }, undefined, false, undefined, this),
              /* @__PURE__ */ jsx_dev_runtime.jsxDEV(KeyboardShortcutHint, {
                shortcut: "Enter",
                action: "\u786e\u8ba4"
              }, undefined, false, undefined, this),
              /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ConfigurableShortcutHint, {
                action: "confirm:no",
                context: "Confirmation",
                fallback: "Esc",
                description: "\u53d6\u6d88"
              }, undefined, false, undefined, this)
            ]
          }, undefined, true, undefined, this)
        }, undefined, false, undefined, this)
      }, undefined, false, undefined, this)
    ]
  }, undefined, true, undefined, this);
}
function determineErrorType(errorMessage2) {
  const message = errorMessage2.toLowerCase();
  if (message.includes("fetch") || message.includes("network") || message.includes("timeout")) {
    return "network";
  }
  if (message.includes("auth") || message.includes("token") || message.includes("permission") || message.includes("oauth") || message.includes("not authenticated") || message.includes("/login") || message.includes("console account") || message.includes("403")) {
    return "auth";
  }
  if (message.includes("api") || message.includes("rate limit") || message.includes("500") || message.includes("529")) {
    return "api";
  }
  return "other";
}
function renderErrorSpecificGuidance(errorType) {
  switch (errorType) {
    case "network":
      return /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedBox_default, {
        marginY: 1,
        flexDirection: "column",
        children: /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
          dimColor: true,
          children: "\u8bf7\u68c0\u67e5\u7f51\u7edc\u8fde\u63a5"
        }, undefined, false, undefined, this)
      }, undefined, false, undefined, this);
    case "auth":
      return /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedBox_default, {
        marginY: 1,
        flexDirection: "column",
        children: [
          /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
            dimColor: true,
            children: "Teleport \u9700\u8981 Claude \u8d26\u6237"
          }, undefined, false, undefined, this),
          /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
            dimColor: true,
            children: [
              "\u8fd0\u884c ",
              /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
                bold: true,
                children: "/login"
              }, undefined, false, undefined, this),
              ' \u5e76\u9009\u62e9\u201cClaude account with subscription\u201d'
            ]
          }, undefined, true, undefined, this)
        ]
      }, undefined, true, undefined, this);
    case "api":
      return /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedBox_default, {
        marginY: 1,
        flexDirection: "column",
        children: /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
          dimColor: true,
          children: "\u62b1\u6b49\uff0cClaude \u9047\u5230\u9519\u8bef"
        }, undefined, false, undefined, this)
      }, undefined, false, undefined, this);
    case "other":
      return /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedBox_default, {
        marginY: 1,
        flexDirection: "row",
        children: /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
          dimColor: true,
          children: "\u62b1\u6b49\uff0cClaude Code \u9047\u5230\u9519\u8bef"
        }, undefined, false, undefined, this)
      }, undefined, false, undefined, this);
  }
}

// src/components/TeleportResumeWrapper.tsx
init_Spinner();
var jsx_dev_runtime2 = __toESM(require_jsx_dev_runtime(), 1);
function TeleportResumeWrapper({
  onComplete,
  onCancel,
  onError,
  isEmbedded = false,
  source
}) {
  const { resumeSession, isResuming, error, selectedSession } = useTeleportResume(source);
  import_react3.useEffect(() => {
    logEvent("tengu_teleport_started", {
      source
    });
  }, [source]);
  const handleSelect = async (session) => {
    const result = await resumeSession(session);
    if (result) {
      onComplete(result);
    } else if (error) {
      if (onError) {
        onError(error.message, error.formattedMessage);
      }
    }
  };
  const handleCancel = () => {
    logEvent("tengu_teleport_cancelled", {});
    onCancel();
  };
  useKeybinding("app:interrupt", handleCancel, {
    context: "Global",
    isActive: !!error && !onError
  });
  if (isResuming && selectedSession) {
    return /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedBox_default, {
      flexDirection: "column",
      padding: 1,
      children: [
        /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedBox_default, {
          flexDirection: "row",
          children: [
            /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(Spinner, {}, undefined, false, undefined, this),
            /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedText, {
              bold: true,
              children: "\u6b63\u5728\u6062\u590d\u4f1a\u8bdd\u2026"
            }, undefined, false, undefined, this)
          ]
        }, undefined, true, undefined, this),
        /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedText, {
          dimColor: true,
          children: [
            '\u6b63\u5728\u52a0\u8f7d\u201c',
            selectedSession.title,
            '"\u2026'
          ]
        }, undefined, true, undefined, this)
      ]
    }, undefined, true, undefined, this);
  }
  if (error && !onError) {
    return /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedBox_default, {
      flexDirection: "column",
      padding: 1,
      children: [
        /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedText, {
          bold: true,
          color: "error",
          children: "\u6062\u590d\u4f1a\u8bdd\u5931\u8d25"
        }, undefined, false, undefined, this),
        /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedText, {
          dimColor: true,
          children: error.message
        }, undefined, false, undefined, this),
        /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedBox_default, {
          marginTop: 1,
          children: /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedText, {
            dimColor: true,
            children: [
              "\u6309 ",
              /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedText, {
                bold: true,
                children: "Esc"
              }, undefined, false, undefined, this),
              " \u53d6\u6d88"
            ]
          }, undefined, true, undefined, this)
        }, undefined, false, undefined, this)
      ]
    }, undefined, true, undefined, this);
  }
  return /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ResumeTask, {
    onSelect: handleSelect,
    onCancel: handleCancel,
    isEmbedded
  }, undefined, false, undefined, this);
}
export {
  TeleportResumeWrapper
};
