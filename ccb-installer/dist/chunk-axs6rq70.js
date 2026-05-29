// @bun
import {
  ConfigurableShortcutHint,
  MAX_TRANSCRIPT_READ_BYTES,
  TextInput,
  asSystemPrompt,
  extractTeammateTranscriptsFromTasks,
  getLastAssistantMessage,
  getTranscriptPath,
  init_ConfigurableShortcutHint,
  init_TextInput,
  init_claude,
  init_errors,
  init_messages1 as init_messages,
  init_sessionStorage,
  init_systemPromptType,
  init_useTerminalSize,
  loadAllSubagentTranscriptsFromDisk,
  normalizeMessagesForAPI,
  queryHaiku,
  startsWithApiErrorPrefix
} from "./chunk-xg5k46jr.js";
import {
  init_useKeybinding
} from "./chunk-s2x040y6.js";
import {
  init_browser,
  openBrowser
} from "./chunk-f57cvf1d.js";
import {
  checkAndRefreshOAuthTokenIfNeeded,
  getAuthHeaders,
  getUserAgent,
  init_auth,
  init_firstPartyEventLogger,
  init_http,
  logEventTo1P
} from "./chunk-mk2vzd2n.js";
import {
  env,
  init_env
} from "./chunk-9qh5f9r3.js";
import {
  Byline,
  Dialog,
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
import {
  getGitState,
  getIsGit,
  init_git
} from "./chunk-9awawyvh.js";
import {
  getInMemoryErrors,
  init_log,
  init_privacyLevel,
  isEssentialTrafficOnly,
  logError
} from "./chunk-wd8mqz95.js";
import {
  init_debug,
  init_slowOperations,
  jsonStringify,
  logForDebugging
} from "./chunk-5khwvj1z.js";
import {
  getLastAPIRequest,
  init_state
} from "./chunk-gzp6rza1.js";
import {
  axios_default,
  init_axios
} from "./chunk-9m27g5s1.js";
import {
  __esm,
  __toESM
} from "./chunk-qp2qdcda.js";

// src/components/Feedback.tsx
import { readFile, stat } from "fs/promises";
function redactSensitiveInfo(text) {
  let redacted = text;
  redacted = redacted.replace(/"(sk-ant[^\s"']{24,})"/g, '"[REDACTED_API_KEY]"');
  redacted = redacted.replace(/(?<![A-Za-z0-9"'])(sk-ant-?[A-Za-z0-9_-]{10,})(?![A-Za-z0-9"'])/g, "[REDACTED_API_KEY]");
  redacted = redacted.replace(/AWS key: "(AWS[A-Z0-9]{20,})"/g, 'AWS key: "[REDACTED_AWS_KEY]"');
  redacted = redacted.replace(/(AKIA[A-Z0-9]{16})/g, "[REDACTED_AWS_KEY]");
  redacted = redacted.replace(/(?<![A-Za-z0-9])(AIza[A-Za-z0-9_-]{35})(?![A-Za-z0-9])/g, "[REDACTED_GCP_KEY]");
  redacted = redacted.replace(/(?<![A-Za-z0-9])([a-z0-9-]+@[a-z0-9-]+\.iam\.gserviceaccount\.com)(?![A-Za-z0-9])/g, "[REDACTED_GCP_SERVICE_ACCOUNT]");
  redacted = redacted.replace(/(["']?x-api-key["']?\s*[:=]\s*["']?)[^"',\s)}\]]+/gi, "$1[REDACTED_API_KEY]");
  redacted = redacted.replace(/(["']?authorization["']?\s*[:=]\s*["']?(bearer\s+)?)[^"',\s)}\]]+/gi, "$1[REDACTED_TOKEN]");
  redacted = redacted.replace(/(AWS[_-][A-Za-z0-9_]+\s*[=:]\s*)["']?[^"',\s)}\]]+["']?/gi, "$1[REDACTED_AWS_VALUE]");
  redacted = redacted.replace(/(GOOGLE[_-][A-Za-z0-9_]+\s*[=:]\s*)["']?[^"',\s)}\]]+["']?/gi, "$1[REDACTED_GCP_VALUE]");
  redacted = redacted.replace(/((API[-_]?KEY|TOKEN|SECRET|PASSWORD)\s*[=:]\s*)["']?[^"',\s)}\]]+["']?/gi, "$1[REDACTED]");
  return redacted;
}
function getSanitizedErrorLogs() {
  return getInMemoryErrors().map((errorInfo) => {
    const errorCopy = { ...errorInfo };
    if (errorCopy && typeof errorCopy.error === "string") {
      errorCopy.error = redactSensitiveInfo(errorCopy.error);
    }
    return errorCopy;
  });
}
async function loadRawTranscriptJsonl() {
  try {
    const transcriptPath = getTranscriptPath();
    const { size } = await stat(transcriptPath);
    if (size > MAX_TRANSCRIPT_READ_BYTES) {
      logForDebugging(`Skipping raw transcript read: file too large (${size} bytes)`, { level: "warn" });
      return null;
    }
    return await readFile(transcriptPath, "utf-8");
  } catch {
    return null;
  }
}
function Feedback({
  abortSignal,
  messages,
  initialDescription,
  onDone,
  backgroundTasks = {}
}) {
  const [step, setStep] = import_react.useState("userInput");
  const [cursorOffset, setCursorOffset] = import_react.useState(0);
  const [description, setDescription] = import_react.useState(initialDescription ?? "");
  const [feedbackId, setFeedbackId] = import_react.useState(null);
  const [error, setError] = import_react.useState(null);
  const [envInfo, setEnvInfo] = import_react.useState({ isGit: false, gitState: null });
  const [title, setTitle] = import_react.useState(null);
  const textInputColumns = useTerminalSize().columns - 4;
  import_react.useEffect(() => {
    async function loadEnvInfo() {
      const isGit = await getIsGit();
      let gitState = null;
      if (isGit) {
        gitState = await getGitState();
      }
      setEnvInfo({ isGit, gitState });
    }
    loadEnvInfo();
  }, []);
  const submitReport = import_react.useCallback(async () => {
    setStep("submitting");
    setError(null);
    setFeedbackId(null);
    const sanitizedErrors = getSanitizedErrorLogs();
    const lastAssistantMessage = getLastAssistantMessage(messages);
    const lastAssistantMessageId = lastAssistantMessage?.requestId ?? null;
    const [diskTranscripts, rawTranscriptJsonl] = await Promise.all([
      loadAllSubagentTranscriptsFromDisk(),
      loadRawTranscriptJsonl()
    ]);
    const teammateTranscripts = extractTeammateTranscriptsFromTasks(backgroundTasks);
    const subagentTranscripts = { ...diskTranscripts, ...teammateTranscripts };
    const reportData = {
      latestAssistantMessageId: lastAssistantMessageId,
      message_count: messages.length,
      datetime: new Date().toISOString(),
      description,
      platform: env.platform,
      gitRepo: envInfo.isGit,
      terminal: env.terminal,
      version: "2.1.888",
      transcript: normalizeMessagesForAPI(messages),
      errors: sanitizedErrors,
      lastApiRequest: getLastAPIRequest(),
      ...Object.keys(subagentTranscripts).length > 0 && {
        subagentTranscripts
      },
      ...rawTranscriptJsonl && { rawTranscriptJsonl }
    };
    const [result, t] = await Promise.all([
      submitFeedback(reportData, abortSignal),
      generateTitle(description, abortSignal)
    ]);
    setTitle(t);
    if (result.success) {
      if (result.feedbackId) {
        setFeedbackId(result.feedbackId);
        logEvent("tengu_bug_report_submitted", {
          feedback_id: result.feedbackId,
          last_assistant_message_id: lastAssistantMessageId
        });
        logEventTo1P("tengu_bug_report_description", {
          feedback_id: result.feedbackId,
          description: redactSensitiveInfo(description)
        });
      }
      setStep("done");
    } else {
      if (result.isZdrOrg) {
        setError("Feedback collection is not available for organizations with custom data retention policies.");
      } else {
        setError("Could not submit feedback. Please try again later.");
      }
      setStep("userInput");
    }
  }, [description, envInfo.isGit, messages]);
  const handleCancel = import_react.useCallback(() => {
    if (step === "done") {
      if (error) {
        onDone("Error submitting feedback / bug report", {
          display: "system"
        });
      } else {
        onDone("Feedback / bug report submitted", { display: "system" });
      }
      return;
    }
    onDone("Feedback / bug report cancelled", { display: "system" });
  }, [step, error, onDone]);
  useKeybinding("confirm:no", handleCancel, {
    context: "Settings",
    isActive: step === "userInput"
  });
  use_input_default((input, key) => {
    if (step === "done") {
      if (key.return && title) {
        const issueUrl = createGitHubIssueUrl(feedbackId ?? "", title, description, getSanitizedErrorLogs());
        openBrowser(issueUrl);
      }
      if (error) {
        onDone("Error submitting feedback / bug report", {
          display: "system"
        });
      } else {
        onDone("Feedback / bug report submitted", { display: "system" });
      }
      return;
    }
    if (error && step !== "userInput") {
      onDone("Error submitting feedback / bug report", {
        display: "system"
      });
      return;
    }
    if (step === "consent" && (key.return || input === " ")) {
      submitReport();
    }
  });
  return /* @__PURE__ */ jsx_dev_runtime.jsxDEV(Dialog, {
    title: "\u63d0\u4ea4\u53cd\u9988 / \u7f3a\u9677\u62a5\u544a",
    onCancel: handleCancel,
    isCancelActive: step !== "userInput",
    inputGuide: (exitState) => exitState.pending ? /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
      children: [
        "\u6309 ",
        exitState.keyName,
        " \u518d\u6b21\u9000\u51fa"
      ]
    }, undefined, true, undefined, this) : step === "userInput" ? /* @__PURE__ */ jsx_dev_runtime.jsxDEV(Byline, {
      children: [
        /* @__PURE__ */ jsx_dev_runtime.jsxDEV(KeyboardShortcutHint, {
          shortcut: "Enter",
          action: "\u7ee7\u7eed"
        }, undefined, false, undefined, this),
        /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ConfigurableShortcutHint, {
          action: "confirm:no",
          context: "Confirmation",
          fallback: "Esc",
          description: "\u53d6\u6d88"
        }, undefined, false, undefined, this)
      ]
    }, undefined, true, undefined, this) : step === "consent" ? /* @__PURE__ */ jsx_dev_runtime.jsxDEV(Byline, {
      children: [
        /* @__PURE__ */ jsx_dev_runtime.jsxDEV(KeyboardShortcutHint, {
          shortcut: "Enter",
          action: "\u63d0\u4ea4"
        }, undefined, false, undefined, this),
        /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ConfigurableShortcutHint, {
          action: "confirm:no",
          context: "Confirmation",
          fallback: "Esc",
          description: "\u53d6\u6d88"
        }, undefined, false, undefined, this)
      ]
    }, undefined, true, undefined, this) : null,
    children: [
      step === "userInput" && /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedBox_default, {
        flexDirection: "column",
        gap: 1,
        children: [
          /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
            children: "\u8bf7\u5728\u4e0b\u65b9\u63cf\u8ff0\u95ee\u9898\uff1a"
          }, undefined, false, undefined, this),
          /* @__PURE__ */ jsx_dev_runtime.jsxDEV(TextInput, {
            value: description,
            onChange: (value) => {
              setDescription(value);
              if (error) {
                setError(null);
              }
            },
            columns: textInputColumns,
            onSubmit: () => setStep("consent"),
            onExitMessage: () => onDone("Feedback cancelled", { display: "system" }),
            cursorOffset,
            onChangeCursorOffset: setCursorOffset,
            showCursor: true
          }, undefined, false, undefined, this),
          error && /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedBox_default, {
            flexDirection: "column",
            gap: 1,
            children: [
              /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
                color: "error",
                children: error
              }, undefined, false, undefined, this),
              /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
                dimColor: true,
                children: "\u7f16\u8f91\u540e\u6309 Enter \u91cd\u8bd5\uff0c\u6216 Esc \u53d6\u6d88"
              }, undefined, false, undefined, this)
            ]
          }, undefined, true, undefined, this)
        ]
      }, undefined, true, undefined, this),
      step === "consent" && /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedBox_default, {
        flexDirection: "column",
        children: [
          /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
            children: "\u672c\u62a5\u544a\u5c06\u5305\u542b\uff1a"
          }, undefined, false, undefined, this),
          /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedBox_default, {
            marginLeft: 2,
            flexDirection: "column",
            children: [
              /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
                children: [
                  "- \u60a8\u7684\u53cd\u9988/\u7f3a\u9677\u63cf\u8ff0\uff1a",
                  " ",
                  /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
                    dimColor: true,
                    children: description
                  }, undefined, false, undefined, this)
                ]
              }, undefined, true, undefined, this),
              /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
                children: [
                  "- \u73af\u5883\u4fe1\u606f\uff1a",
                  " ",
                  /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
                    dimColor: true,
                    children: [
                      env.platform,
                      ", ",
                      env.terminal,
                      ", v",
                      "2.1.888"
                    ]
                  }, undefined, true, undefined, this)
                ]
              }, undefined, true, undefined, this),
              envInfo.gitState && /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
                children: [
                  "- Git \u4ed3\u5e93\u5143\u6570\u636e\uff1a",
                  " ",
                  /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
                    dimColor: true,
                    children: [
                      envInfo.gitState.branchName,
                      envInfo.gitState.commitHash ? `, ${envInfo.gitState.commitHash.slice(0, 7)}` : "",
                      envInfo.gitState.remoteUrl ? ` @ ${envInfo.gitState.remoteUrl}` : "",
                      !envInfo.gitState.isHeadOnRemote && ", \u672a\u540c\u6b65",
                      !envInfo.gitState.isClean && ", \u6709\u672c\u5730\u66f4\u6539"
                    ]
                  }, undefined, true, undefined, this)
                ]
              }, undefined, true, undefined, this),
              /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
                children: "- \u5f53\u524d\u4f1a\u8bdd\u8bb0\u5f55"
              }, undefined, false, undefined, this)
            ]
          }, undefined, true, undefined, this),
          /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedBox_default, {
            marginTop: 1,
            children: /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
              wrap: "wrap",
              dimColor: true,
              children: [
                "\u6211\u4eec\u5c06\u4f7f\u7528\u60a8\u7684\u53cd\u9988\u6765\u6392\u67e5\u76f8\u5173\u95ee\u9898\u6216\u6539\u8fdb",
                " ",
                "Claude Code \u7684\u529f\u80fd\uff08\u4f8b\u5982\u964d\u4f4e\u672a\u6765\u51fa\u73b0 bug \u7684\u6982\u7387\uff09\u3002"
              ]
            }, undefined, true, undefined, this)
          }, undefined, false, undefined, this),
          /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedBox_default, {
            marginTop: 1,
            children: /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
              children: [
                "\u6309 ",
                /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
                  bold: true,
                  children: "Enter"
                }, undefined, false, undefined, this),
                " \u786e\u8ba4\u5e76\u63d0\u4ea4\u3002"
              ]
            }, undefined, true, undefined, this)
          }, undefined, false, undefined, this)
        ]
      }, undefined, true, undefined, this),
      step === "submitting" && /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedBox_default, {
        flexDirection: "row",
        gap: 1,
        children: /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
          children: "\u6b63\u5728\u63d0\u4ea4\u62a5\u544a\u2026"
        }, undefined, false, undefined, this)
      }, undefined, false, undefined, this),
      step === "done" && /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedBox_default, {
        flexDirection: "column",
        children: [
          error ? /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
            color: "error",
            children: error
          }, undefined, false, undefined, this) : /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
            color: "success",
            children: "\u611f\u8c22\u60a8\u7684\u62a5\u544a\uff01"
          }, undefined, false, undefined, this),
          feedbackId && /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
            dimColor: true,
            children: [
              "\u53cd\u9988 ID\uff1a ",
              feedbackId
            ]
          }, undefined, true, undefined, this),
          /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedBox_default, {
            marginTop: 1,
            children: [
              /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
                children: "\u6309 "
              }, undefined, false, undefined, this),
              /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
                bold: true,
                children: "Enter "
              }, undefined, false, undefined, this),
              /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
                children: "\u6253\u5f00\u6d4f\u89c8\u5668\u8349\u521d GitHub Issue\uff0c\u6216\u6309\u5176\u4ed6\u952e\u5173\u95ed\u3002"
              }, undefined, false, undefined, this)
            ]
          }, undefined, true, undefined, this)
        ]
      }, undefined, true, undefined, this)
    ]
  }, undefined, true, undefined, this);
}
function createGitHubIssueUrl(feedbackId, title, description, errors) {
  const sanitizedTitle = redactSensitiveInfo(title);
  const sanitizedDescription = redactSensitiveInfo(description);
  const bodyPrefix = `**Bug Description**
${sanitizedDescription}

` + `**Environment Info**
` + `- Platform: ${env.platform}
` + `- Terminal: ${env.terminal}
` + `- Version: ${"2.1.888"}
` + `- Feedback ID: ${feedbackId}
` + `
**Errors**
\`\`\`json
`;
  const errorSuffix = `
\`\`\`
`;
  const errorsJson = jsonStringify(errors);
  const baseUrl = `${GITHUB_ISSUES_REPO_URL}/new?title=${encodeURIComponent(sanitizedTitle)}&labels=user-reported,bug&body=`;
  const truncationNote = `
**Note:** Content was truncated.
`;
  const encodedPrefix = encodeURIComponent(bodyPrefix);
  const encodedSuffix = encodeURIComponent(errorSuffix);
  const encodedNote = encodeURIComponent(truncationNote);
  const encodedErrors = encodeURIComponent(errorsJson);
  const spaceForErrors = GITHUB_URL_LIMIT - baseUrl.length - encodedPrefix.length - encodedSuffix.length - encodedNote.length;
  if (spaceForErrors <= 0) {
    const ellipsis2 = encodeURIComponent("\u2026");
    const buffer2 = 50;
    const maxEncodedLength = GITHUB_URL_LIMIT - baseUrl.length - ellipsis2.length - encodedNote.length - buffer2;
    const fullBody = bodyPrefix + errorsJson + errorSuffix;
    let encodedFullBody = encodeURIComponent(fullBody);
    if (encodedFullBody.length > maxEncodedLength) {
      encodedFullBody = encodedFullBody.slice(0, maxEncodedLength);
      const lastPercent2 = encodedFullBody.lastIndexOf("%");
      if (lastPercent2 >= encodedFullBody.length - 2) {
        encodedFullBody = encodedFullBody.slice(0, lastPercent2);
      }
    }
    return baseUrl + encodedFullBody + ellipsis2 + encodedNote;
  }
  if (encodedErrors.length <= spaceForErrors) {
    return baseUrl + encodedPrefix + encodedErrors + encodedSuffix;
  }
  const ellipsis = encodeURIComponent("\u2026");
  const buffer = 50;
  let truncatedEncodedErrors = encodedErrors.slice(0, spaceForErrors - ellipsis.length - buffer);
  const lastPercent = truncatedEncodedErrors.lastIndexOf("%");
  if (lastPercent >= truncatedEncodedErrors.length - 2) {
    truncatedEncodedErrors = truncatedEncodedErrors.slice(0, lastPercent);
  }
  return baseUrl + encodedPrefix + truncatedEncodedErrors + ellipsis + encodedSuffix + encodedNote;
}
async function generateTitle(description, abortSignal) {
  try {
    const response = await queryHaiku({
      systemPrompt: asSystemPrompt([
        "Generate a concise, technical issue title (max 80 chars) for a public GitHub issue based on this bug report for Claude Code.",
        "Claude Code is an agentic coding CLI based on the Anthropic API.",
        "The title should:",
        "- Include the type of issue [Bug] or [Feature Request] as the first thing in the title",
        "- Be concise, specific and descriptive of the actual problem",
        "- Use technical terminology appropriate for a software issue",
        '- For error messages, extract the key error (e.g., "Missing Tool Result Block" rather than the full message)',
        "- Be direct and clear for developers to understand the problem",
        '- If you cannot determine a clear issue, use "Bug Report: [brief description]"',
        "- Any LLM API errors are from the Anthropic API, not from any other model provider",
        "Your response will be directly used as the title of the Github issue, and as such should not contain any other commentary or explaination",
        'Examples of good titles include: "[Bug] Auto-Compact triggers to soon", "[Bug] Anthropic API Error: Missing Tool Result Block", "[Bug] Error: Invalid Model Name for Opus"'
      ]),
      userPrompt: description,
      signal: abortSignal,
      options: {
        hasAppendSystemPrompt: false,
        toolChoice: undefined,
        isNonInteractiveSession: false,
        agents: [],
        querySource: "feedback",
        mcpTools: []
      }
    });
    const _firstBlock = response?.message?.content?.[0];
    const title = _firstBlock?.type === "text" ? _firstBlock.text : "Bug Report";
    if (startsWithApiErrorPrefix(title)) {
      return createFallbackTitle(description);
    }
    return title;
  } catch (error) {
    logError(error);
    return createFallbackTitle(description);
  }
}
function createFallbackTitle(description) {
  const firstLine = description.split(`
`)[0] || "";
  if (firstLine.length <= 60 && firstLine.length > 5) {
    return firstLine;
  }
  let truncated = firstLine.slice(0, 60);
  if (firstLine.length > 60) {
    const lastSpace = truncated.lastIndexOf(" ");
    if (lastSpace > 30) {
      truncated = truncated.slice(0, lastSpace);
    }
    truncated += "...";
  }
  return truncated.length < 10 ? "Bug Report" : truncated;
}
function sanitizeAndLogError(err) {
  if (err instanceof Error) {
    const safeError = new Error(redactSensitiveInfo(err.message));
    if (err.stack) {
      safeError.stack = redactSensitiveInfo(err.stack);
    }
    logError(safeError);
  } else {
    const errorString = redactSensitiveInfo(String(err));
    logError(new Error(errorString));
  }
}
async function submitFeedback(data, signal) {
  if (isEssentialTrafficOnly()) {
    return { success: false };
  }
  try {
    await checkAndRefreshOAuthTokenIfNeeded();
    const authResult = getAuthHeaders();
    if (authResult.error) {
      return { success: false };
    }
    const headers = {
      "Content-Type": "application/json",
      "User-Agent": getUserAgent(),
      ...authResult.headers
    };
    const response = await axios_default.post("https://api.anthropic.com/api/claude_cli_feedback", {
      content: jsonStringify(data)
    }, {
      headers,
      timeout: 30000,
      signal
    });
    if (response.status === 200) {
      const result = response.data;
      if (result?.feedback_id) {
        return { success: true, feedbackId: result.feedback_id };
      }
      sanitizeAndLogError(new Error("Failed to submit feedback: request did not return feedback_id"));
      return { success: false };
    }
    sanitizeAndLogError(new Error("Failed to submit feedback:" + response.status));
    return { success: false };
  } catch (err) {
    if (axios_default.isCancel(err)) {
      return { success: false };
    }
    if (axios_default.isAxiosError(err) && err.response?.status === 403) {
      const errorData = err.response.data;
      if (errorData?.error?.type === "permission_error" && errorData?.error?.message?.includes("Custom data retention settings")) {
        sanitizeAndLogError(new Error("Cannot submit feedback because custom data retention settings are enabled"));
        return { success: false, isZdrOrg: true };
      }
    }
    sanitizeAndLogError(err);
    return { success: false };
  }
}
var import_react, jsx_dev_runtime, GITHUB_URL_LIMIT = 7250, GITHUB_ISSUES_REPO_URL;
var init_Feedback = __esm(() => {
  init_axios();
  init_state();
  init_firstPartyEventLogger();
  init_analytics();
  init_messages();
  init_useTerminalSize();
  init_src();
  init_useKeybinding();
  init_claude();
  init_errors();
  init_auth();
  init_browser();
  init_debug();
  init_env();
  init_git();
  init_http();
  init_log();
  init_privacyLevel();
  init_sessionStorage();
  init_slowOperations();
  init_systemPromptType();
  init_ConfigurableShortcutHint();
  init_src();
  init_TextInput();
  import_react = __toESM(require_react(), 1);
  jsx_dev_runtime = __toESM(require_jsx_dev_runtime(), 1);
  GITHUB_ISSUES_REPO_URL = process.env.USER_TYPE === "ant" ? "https://github.com/anthropics/claude-cli-internal/issues" : "https://github.com/anthropics/claude-code/issues";
});

export { redactSensitiveInfo, Feedback, init_Feedback };
