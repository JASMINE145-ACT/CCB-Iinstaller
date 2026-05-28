// @bun
import {
  Select,
  getAllHooks,
  getHookDisplayText,
  getTools,
  hookSourceDescriptionDisplayString,
  hookSourceHeaderDisplayString,
  hookSourceInlineDisplayString,
  init_AppState,
  init_hooksSettings,
  init_select,
  init_tools1 as init_tools,
  init_useSettingsChange,
  sortMatchersByPriority,
  useAppState,
  useAppStateStore,
  useSettingsChange
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
import"./chunk-kyaxezdn.js";
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
  getSettingsForSource,
  getSettings_DEPRECATED,
  init_settings1 as init_settings,
  init_stringUtils,
  plural
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
import"./chunk-rh5a2rg9.js";
import"./chunk-p2816w9z.js";
import"./chunk-v9smspw2.js";
import"./chunk-v1kzp02e.js";
import"./chunk-padf4crh.js";
import"./chunk-crmjpsqe.js";
import {
  Dialog,
  Link,
  ThemedBox_default,
  ThemedText,
  init_src,
  useKeybinding
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
import"./chunk-wd8mqz95.js";
import"./chunk-8tnsngw2.js";
import"./chunk-vsbyhpfy.js";
import"./chunk-p7pj6wf8.js";
import"./chunk-5z28bqne.js";
import {
  figures_default,
  init_figures
} from "./chunk-qajrkk97.js";
import"./chunk-5khwvj1z.js";
import"./chunk-fbv4apne.js";
import {
  getRegisteredHooks,
  init_state
} from "./chunk-gzp6rza1.js";
import"./chunk-50dgek10.js";
import"./chunk-7wm5s02e.js";
import"./chunk-z0csm2zq.js";
import"./chunk-hxhwzgnn.js";
import {
  init_memoize,
  memoize_default
} from "./chunk-qx8z601m.js";
import"./chunk-cgm6758j.js";
import"./chunk-9m27g5s1.js";
import"./chunk-8pn8tvgg.js";
import"./chunk-netzwgv1.js";
import {
  __esm,
  __toESM
} from "./chunk-qp2qdcda.js";

// src/utils/hooks/hooksConfigManager.ts
function groupHooksByEventAndMatcher(appState, toolNames) {
  const grouped = {
    PreToolUse: {},
    PostToolUse: {},
    PostToolUseFailure: {},
    PermissionDenied: {},
    Notification: {},
    UserPromptSubmit: {},
    SessionStart: {},
    SessionEnd: {},
    Stop: {},
    StopFailure: {},
    SubagentStart: {},
    SubagentStop: {},
    PreCompact: {},
    PostCompact: {},
    PermissionRequest: {},
    Setup: {},
    TeammateIdle: {},
    TaskCreated: {},
    TaskCompleted: {},
    Elicitation: {},
    ElicitationResult: {},
    ConfigChange: {},
    WorktreeCreate: {},
    WorktreeRemove: {},
    InstructionsLoaded: {},
    CwdChanged: {},
    FileChanged: {}
  };
  const metadata = getHookEventMetadata(toolNames);
  getAllHooks(appState).forEach((hook) => {
    const eventGroup = grouped[hook.event];
    if (eventGroup) {
      const matcherKey = metadata[hook.event].matcherMetadata !== undefined ? hook.matcher || "" : "";
      if (!eventGroup[matcherKey]) {
        eventGroup[matcherKey] = [];
      }
      eventGroup[matcherKey].push(hook);
    }
  });
  const registeredHooks = getRegisteredHooks();
  if (registeredHooks) {
    for (const [event, matchers] of Object.entries(registeredHooks)) {
      const hookEvent = event;
      const eventGroup = grouped[hookEvent];
      if (!eventGroup)
        continue;
      for (const matcher of matchers ?? []) {
        const matcherKey = matcher.matcher || "";
        if ("pluginRoot" in matcher) {
          eventGroup[matcherKey] ??= [];
          for (const hook of matcher.hooks) {
            eventGroup[matcherKey].push({
              event: hookEvent,
              config: hook,
              matcher: matcher.matcher,
              source: "pluginHook",
              pluginName: matcher.pluginId
            });
          }
        } else if (process.env.USER_TYPE === "ant") {
          eventGroup[matcherKey] ??= [];
          for (const _hook of matcher.hooks) {
            eventGroup[matcherKey].push({
              event: hookEvent,
              config: {
                type: "command",
                command: "[ANT-ONLY] Built-in Hook"
              },
              matcher: matcher.matcher,
              source: "builtinHook"
            });
          }
        }
      }
    }
  }
  return grouped;
}
function getSortedMatchersForEvent(hooksByEventAndMatcher, event) {
  const matchers = Object.keys(hooksByEventAndMatcher[event] || {});
  return sortMatchersByPriority(matchers, hooksByEventAndMatcher, event);
}
function getHooksForMatcher(hooksByEventAndMatcher, event, matcher) {
  const matcherKey = matcher ?? "";
  return hooksByEventAndMatcher[event]?.[matcherKey] ?? [];
}
function getMatcherMetadata(event, toolNames) {
  return getHookEventMetadata(toolNames)[event].matcherMetadata;
}
var getHookEventMetadata;
var init_hooksConfigManager = __esm(() => {
  init_memoize();
  init_state();
  init_hooksSettings();
  getHookEventMetadata = memoize_default(function(toolNames) {
    return {
      PreToolUse: {
        summary: "Before tool execution",
        description: `Input to command is JSON of tool call arguments.
Exit code 0 - stdout/stderr not shown
Exit code 2 - show stderr to model and block tool call
Other exit codes - show stderr to user only but continue with tool call`,
        matcherMetadata: {
          fieldToMatch: "tool_name",
          values: toolNames
        }
      },
      PostToolUse: {
        summary: "After tool execution",
        description: `Input to command is JSON with fields "inputs" (tool call arguments) and "response" (tool call response).
Exit code 0 - stdout shown in transcript mode (ctrl+o)
Exit code 2 - show stderr to model immediately
Other exit codes - show stderr to user only`,
        matcherMetadata: {
          fieldToMatch: "tool_name",
          values: toolNames
        }
      },
      PostToolUseFailure: {
        summary: "After tool execution fails",
        description: `Input to command is JSON with tool_name, tool_input, tool_use_id, error, error_type, is_interrupt, and is_timeout.
Exit code 0 - stdout shown in transcript mode (ctrl+o)
Exit code 2 - show stderr to model immediately
Other exit codes - show stderr to user only`,
        matcherMetadata: {
          fieldToMatch: "tool_name",
          values: toolNames
        }
      },
      PermissionDenied: {
        summary: "After auto mode classifier denies a tool call",
        description: `Input to command is JSON with tool_name, tool_input, tool_use_id, and reason.
Return {"hookSpecificOutput":{"hookEventName":"PermissionDenied","retry":true}} to tell the model it may retry.
Exit code 0 - stdout shown in transcript mode (ctrl+o)
Other exit codes - show stderr to user only`,
        matcherMetadata: {
          fieldToMatch: "tool_name",
          values: toolNames
        }
      },
      Notification: {
        summary: "When notifications are sent",
        description: `Input to command is JSON with notification message and type.
Exit code 0 - stdout/stderr not shown
Other exit codes - show stderr to user only`,
        matcherMetadata: {
          fieldToMatch: "notification_type",
          values: [
            "permission_prompt",
            "idle_prompt",
            "auth_success",
            "elicitation_dialog",
            "elicitation_complete",
            "elicitation_response"
          ]
        }
      },
      UserPromptSubmit: {
        summary: "When the user submits a prompt",
        description: `Input to command is JSON with original user prompt text.
Exit code 0 - stdout shown to Claude
Exit code 2 - block processing, erase original prompt, and show stderr to user only
Other exit codes - show stderr to user only`
      },
      SessionStart: {
        summary: "When a new session is started",
        description: `Input to command is JSON with session start source.
Exit code 0 - stdout shown to Claude
Blocking errors are ignored
Other exit codes - show stderr to user only`,
        matcherMetadata: {
          fieldToMatch: "source",
          values: ["startup", "resume", "clear", "compact"]
        }
      },
      Stop: {
        summary: "Right before Claude concludes its response",
        description: `Exit code 0 - stdout/stderr not shown
Exit code 2 - show stderr to model and continue conversation
Other exit codes - show stderr to user only`
      },
      StopFailure: {
        summary: "When the turn ends due to an API error",
        description: "Fires instead of Stop when an API error (rate limit, auth failure, etc.) ended the turn. Fire-and-forget \u2014 hook output and exit codes are ignored.",
        matcherMetadata: {
          fieldToMatch: "error",
          values: [
            "rate_limit",
            "authentication_failed",
            "billing_error",
            "invalid_request",
            "server_error",
            "max_output_tokens",
            "unknown"
          ]
        }
      },
      SubagentStart: {
        summary: "When a subagent (Agent tool call) is started",
        description: `Input to command is JSON with agent_id and agent_type.
Exit code 0 - stdout shown to subagent
Blocking errors are ignored
Other exit codes - show stderr to user only`,
        matcherMetadata: {
          fieldToMatch: "agent_type",
          values: []
        }
      },
      SubagentStop: {
        summary: "Right before a subagent (Agent tool call) concludes its response",
        description: `Input to command is JSON with agent_id, agent_type, and agent_transcript_path.
Exit code 0 - stdout/stderr not shown
Exit code 2 - show stderr to subagent and continue having it run
Other exit codes - show stderr to user only`,
        matcherMetadata: {
          fieldToMatch: "agent_type",
          values: []
        }
      },
      PreCompact: {
        summary: "Before conversation compaction",
        description: `Input to command is JSON with compaction details.
Exit code 0 - stdout appended as custom compact instructions
Exit code 2 - block compaction
Other exit codes - show stderr to user only but continue with compaction`,
        matcherMetadata: {
          fieldToMatch: "trigger",
          values: ["manual", "auto"]
        }
      },
      PostCompact: {
        summary: "After conversation compaction",
        description: `Input to command is JSON with compaction details and the summary.
Exit code 0 - stdout shown to user
Other exit codes - show stderr to user only`,
        matcherMetadata: {
          fieldToMatch: "trigger",
          values: ["manual", "auto"]
        }
      },
      SessionEnd: {
        summary: "When a session is ending",
        description: `Input to command is JSON with session end reason.
Exit code 0 - command completes successfully
Other exit codes - show stderr to user only`,
        matcherMetadata: {
          fieldToMatch: "reason",
          values: ["clear", "logout", "prompt_input_exit", "other"]
        }
      },
      PermissionRequest: {
        summary: "When a permission dialog is displayed",
        description: `Input to command is JSON with tool_name, tool_input, and tool_use_id.
Output JSON with hookSpecificOutput containing decision to allow or deny.
Exit code 0 - use hook decision if provided
Other exit codes - show stderr to user only`,
        matcherMetadata: {
          fieldToMatch: "tool_name",
          values: toolNames
        }
      },
      Setup: {
        summary: "Repo setup hooks for init and maintenance",
        description: `Input to command is JSON with trigger (init or maintenance).
Exit code 0 - stdout shown to Claude
Blocking errors are ignored
Other exit codes - show stderr to user only`,
        matcherMetadata: {
          fieldToMatch: "trigger",
          values: ["init", "maintenance"]
        }
      },
      TeammateIdle: {
        summary: "When a teammate is about to go idle",
        description: `Input to command is JSON with teammate_name and team_name.
Exit code 0 - stdout/stderr not shown
Exit code 2 - show stderr to teammate and prevent idle (teammate continues working)
Other exit codes - show stderr to user only`
      },
      TaskCreated: {
        summary: "When a task is being created",
        description: `Input to command is JSON with task_id, task_subject, task_description, teammate_name, and team_name.
Exit code 0 - stdout/stderr not shown
Exit code 2 - show stderr to model and prevent task creation
Other exit codes - show stderr to user only`
      },
      TaskCompleted: {
        summary: "When a task is being marked as completed",
        description: `Input to command is JSON with task_id, task_subject, task_description, teammate_name, and team_name.
Exit code 0 - stdout/stderr not shown
Exit code 2 - show stderr to model and prevent task completion
Other exit codes - show stderr to user only`
      },
      Elicitation: {
        summary: "When an MCP server requests user input (elicitation)",
        description: `Input to command is JSON with mcp_server_name, message, and requested_schema.
Output JSON with hookSpecificOutput containing action (accept/decline/cancel) and optional content.
Exit code 0 - use hook response if provided
Exit code 2 - deny the elicitation
Other exit codes - show stderr to user only`,
        matcherMetadata: {
          fieldToMatch: "mcp_server_name",
          values: []
        }
      },
      ElicitationResult: {
        summary: "After a user responds to an MCP elicitation",
        description: `Input to command is JSON with mcp_server_name, action, content, mode, and elicitation_id.
Output JSON with hookSpecificOutput containing optional action and content to override the response.
Exit code 0 - use hook response if provided
Exit code 2 - block the response (action becomes decline)
Other exit codes - show stderr to user only`,
        matcherMetadata: {
          fieldToMatch: "mcp_server_name",
          values: []
        }
      },
      ConfigChange: {
        summary: "When configuration files change during a session",
        description: `Input to command is JSON with source (user_settings, project_settings, local_settings, policy_settings, skills) and file_path.
Exit code 0 - allow the change
Exit code 2 - block the change from being applied to the session
Other exit codes - show stderr to user only`,
        matcherMetadata: {
          fieldToMatch: "source",
          values: [
            "user_settings",
            "project_settings",
            "local_settings",
            "policy_settings",
            "skills"
          ]
        }
      },
      InstructionsLoaded: {
        summary: "When an instruction file (CLAUDE.md or rule) is loaded",
        description: `Input to command is JSON with file_path, memory_type (User, Project, Local, Managed), load_reason (session_start, nested_traversal, path_glob_match, include, compact), globs (optional \u2014 the paths: frontmatter patterns that matched), trigger_file_path (optional \u2014 the file Claude touched that caused the load), and parent_file_path (optional \u2014 the file that @-included this one).
Exit code 0 - command completes successfully
Other exit codes - show stderr to user only
This hook is observability-only and does not support blocking.`,
        matcherMetadata: {
          fieldToMatch: "load_reason",
          values: [
            "session_start",
            "nested_traversal",
            "path_glob_match",
            "include",
            "compact"
          ]
        }
      },
      WorktreeCreate: {
        summary: "Create an isolated worktree for VCS-agnostic isolation",
        description: `Input to command is JSON with name (suggested worktree slug).
Stdout should contain the absolute path to the created worktree directory.
Exit code 0 - worktree created successfully
Other exit codes - worktree creation failed`
      },
      WorktreeRemove: {
        summary: "Remove a previously created worktree",
        description: `Input to command is JSON with worktree_path (absolute path to worktree).
Exit code 0 - worktree removed successfully
Other exit codes - show stderr to user only`
      },
      CwdChanged: {
        summary: "After the working directory changes",
        description: `Input to command is JSON with old_cwd and new_cwd.
CLAUDE_ENV_FILE is set \u2014 write bash exports there to apply env to subsequent BashTool commands.
Hook output can include hookSpecificOutput.watchPaths (array of absolute paths) to register with the FileChanged watcher.
Exit code 0 - command completes successfully
Other exit codes - show stderr to user only`
      },
      FileChanged: {
        summary: "When a watched file changes",
        description: `Input to command is JSON with file_path and event (change, add, unlink).
CLAUDE_ENV_FILE is set \u2014 write bash exports there to apply env to subsequent BashTool commands.
The matcher field specifies filenames to watch in the current directory (e.g. ".envrc|.env").
Hook output can include hookSpecificOutput.watchPaths (array of absolute paths) to dynamically update the watch list.
Exit code 0 - command completes successfully
Other exit codes - show stderr to user only`
      }
    };
  }, (toolNames) => toolNames.slice().sort().join(","));
});

// src/components/hooks/SelectEventMode.tsx
function SelectEventMode({
  hookEventMetadata,
  hooksByEvent,
  totalHooksCount,
  restrictedByPolicy,
  onSelectEvent,
  onCancel
}) {
  const subtitle = `${totalHooksCount} ${plural(totalHooksCount, "hook")} configured`;
  return /* @__PURE__ */ jsx_dev_runtime.jsxDEV(Dialog, {
    title: "Hooks",
    subtitle,
    onCancel,
    children: /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedBox_default, {
      flexDirection: "column",
      gap: 1,
      children: [
        restrictedByPolicy && /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedBox_default, {
          flexDirection: "column",
          children: [
            /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
              color: "suggestion",
              children: [
                figures_default.info,
                " Hooks Restricted by Policy"
              ]
            }, undefined, true, undefined, this),
            /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
              dimColor: true,
              children: "Only hooks from managed settings can run. User-defined hooks from ~/.claude/settings.json, .claude/settings.json, and .claude/settings.local.json are blocked."
            }, undefined, false, undefined, this)
          ]
        }, undefined, true, undefined, this),
        /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedBox_default, {
          flexDirection: "column",
          children: /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
            dimColor: true,
            children: [
              figures_default.info,
              " This menu is read-only. To add or modify hooks, edit settings.json directly or ask Claude.",
              " ",
              /* @__PURE__ */ jsx_dev_runtime.jsxDEV(Link, {
                url: "https://code.claude.com/docs/en/hooks",
                children: "Learn more"
              }, undefined, false, undefined, this)
            ]
          }, undefined, true, undefined, this)
        }, undefined, false, undefined, this),
        /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedBox_default, {
          flexDirection: "column",
          children: /* @__PURE__ */ jsx_dev_runtime.jsxDEV(Select, {
            onChange: (value) => {
              onSelectEvent(value);
            },
            onCancel,
            options: Object.entries(hookEventMetadata).map(([name, metadata]) => {
              const count = hooksByEvent[name] || 0;
              return {
                label: count > 0 ? /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
                  children: [
                    name,
                    " ",
                    /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
                      color: "suggestion",
                      children: [
                        "(",
                        count,
                        ")"
                      ]
                    }, undefined, true, undefined, this)
                  ]
                }, undefined, true, undefined, this) : name,
                value: name,
                description: metadata.summary
              };
            })
          }, undefined, false, undefined, this)
        }, undefined, false, undefined, this)
      ]
    }, undefined, true, undefined, this)
  }, undefined, false, undefined, this);
}
var jsx_dev_runtime;
var init_SelectEventMode = __esm(() => {
  init_figures();
  init_src();
  init_stringUtils();
  init_select();
  init_src();
  jsx_dev_runtime = __toESM(require_jsx_dev_runtime(), 1);
});

// src/components/hooks/SelectHookMode.tsx
function SelectHookMode({
  selectedEvent,
  selectedMatcher,
  hooksForSelectedMatcher,
  hookEventMetadata,
  onSelect,
  onCancel
}) {
  const title = hookEventMetadata.matcherMetadata !== undefined ? `${selectedEvent} - Matcher: ${selectedMatcher || "(all)"}` : selectedEvent;
  if (hooksForSelectedMatcher.length === 0) {
    return /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(Dialog, {
      title,
      subtitle: hookEventMetadata.description,
      onCancel,
      inputGuide: () => /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedText, {
        children: "Esc to go back"
      }, undefined, false, undefined, this),
      children: /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedBox_default, {
        flexDirection: "column",
        gap: 1,
        children: [
          /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedText, {
            dimColor: true,
            children: "No hooks configured for this event."
          }, undefined, false, undefined, this),
          /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedText, {
            dimColor: true,
            children: "To add hooks, edit settings.json directly or ask Claude."
          }, undefined, false, undefined, this)
        ]
      }, undefined, true, undefined, this)
    }, undefined, false, undefined, this);
  }
  return /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(Dialog, {
    title,
    subtitle: hookEventMetadata.description,
    onCancel,
    children: /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedBox_default, {
      flexDirection: "column",
      children: /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(Select, {
        options: hooksForSelectedMatcher.map((hook, index) => ({
          label: `[${hook.config.type}] ${getHookDisplayText(hook.config)}`,
          value: index.toString(),
          description: hook.source === "pluginHook" && hook.pluginName ? `${hookSourceHeaderDisplayString(hook.source)} (${hook.pluginName})` : hookSourceHeaderDisplayString(hook.source)
        })),
        onChange: (value) => {
          const index = parseInt(value, 10);
          const hook = hooksForSelectedMatcher[index];
          if (hook) {
            onSelect(hook);
          }
        },
        onCancel
      }, undefined, false, undefined, this)
    }, undefined, false, undefined, this)
  }, undefined, false, undefined, this);
}
var jsx_dev_runtime2;
var init_SelectHookMode = __esm(() => {
  init_src();
  init_hooksSettings();
  init_select();
  init_src();
  jsx_dev_runtime2 = __toESM(require_jsx_dev_runtime(), 1);
});

// src/components/hooks/SelectMatcherMode.tsx
function SelectMatcherMode({
  selectedEvent,
  matchersForSelectedEvent,
  hooksByEventAndMatcher,
  eventDescription,
  onSelect,
  onCancel
}) {
  const matchersWithSources = React.useMemo(() => {
    return matchersForSelectedEvent.map((matcher) => {
      const hooks = hooksByEventAndMatcher[selectedEvent]?.[matcher] || [];
      const sources = Array.from(new Set(hooks.map((h) => h.source)));
      return {
        matcher,
        sources,
        hookCount: hooks.length
      };
    });
  }, [matchersForSelectedEvent, hooksByEventAndMatcher, selectedEvent]);
  if (matchersForSelectedEvent.length === 0) {
    return /* @__PURE__ */ jsx_dev_runtime3.jsxDEV(Dialog, {
      title: `${selectedEvent} - Matchers`,
      subtitle: eventDescription,
      onCancel,
      inputGuide: () => /* @__PURE__ */ jsx_dev_runtime3.jsxDEV(ThemedText, {
        children: "Esc to go back"
      }, undefined, false, undefined, this),
      children: /* @__PURE__ */ jsx_dev_runtime3.jsxDEV(ThemedBox_default, {
        flexDirection: "column",
        gap: 1,
        children: [
          /* @__PURE__ */ jsx_dev_runtime3.jsxDEV(ThemedText, {
            dimColor: true,
            children: "No hooks configured for this event."
          }, undefined, false, undefined, this),
          /* @__PURE__ */ jsx_dev_runtime3.jsxDEV(ThemedText, {
            dimColor: true,
            children: "To add hooks, edit settings.json directly or ask Claude."
          }, undefined, false, undefined, this)
        ]
      }, undefined, true, undefined, this)
    }, undefined, false, undefined, this);
  }
  return /* @__PURE__ */ jsx_dev_runtime3.jsxDEV(Dialog, {
    title: `${selectedEvent} - Matchers`,
    subtitle: eventDescription,
    onCancel,
    children: /* @__PURE__ */ jsx_dev_runtime3.jsxDEV(ThemedBox_default, {
      flexDirection: "column",
      children: /* @__PURE__ */ jsx_dev_runtime3.jsxDEV(Select, {
        options: matchersWithSources.map((item) => {
          const sourceText = item.sources.map(hookSourceInlineDisplayString).join(", ");
          const matcherLabel = item.matcher || "(all)";
          return {
            label: `[${sourceText}] ${matcherLabel}`,
            value: item.matcher,
            description: `${item.hookCount} ${plural(item.hookCount, "hook")}`
          };
        }),
        onChange: (value) => {
          onSelect(value);
        },
        onCancel
      }, undefined, false, undefined, this)
    }, undefined, false, undefined, this)
  }, undefined, false, undefined, this);
}
var React, jsx_dev_runtime3;
var init_SelectMatcherMode = __esm(() => {
  init_src();
  init_hooksSettings();
  init_stringUtils();
  init_select();
  init_src();
  React = __toESM(require_react(), 1);
  jsx_dev_runtime3 = __toESM(require_jsx_dev_runtime(), 1);
});

// src/components/hooks/ViewHookMode.tsx
function ViewHookMode({
  selectedHook,
  eventSupportsMatcher,
  onCancel
}) {
  return /* @__PURE__ */ jsx_dev_runtime4.jsxDEV(Dialog, {
    title: "Hook details",
    onCancel,
    inputGuide: () => /* @__PURE__ */ jsx_dev_runtime4.jsxDEV(ThemedText, {
      children: "Esc to go back"
    }, undefined, false, undefined, this),
    children: /* @__PURE__ */ jsx_dev_runtime4.jsxDEV(ThemedBox_default, {
      flexDirection: "column",
      gap: 1,
      children: [
        /* @__PURE__ */ jsx_dev_runtime4.jsxDEV(ThemedBox_default, {
          flexDirection: "column",
          children: [
            /* @__PURE__ */ jsx_dev_runtime4.jsxDEV(ThemedText, {
              children: [
                "Event: ",
                /* @__PURE__ */ jsx_dev_runtime4.jsxDEV(ThemedText, {
                  bold: true,
                  children: selectedHook.event
                }, undefined, false, undefined, this)
              ]
            }, undefined, true, undefined, this),
            eventSupportsMatcher && /* @__PURE__ */ jsx_dev_runtime4.jsxDEV(ThemedText, {
              children: [
                "Matcher: ",
                /* @__PURE__ */ jsx_dev_runtime4.jsxDEV(ThemedText, {
                  bold: true,
                  children: selectedHook.matcher || "(all)"
                }, undefined, false, undefined, this)
              ]
            }, undefined, true, undefined, this),
            /* @__PURE__ */ jsx_dev_runtime4.jsxDEV(ThemedText, {
              children: [
                "Type: ",
                /* @__PURE__ */ jsx_dev_runtime4.jsxDEV(ThemedText, {
                  bold: true,
                  children: selectedHook.config.type
                }, undefined, false, undefined, this)
              ]
            }, undefined, true, undefined, this),
            /* @__PURE__ */ jsx_dev_runtime4.jsxDEV(ThemedText, {
              children: [
                "Source:",
                " ",
                /* @__PURE__ */ jsx_dev_runtime4.jsxDEV(ThemedText, {
                  dimColor: true,
                  children: hookSourceDescriptionDisplayString(selectedHook.source)
                }, undefined, false, undefined, this)
              ]
            }, undefined, true, undefined, this),
            selectedHook.pluginName && /* @__PURE__ */ jsx_dev_runtime4.jsxDEV(ThemedText, {
              children: [
                "Plugin: ",
                /* @__PURE__ */ jsx_dev_runtime4.jsxDEV(ThemedText, {
                  dimColor: true,
                  children: selectedHook.pluginName
                }, undefined, false, undefined, this)
              ]
            }, undefined, true, undefined, this)
          ]
        }, undefined, true, undefined, this),
        /* @__PURE__ */ jsx_dev_runtime4.jsxDEV(ThemedBox_default, {
          flexDirection: "column",
          children: [
            /* @__PURE__ */ jsx_dev_runtime4.jsxDEV(ThemedText, {
              dimColor: true,
              children: [
                getContentFieldLabel(selectedHook.config),
                ":"
              ]
            }, undefined, true, undefined, this),
            /* @__PURE__ */ jsx_dev_runtime4.jsxDEV(ThemedBox_default, {
              borderStyle: "round",
              borderDimColor: true,
              paddingLeft: 1,
              paddingRight: 1,
              children: /* @__PURE__ */ jsx_dev_runtime4.jsxDEV(ThemedText, {
                children: getContentFieldValue(selectedHook.config)
              }, undefined, false, undefined, this)
            }, undefined, false, undefined, this)
          ]
        }, undefined, true, undefined, this),
        "statusMessage" in selectedHook.config && selectedHook.config.statusMessage && /* @__PURE__ */ jsx_dev_runtime4.jsxDEV(ThemedText, {
          children: [
            "Status message:",
            " ",
            /* @__PURE__ */ jsx_dev_runtime4.jsxDEV(ThemedText, {
              dimColor: true,
              children: selectedHook.config.statusMessage
            }, undefined, false, undefined, this)
          ]
        }, undefined, true, undefined, this),
        /* @__PURE__ */ jsx_dev_runtime4.jsxDEV(ThemedText, {
          dimColor: true,
          children: "To modify or remove this hook, edit settings.json directly or ask Claude to help."
        }, undefined, false, undefined, this)
      ]
    }, undefined, true, undefined, this)
  }, undefined, false, undefined, this);
}
function getContentFieldLabel(config) {
  switch (config.type) {
    case "command":
      return "Command";
    case "prompt":
      return "Prompt";
    case "agent":
      return "Prompt";
    case "http":
      return "URL";
  }
}
function getContentFieldValue(config) {
  switch (config.type) {
    case "command":
      return config.command;
    case "prompt":
      return config.prompt;
    case "agent":
      return config.prompt;
    case "http":
      return config.url;
  }
}
var jsx_dev_runtime4;
var init_ViewHookMode = __esm(() => {
  init_src();
  init_hooksSettings();
  init_src();
  jsx_dev_runtime4 = __toESM(require_jsx_dev_runtime(), 1);
});

// src/components/hooks/HooksConfigMenu.tsx
function HooksConfigMenu({ toolNames, onExit }) {
  const [modeState, setModeState] = import_react.useState({
    mode: "select-event"
  });
  const [disabledByPolicy, setDisabledByPolicy] = import_react.useState(() => {
    const settings2 = getSettings_DEPRECATED();
    const hooksDisabled2 = settings2?.disableAllHooks === true;
    return hooksDisabled2 && getSettingsForSource("policySettings")?.disableAllHooks === true;
  });
  const [restrictedByPolicy, setRestrictedByPolicy] = import_react.useState(() => {
    return getSettingsForSource("policySettings")?.allowManagedHooksOnly === true;
  });
  useSettingsChange((source) => {
    if (source === "policySettings") {
      const settings2 = getSettings_DEPRECATED();
      const hooksDisabled2 = settings2?.disableAllHooks === true;
      setDisabledByPolicy(hooksDisabled2 && getSettingsForSource("policySettings")?.disableAllHooks === true);
      setRestrictedByPolicy(getSettingsForSource("policySettings")?.allowManagedHooksOnly === true);
    }
  });
  const mode = modeState.mode;
  const selectedEvent = "event" in modeState ? modeState.event : "PreToolUse";
  const selectedMatcher = "matcher" in modeState ? modeState.matcher : null;
  const mcp = useAppState((s) => s.mcp);
  const appStateStore = useAppStateStore();
  const combinedToolNames = import_react.useMemo(() => [...toolNames, ...mcp.tools.map((tool) => tool.name)], [toolNames, mcp.tools]);
  const hooksByEventAndMatcher = import_react.useMemo(() => groupHooksByEventAndMatcher(appStateStore.getState(), combinedToolNames), [combinedToolNames, appStateStore]);
  const sortedMatchersForSelectedEvent = import_react.useMemo(() => getSortedMatchersForEvent(hooksByEventAndMatcher, selectedEvent), [hooksByEventAndMatcher, selectedEvent]);
  const hooksForSelectedMatcher = import_react.useMemo(() => getHooksForMatcher(hooksByEventAndMatcher, selectedEvent, selectedMatcher), [hooksByEventAndMatcher, selectedEvent, selectedMatcher]);
  const handleExit = import_react.useCallback(() => {
    onExit("Hooks dialog dismissed", { display: "system" });
  }, [onExit]);
  useKeybinding("confirm:no", handleExit, {
    context: "Confirmation",
    isActive: mode === "select-event"
  });
  useKeybinding("confirm:no", () => {
    setModeState({ mode: "select-event" });
  }, {
    context: "Confirmation",
    isActive: mode === "select-matcher"
  });
  useKeybinding("confirm:no", () => {
    if ("event" in modeState) {
      if (getMatcherMetadata(modeState.event, combinedToolNames) !== undefined) {
        setModeState({ mode: "select-matcher", event: modeState.event });
      } else {
        setModeState({ mode: "select-event" });
      }
    }
  }, {
    context: "Confirmation",
    isActive: mode === "select-hook"
  });
  useKeybinding("confirm:no", () => {
    if (modeState.mode === "view-hook") {
      const { event, hook } = modeState;
      setModeState({
        mode: "select-hook",
        event,
        matcher: hook.matcher || ""
      });
    }
  }, {
    context: "Confirmation",
    isActive: mode === "view-hook"
  });
  const hookEventMetadata = getHookEventMetadata(combinedToolNames);
  const settings = getSettings_DEPRECATED();
  const hooksDisabled = settings?.disableAllHooks === true;
  const { hooksByEvent, totalHooksCount } = import_react.useMemo(() => {
    const byEvent = {};
    let total = 0;
    for (const [event, matchers] of Object.entries(hooksByEventAndMatcher)) {
      const eventCount = Object.values(matchers).reduce((sum, hooks) => sum + hooks.length, 0);
      byEvent[event] = eventCount;
      total += eventCount;
    }
    return { hooksByEvent: byEvent, totalHooksCount: total };
  }, [hooksByEventAndMatcher]);
  if (hooksDisabled) {
    return /* @__PURE__ */ jsx_dev_runtime5.jsxDEV(Dialog, {
      title: "Hook Configuration - Disabled",
      onCancel: handleExit,
      inputGuide: () => /* @__PURE__ */ jsx_dev_runtime5.jsxDEV(ThemedText, {
        children: "Esc to close"
      }, undefined, false, undefined, this),
      children: /* @__PURE__ */ jsx_dev_runtime5.jsxDEV(ThemedBox_default, {
        flexDirection: "column",
        gap: 1,
        children: [
          /* @__PURE__ */ jsx_dev_runtime5.jsxDEV(ThemedBox_default, {
            flexDirection: "column",
            children: [
              /* @__PURE__ */ jsx_dev_runtime5.jsxDEV(ThemedText, {
                children: [
                  "All hooks are currently ",
                  /* @__PURE__ */ jsx_dev_runtime5.jsxDEV(ThemedText, {
                    bold: true,
                    children: "disabled"
                  }, undefined, false, undefined, this),
                  disabledByPolicy && " by a managed settings file",
                  ". You have",
                  " ",
                  /* @__PURE__ */ jsx_dev_runtime5.jsxDEV(ThemedText, {
                    bold: true,
                    children: totalHooksCount
                  }, undefined, false, undefined, this),
                  " configured",
                  " ",
                  plural(totalHooksCount, "hook"),
                  " that",
                  " ",
                  plural(totalHooksCount, "is", "are"),
                  " not running."
                ]
              }, undefined, true, undefined, this),
              /* @__PURE__ */ jsx_dev_runtime5.jsxDEV(ThemedBox_default, {
                marginTop: 1,
                children: /* @__PURE__ */ jsx_dev_runtime5.jsxDEV(ThemedText, {
                  dimColor: true,
                  children: "When hooks are disabled:"
                }, undefined, false, undefined, this)
              }, undefined, false, undefined, this),
              /* @__PURE__ */ jsx_dev_runtime5.jsxDEV(ThemedText, {
                dimColor: true,
                children: "\xB7 No hook commands will execute"
              }, undefined, false, undefined, this),
              /* @__PURE__ */ jsx_dev_runtime5.jsxDEV(ThemedText, {
                dimColor: true,
                children: "\xB7 StatusLine will not be displayed"
              }, undefined, false, undefined, this),
              /* @__PURE__ */ jsx_dev_runtime5.jsxDEV(ThemedText, {
                dimColor: true,
                children: "\xB7 Tool operations will proceed without hook validation"
              }, undefined, false, undefined, this)
            ]
          }, undefined, true, undefined, this),
          !disabledByPolicy && /* @__PURE__ */ jsx_dev_runtime5.jsxDEV(ThemedText, {
            dimColor: true,
            children: 'To re-enable hooks, remove "disableAllHooks" from settings.json or ask Claude.'
          }, undefined, false, undefined, this)
        ]
      }, undefined, true, undefined, this)
    }, undefined, false, undefined, this);
  }
  switch (modeState.mode) {
    case "select-event":
      return /* @__PURE__ */ jsx_dev_runtime5.jsxDEV(SelectEventMode, {
        hookEventMetadata,
        hooksByEvent,
        totalHooksCount,
        restrictedByPolicy,
        onSelectEvent: (event) => {
          if (getMatcherMetadata(event, combinedToolNames) !== undefined) {
            setModeState({ mode: "select-matcher", event });
          } else {
            setModeState({ mode: "select-hook", event, matcher: "" });
          }
        },
        onCancel: handleExit
      }, undefined, false, undefined, this);
    case "select-matcher":
      return /* @__PURE__ */ jsx_dev_runtime5.jsxDEV(SelectMatcherMode, {
        selectedEvent: modeState.event,
        matchersForSelectedEvent: sortedMatchersForSelectedEvent,
        hooksByEventAndMatcher,
        eventDescription: hookEventMetadata[modeState.event].description,
        onSelect: (matcher) => {
          setModeState({
            mode: "select-hook",
            event: modeState.event,
            matcher
          });
        },
        onCancel: () => {
          setModeState({ mode: "select-event" });
        }
      }, undefined, false, undefined, this);
    case "select-hook":
      return /* @__PURE__ */ jsx_dev_runtime5.jsxDEV(SelectHookMode, {
        selectedEvent: modeState.event,
        selectedMatcher: modeState.matcher,
        hooksForSelectedMatcher,
        hookEventMetadata: hookEventMetadata[modeState.event],
        onSelect: (hook) => {
          setModeState({
            mode: "view-hook",
            event: modeState.event,
            hook
          });
        },
        onCancel: () => {
          if (getMatcherMetadata(modeState.event, combinedToolNames) !== undefined) {
            setModeState({
              mode: "select-matcher",
              event: modeState.event
            });
          } else {
            setModeState({ mode: "select-event" });
          }
        }
      }, undefined, false, undefined, this);
    case "view-hook":
      return /* @__PURE__ */ jsx_dev_runtime5.jsxDEV(ViewHookMode, {
        selectedHook: modeState.hook,
        eventSupportsMatcher: getMatcherMetadata(modeState.event, combinedToolNames) !== undefined,
        onCancel: () => {
          const { event, hook } = modeState;
          setModeState({
            mode: "select-hook",
            event,
            matcher: hook.matcher || ""
          });
        }
      }, undefined, false, undefined, this);
  }
}
var import_react, jsx_dev_runtime5;
var init_HooksConfigMenu = __esm(() => {
  init_AppState();
  init_useSettingsChange();
  init_src();
  init_useKeybinding();
  init_hooksConfigManager();
  init_settings();
  init_stringUtils();
  init_src();
  init_SelectEventMode();
  init_SelectHookMode();
  init_SelectMatcherMode();
  init_ViewHookMode();
  import_react = __toESM(require_react(), 1);
  jsx_dev_runtime5 = __toESM(require_jsx_dev_runtime(), 1);
});

// src/commands/hooks/hooks.tsx
var jsx_dev_runtime6, call = async (onDone, context) => {
  logEvent("tengu_hooks_command", {});
  const appState = context.getAppState();
  const permissionContext = appState.toolPermissionContext;
  const toolNames = getTools(permissionContext).map((tool) => tool.name);
  return /* @__PURE__ */ jsx_dev_runtime6.jsxDEV(HooksConfigMenu, {
    toolNames,
    onExit: onDone
  }, undefined, false, undefined, this);
};
var init_hooks = __esm(() => {
  init_HooksConfigMenu();
  init_analytics();
  init_tools();
  jsx_dev_runtime6 = __toESM(require_jsx_dev_runtime(), 1);
});
init_hooks();

export {
  call
};
