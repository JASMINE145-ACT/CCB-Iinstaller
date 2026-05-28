// @bun
import {
  init_slashCommandParsing,
  parseSlashCommand
} from "./chunk-rn0v1hk8.js";
import {
  NO_CONTENT_MESSAGE,
  SKILL_TOOL_NAME,
  addSessionHook,
  buildPluginCommandTelemetryFields,
  buildPostCompactMessages,
  builtInCommandNames,
  createAbortController,
  createAgentId,
  createAttachmentMessage,
  createCommandInputMessage,
  createSyntheticUserCaveatMessage,
  createSystemMessage,
  createUserInterruptionMessage,
  createUserMessage,
  enqueuePendingNotification,
  extractResultText,
  findCommand,
  formatCommandInputTags,
  getAssistantMessageContentLength,
  getAttachmentMessages,
  getCommand,
  getCommandName,
  getDumpPromptsPath,
  hasCommand,
  hasPermissionsToUseTool,
  init_UI,
  init_abortController,
  init_attachments,
  init_commands1 as init_commands,
  init_compact,
  init_constants5 as init_constants,
  init_dumpPrompts,
  init_forkedAgent,
  init_fullscreen,
  init_generators,
  init_messageQueueManager,
  init_messages,
  init_messages1 as init_messages2,
  init_microCompact,
  init_permissionSetup,
  init_permissions,
  init_pluginOnlyPolicy,
  init_pluginTelemetry,
  init_runAgent,
  init_sessionHooks,
  init_skillUsageTracking,
  init_tokens,
  init_uuid,
  isCompactBoundaryMessage,
  isFullscreenEnvEnabled,
  isRestrictedToPluginOnly,
  isSourceAdminTrusted,
  isSystemLocalCommandMessage,
  normalizeMessages,
  parseToolListFromCLI,
  prepareForkedCommandContext,
  prepareUserContent,
  recordSkillUsage,
  removeSessionHook,
  renderToolUseProgressMessage,
  resetMicrocompactState,
  runAgent,
  toArray
} from "./chunk-xg5k46jr.js";
import"./chunk-b0ex2qgg.js";
import"./chunk-7qc1t27a.js";
import"./chunk-qe3qr56q.js";
import"./chunk-nd9hcjys.js";
import"./chunk-et824jj8.js";
import {
  init_pluginIdentifier,
  isOfficialMarketplaceName,
  parsePluginIdentifier
} from "./chunk-e86bxpak.js";
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
import"./chunk-kyaxezdn.js";
import"./chunk-f57cvf1d.js";
import"./chunk-rkmwx1yz.js";
import {
  init_events,
  logOTelEvent,
  redactIfDisabled
} from "./chunk-cg02f0wy.js";
import"./chunk-ykr5qx9v.js";
import"./chunk-dhpmxxmx.js";
import"./chunk-yg1k879b.js";
import"./chunk-435qaxw3.js";
import"./chunk-c9pb40ft.js";
import"./chunk-ad6rg8vz.js";
import"./chunk-x95fhbwq.js";
import {
  HOOK_EVENTS,
  getAgentContext,
  getDisplayPath,
  getWorkload,
  init_agentContext,
  init_agentSdkTypes,
  init_file,
  init_workloadContext
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
import {
  init_sleep,
  sleep
} from "./chunk-8g5pe1gr.js";
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
  ThemedBox_default,
  ThemedText,
  init_src,
  useAnimationFrame
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
  COMMAND_MESSAGE_TAG,
  COMMAND_NAME_TAG,
  init_log,
  init_xml,
  logError
} from "./chunk-wd8mqz95.js";
import"./chunk-8tnsngw2.js";
import"./chunk-vsbyhpfy.js";
import"./chunk-p7pj6wf8.js";
import"./chunk-5z28bqne.js";
import {
  figures_default,
  init_figures
} from "./chunk-qajrkk97.js";
import {
  AbortError,
  MalformedCommandError,
  getFsImplementation,
  init_debug,
  init_errors,
  init_fsOperations,
  logForDebugging
} from "./chunk-5khwvj1z.js";
import"./chunk-fbv4apne.js";
import {
  addInvokedSkill,
  getSessionId,
  init_state,
  setPromptId
} from "./chunk-gzp6rza1.js";
import"./chunk-50dgek10.js";
import"./chunk-7wm5s02e.js";
import"./chunk-z0csm2zq.js";
import {
  init_envUtils,
  isEnvTruthy
} from "./chunk-hxhwzgnn.js";
import"./chunk-qx8z601m.js";
import"./chunk-cgm6758j.js";
import"./chunk-9m27g5s1.js";
import"./chunk-8pn8tvgg.js";
import"./chunk-netzwgv1.js";
import {
  __esm,
  __toESM
} from "./chunk-qp2qdcda.js";

// src/components/WorkflowProgress.tsx
function WorkflowProgress({ steps, currentStep }) {
  const [ref, time] = useAnimationFrame(100);
  const frame = Math.floor(time / 100) % SPINNER_FRAMES.length;
  const isDone = currentStep >= steps.length;
  return /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedBox_default, {
    ref,
    flexDirection: "column",
    paddingX: 1,
    paddingY: 1,
    children: [
      /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedBox_default, {
        marginBottom: 1,
        children: /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
          bold: true,
          color: "claude",
          children: isDone ? `${figures_default.tick} Workflow complete` : `${SPINNER_FRAMES[frame]} Running workflow\u2026`
        }, undefined, false, undefined, this)
      }, undefined, false, undefined, this),
      /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedBox_default, {
        flexDirection: "column",
        marginLeft: 2,
        children: steps.map((step, index) => {
          const isComplete = isDone || index < currentStep;
          const isCurrent = !isDone && index === currentStep;
          const isPending = !isDone && index > currentStep;
          let icon;
          let color;
          if (isComplete) {
            icon = figures_default.tick;
            color = "green";
          } else if (isCurrent) {
            icon = SPINNER_FRAMES[frame];
            color = "claude";
          } else {
            icon = figures_default.circle;
            color = undefined;
          }
          return /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedBox_default, {
            flexDirection: "row",
            children: [
              /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedBox_default, {
                width: 2,
                children: /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
                  color,
                  dimColor: isPending,
                  children: icon
                }, undefined, false, undefined, this)
              }, undefined, false, undefined, this),
              /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
                dimColor: isPending,
                bold: isCurrent,
                children: step.name
              }, undefined, false, undefined, this)
            ]
          }, index, true, undefined, this);
        })
      }, undefined, false, undefined, this)
    ]
  }, undefined, true, undefined, this);
}
var jsx_dev_runtime, SPINNER_FRAMES;
var init_WorkflowProgress = __esm(() => {
  init_figures();
  init_src();
  jsx_dev_runtime = __toESM(require_jsx_dev_runtime(), 1);
  SPINNER_FRAMES = ["\u25D0", "\u25D3", "\u25D1", "\u25D2"];
});

// src/utils/hooks/registerSkillHooks.ts
function registerSkillHooks(setAppState, sessionId, hooks, skillName, skillRoot) {
  let registeredCount = 0;
  for (const eventName of HOOK_EVENTS) {
    const matchers = hooks[eventName];
    if (!matchers)
      continue;
    for (const matcher of matchers) {
      for (const hook of matcher.hooks) {
        const onHookSuccess = hook.once ? () => {
          logForDebugging(`Removing one-shot hook for event ${eventName} in skill '${skillName}'`);
          removeSessionHook(setAppState, sessionId, eventName, hook);
        } : undefined;
        addSessionHook(setAppState, sessionId, eventName, matcher.matcher || "", hook, onHookSuccess, skillRoot);
        registeredCount++;
      }
    }
  }
  if (registeredCount > 0) {
    logForDebugging(`Registered ${registeredCount} hooks from skill '${skillName}'`);
  }
}
var init_registerSkillHooks = __esm(() => {
  init_agentSdkTypes();
  init_debug();
  init_sessionHooks();
});

// src/utils/processUserInput/processSlashCommand.tsx
import { randomUUID } from "crypto";
async function executeForkedSlashCommand(command, args, context, precedingInputBlocks, setToolJSX, canUseTool) {
  const agentId = createAgentId();
  const pluginMarketplace = command.pluginInfo ? parsePluginIdentifier(command.pluginInfo.repository).marketplace : undefined;
  logEvent("tengu_slash_command_forked", {
    command_name: command.name,
    invocation_trigger: "user-slash",
    ...command.pluginInfo && {
      _PROTO_plugin_name: command.pluginInfo.pluginManifest.name,
      ...pluginMarketplace && {
        _PROTO_marketplace_name: pluginMarketplace
      },
      ...buildPluginCommandTelemetryFields(command.pluginInfo)
    }
  });
  const { skillContent, modifiedGetAppState, baseAgent, promptMessages } = await prepareForkedCommandContext(command, args, context);
  const agentDefinition = command.effort !== undefined ? { ...baseAgent, effort: command.effort } : baseAgent;
  logForDebugging(`Executing forked slash command /${command.name} with agent ${agentDefinition.agentType}`);
  const workflowSteps = command.kind === "workflow" ? command.workflowSteps : undefined;
  const workflowConfirmRequired = command.kind === "workflow" ? command.workflowConfirmRequired : undefined;
  let setWorkflowStep = () => {};
  let workflowStepIndex = 0;
  if (workflowSteps && workflowSteps.length > 0) {
    let WorkflowWrapper = function() {
      const [step, _setStep] = import_react.useState(0);
      setWorkflowStep = _setStep;
      return React.createElement(WorkflowProgress, { steps, currentStep: step });
    };
    const steps = workflowSteps;
    setToolJSX({
      jsx: React.createElement(WorkflowWrapper),
      shouldHidePromptInput: false,
      shouldContinueAnimation: true,
      showSpinner: true
    });
  }
  if ((await context.getAppState()).kairosEnabled) {
    const bgAbortController = createAbortController();
    const commandName = getCommandName(command);
    const spawnTimeWorkload = getWorkload();
    const enqueueResult = (value) => enqueuePendingNotification({
      value,
      mode: "prompt",
      priority: "later",
      isMeta: true,
      skipSlashCommands: true,
      workload: spawnTimeWorkload
    });
    (async () => {
      const deadline = Date.now() + MCP_SETTLE_TIMEOUT_MS;
      while (Date.now() < deadline) {
        const s = context.getAppState();
        if (!s.mcp.clients.some((c) => c.type === "pending"))
          break;
        await sleep(MCP_SETTLE_POLL_MS);
      }
      const freshTools = context.options.refreshTools?.() ?? context.options.tools;
      const agentMessages2 = [];
      for await (const message of runAgent({
        agentDefinition,
        promptMessages,
        toolUseContext: {
          ...context,
          getAppState: modifiedGetAppState,
          abortController: bgAbortController
        },
        canUseTool,
        isAsync: true,
        querySource: "agent:custom",
        model: command.model,
        availableTools: freshTools,
        override: { agentId }
      })) {
        agentMessages2.push(message);
      }
      const resultText2 = extractResultText(agentMessages2, "Command completed");
      logForDebugging(`Background forked command /${commandName} completed (agent ${agentId})`);
      enqueueResult(`<scheduled-task-result command="/${commandName}">
${resultText2}
</scheduled-task-result>`);
    })().catch((err) => {
      logError(err);
      enqueueResult(`<scheduled-task-result command="/${commandName}" status="failed">
${err instanceof Error ? err.message : String(err)}
</scheduled-task-result>`);
    });
    return { messages: [], shouldQuery: false, command };
  }
  const agentMessages = [];
  let resultText = "";
  const progressMessages = [];
  const parentToolUseID = `forked-command-${command.name}`;
  let toolUseCounter = 0;
  const createProgressMessage = (message) => {
    toolUseCounter++;
    return {
      type: "progress",
      data: {
        message,
        type: "agent_progress",
        prompt: skillContent,
        agentId
      },
      parentToolUseID,
      toolUseID: `${parentToolUseID}-${toolUseCounter}`,
      timestamp: new Date().toISOString(),
      uuid: randomUUID()
    };
  };
  const updateProgress = () => {
    setToolJSX({
      jsx: renderToolUseProgressMessage(progressMessages, {
        tools: context.options.tools,
        verbose: false
      }),
      shouldHidePromptInput: false,
      shouldContinueAnimation: true,
      showSpinner: true
    });
  };
  let workflowState = { phase: "idle" };
  const buildStepRedirectMessage = (targetStepName) => {
    return createUserMessage({
      content: prepareUserContent({
        inputString: `[Workflow] Step completed. Proceed to step: ${targetStepName}`,
        precedingInputBlocks: []
      })
    });
  };
  const buildConfirmMessage = (stepName) => {
    return createUserMessage({
      content: prepareUserContent({
        inputString: `[Workflow] Step "${stepName}" requires confirmation before proceeding. Reply "confirm" or "y" to continue, or "abort" to stop.`,
        precedingInputBlocks: []
      })
    });
  };
  const isSkillToolResult = (msg) => {
    if (msg.type !== "user")
      return false;
    const content = msg.content;
    if (!Array.isArray(content))
      return false;
    return content.some((block) => block.type === "tool_result" && ("tool_use_id" in block) && typeof block.tool_use_id === "string" && block.tool_use_id.includes("skill"));
  };
  const stepNeedsConfirm = (stepIndex) => {
    const step = workflowSteps[stepIndex];
    if (step.confirmRequired === true)
      return true;
    return workflowConfirmRequired === true;
  };
  const findStepIndexByName = (name) => {
    return workflowSteps.findIndex((s) => s.name === name);
  };
  if (!workflowSteps) {
    updateProgress();
    throw new Error(`Workflow command '${command.name}' has no steps defined`);
  }
  try {
    const allAgentMessages = [];
    while (true) {
      const currentStepIndex = workflowStepIndex;
      if (currentStepIndex >= workflowSteps.length) {
        workflowState = { phase: "done" };
        break;
      }
      const currentStep = workflowSteps[currentStepIndex];
      if (stepNeedsConfirm(currentStepIndex)) {
        const confirmPrompt = buildConfirmMessage(currentStep.name);
        for await (const _msg of runAgent({
          agentDefinition,
          promptMessages: [confirmPrompt],
          toolUseContext: {
            ...context,
            getAppState: modifiedGetAppState
          },
          canUseTool,
          isAsync: false,
          querySource: "agent:custom",
          model: command.model,
          availableTools: context.options.tools
        })) {
          allAgentMessages.push(_msg);
        }
        const lastMsg = allAgentMessages[allAgentMessages.length - 1];
        if (lastMsg?.type === "user" && typeof lastMsg.content === "string" && lastMsg.content.toLowerCase().includes("abort")) {
          resultText = "Workflow aborted by user";
          break;
        }
        allAgentMessages.length = 0;
      }
      if (currentStep.skill) {
        workflowState = { phase: "skill_active", skillStepIndex: currentStepIndex };
      }
      let iterationEnded = false;
      for await (const message of runAgent({
        agentDefinition,
        promptMessages,
        toolUseContext: {
          ...context,
          getAppState: modifiedGetAppState
        },
        canUseTool,
        isAsync: false,
        querySource: "agent:custom",
        model: command.model,
        availableTools: context.options.tools
      })) {
        allAgentMessages.push(message);
        const normalizedNew = normalizeMessages([message]);
        if (workflowSteps && message.type === "assistant") {
          const content = message.message?.content;
          if (Array.isArray(content)) {
            for (const block of content) {
              if (block != null && typeof block === "object" && "type" in block && block.type === "tool_use" && "name" in block && block.name === SKILL_TOOL_NAME) {
                const skillName = block.input?.skill;
                if (skillName) {
                  for (let i = workflowStepIndex;i < workflowSteps.length; i++) {
                    if (workflowSteps[i]?.skill === skillName) {
                      workflowStepIndex = i;
                      setWorkflowStep(i);
                      break;
                    }
                  }
                }
              }
            }
          }
        }
        if (workflowState.phase === "skill_active" && isSkillToolResult(message)) {
          workflowState = { phase: "idle" };
          const stepResultText = extractResultText(allAgentMessages, "Step completed");
          if (currentStep.onResult) {
            for (const [keyword, targetStep] of Object.entries(currentStep.onResult)) {
              if (stepResultText.toLowerCase().includes(keyword.toLowerCase())) {
                if (targetStep === "COMPLETE") {
                  workflowState = { phase: "done" };
                  iterationEnded = true;
                  break;
                }
                const targetIndex = findStepIndexByName(targetStep);
                if (targetIndex >= 0) {
                  const redirectMsg = buildStepRedirectMessage(targetStep);
                  allAgentMessages.length = 0;
                  workflowStepIndex = targetIndex;
                  setWorkflowStep(targetIndex);
                  iterationEnded = true;
                  const redirectResult = buildStepRedirectMessage(targetStep);
                  for await (const _msg of runAgent({
                    agentDefinition,
                    promptMessages: [redirectMsg],
                    toolUseContext: {
                      ...context,
                      getAppState: modifiedGetAppState
                    },
                    canUseTool,
                    isAsync: false,
                    querySource: "agent:custom",
                    model: command.model,
                    availableTools: context.options.tools
                  })) {
                    allAgentMessages.push(_msg);
                  }
                  break;
                }
              }
            }
          }
          if (iterationEnded && workflowState.phase !== "done") {
            break;
          }
        }
        if (message.type === "assistant") {
          const contentLength = getAssistantMessageContentLength(message);
          if (contentLength > 0) {
            context.setResponseLength((len) => len + contentLength);
          }
          if (!workflowSteps) {
            const normalizedMsg = normalizedNew[0];
            if (normalizedMsg && normalizedMsg.type === "assistant") {
              progressMessages.push(createProgressMessage(message));
              updateProgress();
            }
          }
        }
        if (!workflowSteps && message.type === "user") {
          const normalizedMsg = normalizedNew[0];
          if (normalizedMsg && normalizedMsg.type === "user") {
            progressMessages.push(createProgressMessage(normalizedMsg));
            updateProgress();
          }
        }
      }
      if (iterationEnded) {
        if (workflowState.phase === "done")
          break;
        continue;
      }
      if (workflowState.phase === "idle") {
        workflowStepIndex++;
        setWorkflowStep(workflowStepIndex);
      }
      if (workflowStepIndex >= workflowSteps.length) {
        workflowState = { phase: "done" };
        break;
      }
    }
    if (workflowSteps) {
      setWorkflowStep(workflowSteps.length);
    }
    resultText = extractResultText(allAgentMessages, "Command completed");
  } finally {
    setToolJSX(null);
  }
  logForDebugging(`Forked slash command /${command.name} completed with agent ${agentId}`);
  if (process.env.USER_TYPE === "ant") {
    resultText = `[ANT-ONLY] API calls: ${getDisplayPath(getDumpPromptsPath(agentId))}
${resultText}`;
  }
  const messages = [
    createUserMessage({
      content: prepareUserContent({
        inputString: `/${getCommandName(command)} ${args}`.trim(),
        precedingInputBlocks
      })
    }),
    createUserMessage({
      content: `<local-command-stdout>
${resultText}
</local-command-stdout>`
    })
  ];
  return {
    messages,
    shouldQuery: false,
    command,
    resultText
  };
}
function looksLikeCommand(commandName) {
  return !/[^a-zA-Z0-9:\-_]/.test(commandName);
}
async function processSlashCommand(inputString, precedingInputBlocks, imageContentBlocks, attachmentMessages, context, setToolJSX, uuid, isAlreadyProcessing, canUseTool) {
  const parsed = parseSlashCommand(inputString);
  if (!parsed) {
    logEvent("tengu_input_slash_missing", {});
    const errorMessage = "Commands are in the form `/command [args]`";
    return {
      messages: [
        createSyntheticUserCaveatMessage(),
        ...attachmentMessages,
        createUserMessage({
          content: prepareUserContent({
            inputString: errorMessage,
            precedingInputBlocks
          })
        })
      ],
      shouldQuery: false,
      resultText: errorMessage
    };
  }
  const { commandName, args: parsedArgs, isMcp } = parsed;
  const sanitizedCommandName = isMcp ? "mcp" : !builtInCommandNames().has(commandName) ? "custom" : commandName;
  if (!hasCommand(commandName, context.options.commands)) {
    let isFilePath = false;
    try {
      await getFsImplementation().stat(`/${commandName}`);
      isFilePath = true;
    } catch {}
    if (looksLikeCommand(commandName) && !isFilePath) {
      logEvent("tengu_input_slash_invalid", {
        input: commandName
      });
      const unknownMessage = `Unknown skill: ${commandName}`;
      return {
        messages: [
          createSyntheticUserCaveatMessage(),
          ...attachmentMessages,
          createUserMessage({
            content: prepareUserContent({
              inputString: unknownMessage,
              precedingInputBlocks
            })
          }),
          ...parsedArgs ? [
            createSystemMessage(`Args from unknown skill: ${parsedArgs}`, "warning")
          ] : []
        ],
        shouldQuery: false,
        resultText: unknownMessage
      };
    }
    const promptId = randomUUID();
    setPromptId(promptId);
    logEvent("tengu_input_prompt", {});
    logOTelEvent("user_prompt", {
      prompt_length: String(inputString.length),
      prompt: redactIfDisabled(inputString),
      "prompt.id": promptId
    });
    return {
      messages: [
        createUserMessage({
          content: prepareUserContent({ inputString, precedingInputBlocks }),
          uuid
        }),
        ...attachmentMessages
      ],
      shouldQuery: true
    };
  }
  const {
    messages: newMessages,
    shouldQuery: messageShouldQuery,
    allowedTools,
    model,
    effort,
    command: returnedCommand,
    resultText,
    nextInput,
    submitNextInput
  } = await getMessagesForSlashCommand(commandName, parsedArgs, setToolJSX, context, precedingInputBlocks, imageContentBlocks, isAlreadyProcessing, canUseTool, uuid);
  if (newMessages.length === 0) {
    const eventData2 = {
      input: sanitizedCommandName
    };
    if (returnedCommand.type === "prompt" && returnedCommand.pluginInfo) {
      const { pluginManifest, repository } = returnedCommand.pluginInfo;
      const { marketplace } = parsePluginIdentifier(repository);
      const isOfficial = isOfficialMarketplaceName(marketplace);
      eventData2._PROTO_plugin_name = pluginManifest.name;
      if (marketplace) {
        eventData2._PROTO_marketplace_name = marketplace;
      }
      eventData2.plugin_repository = isOfficial ? repository : "third-party";
      eventData2.plugin_name = isOfficial ? pluginManifest.name : "third-party";
      if (isOfficial && pluginManifest.version) {
        eventData2.plugin_version = pluginManifest.version;
      }
      Object.assign(eventData2, buildPluginCommandTelemetryFields(returnedCommand.pluginInfo));
    }
    logEvent("tengu_input_command", {
      ...eventData2,
      invocation_trigger: "user-slash",
      ...process.env.USER_TYPE === "ant" && {
        skill_name: commandName,
        ...returnedCommand.type === "prompt" && {
          skill_source: returnedCommand.source
        },
        ...returnedCommand.loadedFrom && {
          skill_loaded_from: returnedCommand.loadedFrom
        },
        ...returnedCommand.kind && {
          skill_kind: returnedCommand.kind
        }
      }
    });
    return {
      messages: [],
      shouldQuery: false,
      model,
      nextInput,
      submitNextInput
    };
  }
  if (newMessages.length === 2 && newMessages[1].type === "user" && typeof newMessages[1].message.content === "string" && newMessages[1].message.content.startsWith("Unknown command:")) {
    const looksLikeFilePath = inputString.startsWith("/var") || inputString.startsWith("/tmp") || inputString.startsWith("/private");
    if (!looksLikeFilePath) {
      logEvent("tengu_input_slash_invalid", {
        input: commandName
      });
    }
    return {
      messages: [createSyntheticUserCaveatMessage(), ...newMessages],
      shouldQuery: messageShouldQuery,
      allowedTools,
      model
    };
  }
  const eventData = {
    input: sanitizedCommandName
  };
  if (returnedCommand.type === "prompt" && returnedCommand.pluginInfo) {
    const { pluginManifest, repository } = returnedCommand.pluginInfo;
    const { marketplace } = parsePluginIdentifier(repository);
    const isOfficial = isOfficialMarketplaceName(marketplace);
    eventData._PROTO_plugin_name = pluginManifest.name;
    if (marketplace) {
      eventData._PROTO_marketplace_name = marketplace;
    }
    eventData.plugin_repository = isOfficial ? repository : "third-party";
    eventData.plugin_name = isOfficial ? pluginManifest.name : "third-party";
    if (isOfficial && pluginManifest.version) {
      eventData.plugin_version = pluginManifest.version;
    }
    Object.assign(eventData, buildPluginCommandTelemetryFields(returnedCommand.pluginInfo));
  }
  logEvent("tengu_input_command", {
    ...eventData,
    invocation_trigger: "user-slash",
    ...process.env.USER_TYPE === "ant" && {
      skill_name: commandName,
      ...returnedCommand.type === "prompt" && {
        skill_source: returnedCommand.source
      },
      ...returnedCommand.loadedFrom && {
        skill_loaded_from: returnedCommand.loadedFrom
      },
      ...returnedCommand.kind && {
        skill_kind: returnedCommand.kind
      }
    }
  });
  const isCompactResult = newMessages.length > 0 && newMessages[0] && isCompactBoundaryMessage(newMessages[0]);
  return {
    messages: messageShouldQuery || newMessages.every(isSystemLocalCommandMessage) || isCompactResult ? newMessages : [createSyntheticUserCaveatMessage(), ...newMessages],
    shouldQuery: messageShouldQuery,
    allowedTools,
    model,
    effort,
    resultText,
    nextInput,
    submitNextInput
  };
}
async function getMessagesForSlashCommand(commandName, args, setToolJSX, context, precedingInputBlocks, imageContentBlocks, _isAlreadyProcessing, canUseTool, uuid) {
  const command = getCommand(commandName, context.options.commands);
  if (command.type === "prompt" && command.userInvocable !== false) {
    recordSkillUsage(commandName);
  }
  if (command.userInvocable === false) {
    return {
      messages: [
        createUserMessage({
          content: prepareUserContent({
            inputString: `/${commandName}`,
            precedingInputBlocks
          })
        }),
        createUserMessage({
          content: `This skill can only be invoked by Claude, not directly by users. Ask Claude to use the "${commandName}" skill for you.`
        })
      ],
      shouldQuery: false,
      command
    };
  }
  try {
    switch (command.type) {
      case "local-jsx": {
        return new Promise((resolve) => {
          let doneWasCalled = false;
          const onDone = (result, options) => {
            doneWasCalled = true;
            if (options?.display === "skip") {
              resolve({
                messages: [],
                shouldQuery: false,
                command,
                nextInput: options?.nextInput,
                submitNextInput: options?.submitNextInput
              });
              return;
            }
            const metaMessages = (options?.metaMessages ?? []).map((content) => createUserMessage({ content, isMeta: true }));
            const skipTranscript = isFullscreenEnvEnabled() && typeof result === "string" && result.endsWith(" dismissed");
            resolve({
              messages: options?.display === "system" ? skipTranscript ? metaMessages : [
                createCommandInputMessage(formatCommandInput(command, args)),
                createCommandInputMessage(`<local-command-stdout>${result}</local-command-stdout>`),
                ...metaMessages
              ] : [
                createUserMessage({
                  content: prepareUserContent({
                    inputString: formatCommandInput(command, args),
                    precedingInputBlocks
                  })
                }),
                result ? createUserMessage({
                  content: `<local-command-stdout>${result}</local-command-stdout>`
                }) : createUserMessage({
                  content: `<local-command-stdout>${NO_CONTENT_MESSAGE}</local-command-stdout>`
                }),
                ...metaMessages
              ],
              shouldQuery: options?.shouldQuery ?? false,
              command,
              nextInput: options?.nextInput,
              submitNextInput: options?.submitNextInput
            });
          };
          command.load().then((mod) => mod.call(onDone, { ...context, canUseTool }, args)).then((jsx) => {
            if (jsx == null)
              return;
            if (context.options.isNonInteractiveSession) {
              resolve({
                messages: [],
                shouldQuery: false,
                command
              });
              return;
            }
            if (doneWasCalled)
              return;
            setToolJSX({
              jsx,
              shouldHidePromptInput: true,
              showSpinner: false,
              isLocalJSXCommand: true,
              isImmediate: command.immediate === true
            });
          }).catch((e) => {
            logError(e);
            if (doneWasCalled)
              return;
            doneWasCalled = true;
            setToolJSX({
              jsx: null,
              shouldHidePromptInput: false,
              clearLocalJSX: true
            });
            resolve({ messages: [], shouldQuery: false, command });
          });
        });
      }
      case "local": {
        const displayArgs = command.isSensitive && args.trim() ? "***" : args;
        const userMessage = createUserMessage({
          content: prepareUserContent({
            inputString: formatCommandInput(command, displayArgs),
            precedingInputBlocks
          })
        });
        try {
          const syntheticCaveatMessage = createSyntheticUserCaveatMessage();
          const mod = await command.load();
          const result = await mod.call(args, context);
          if (result.type === "skip") {
            return {
              messages: [],
              shouldQuery: false,
              command
            };
          }
          if (result.type === "compact") {
            const slashCommandMessages = [
              syntheticCaveatMessage,
              userMessage,
              ...result.displayText ? [
                createUserMessage({
                  content: `<local-command-stdout>${result.displayText}</local-command-stdout>`,
                  timestamp: new Date(Date.now() + 100).toISOString()
                })
              ] : []
            ];
            const compactionResultWithSlashMessages = {
              ...result.compactionResult,
              messagesToKeep: [
                ...result.compactionResult.messagesToKeep ?? [],
                ...slashCommandMessages
              ]
            };
            resetMicrocompactState();
            return {
              messages: buildPostCompactMessages(compactionResultWithSlashMessages),
              shouldQuery: false,
              command
            };
          }
          return {
            messages: [
              userMessage,
              createCommandInputMessage(`<local-command-stdout>${result.value}</local-command-stdout>`)
            ],
            shouldQuery: false,
            command,
            resultText: result.value
          };
        } catch (e) {
          logError(e);
          return {
            messages: [
              userMessage,
              createCommandInputMessage(`<local-command-stderr>${String(e)}</local-command-stderr>`)
            ],
            shouldQuery: false,
            command
          };
        }
      }
      case "prompt": {
        try {
          if (command.context === "fork") {
            return await executeForkedSlashCommand(command, args, context, precedingInputBlocks, setToolJSX, canUseTool ?? hasPermissionsToUseTool);
          }
          return await getMessagesForPromptSlashCommand(command, args, context, precedingInputBlocks, imageContentBlocks, uuid);
        } catch (e) {
          if (e instanceof AbortError) {
            return {
              messages: [
                createUserMessage({
                  content: prepareUserContent({
                    inputString: formatCommandInput(command, args),
                    precedingInputBlocks
                  })
                }),
                createUserInterruptionMessage({ toolUse: false })
              ],
              shouldQuery: false,
              command
            };
          }
          return {
            messages: [
              createUserMessage({
                content: prepareUserContent({
                  inputString: formatCommandInput(command, args),
                  precedingInputBlocks
                })
              }),
              createUserMessage({
                content: `<local-command-stderr>${String(e)}</local-command-stderr>`
              })
            ],
            shouldQuery: false,
            command
          };
        }
      }
    }
  } catch (e) {
    if (e instanceof MalformedCommandError) {
      return {
        messages: [
          createUserMessage({
            content: prepareUserContent({
              inputString: e.message,
              precedingInputBlocks
            })
          })
        ],
        shouldQuery: false,
        command
      };
    }
    throw e;
  }
}
function formatCommandInput(command, args) {
  return formatCommandInputTags(getCommandName(command), args);
}
function formatSkillLoadingMetadata(skillName, _progressMessage = "loading") {
  return [
    `<${COMMAND_MESSAGE_TAG}>${skillName}</${COMMAND_MESSAGE_TAG}>`,
    `<${COMMAND_NAME_TAG}>${skillName}</${COMMAND_NAME_TAG}>`,
    `<skill-format>true</skill-format>`
  ].join(`
`);
}
function formatSlashCommandLoadingMetadata(commandName, args) {
  return [
    `<${COMMAND_MESSAGE_TAG}>${commandName}</${COMMAND_MESSAGE_TAG}>`,
    `<${COMMAND_NAME_TAG}>/${commandName}</${COMMAND_NAME_TAG}>`,
    args ? `<command-args>${args}</command-args>` : null
  ].filter(Boolean).join(`
`);
}
function formatCommandLoadingMetadata(command, args) {
  if (command.userInvocable !== false) {
    return formatSlashCommandLoadingMetadata(command.name, args);
  }
  if (command.loadedFrom === "skills" || command.loadedFrom === "plugin" || command.loadedFrom === "mcp") {
    return formatSkillLoadingMetadata(command.name, command.progressMessage);
  }
  return formatSlashCommandLoadingMetadata(command.name, args);
}
async function processPromptSlashCommand(commandName, args, commands, context, imageContentBlocks = []) {
  const command = findCommand(commandName, commands);
  if (!command) {
    throw new MalformedCommandError(`Unknown command: ${commandName}`);
  }
  if (command.type !== "prompt") {
    throw new Error(`Unexpected ${command.type} command. Expected 'prompt' command. Use /${commandName} directly in the main conversation.`);
  }
  return getMessagesForPromptSlashCommand(command, args, context, [], imageContentBlocks);
}
async function getMessagesForPromptSlashCommand(command, args, context, precedingInputBlocks = [], imageContentBlocks = [], uuid) {
  if (isEnvTruthy(process.env.CLAUDE_CODE_COORDINATOR_MODE) && !context.agentId) {
    const metadata2 = formatCommandLoadingMetadata(command, args);
    const parts = [
      `Skill "/${command.name}" is available for workers.`
    ];
    if (command.description) {
      parts.push(`Description: ${command.description}`);
    }
    if (command.whenToUse) {
      parts.push(`When to use: ${command.whenToUse}`);
    }
    const skillAllowedTools = command.allowedTools ?? [];
    if (skillAllowedTools.length > 0) {
      parts.push(`This skill grants workers additional tool permissions: ${skillAllowedTools.join(", ")}`);
    }
    parts.push(`
Instruct a worker to use this skill by including "Use the /${command.name} skill" in your Agent prompt. The worker has access to the Skill tool and will receive the skill's content and permissions when it invokes it.`);
    const summaryContent = [
      { type: "text", text: parts.join(`
`) }
    ];
    return {
      messages: [
        createUserMessage({ content: metadata2, uuid }),
        createUserMessage({ content: summaryContent, isMeta: true })
      ],
      shouldQuery: true,
      model: command.model,
      effort: command.effort,
      command
    };
  }
  const result = await command.getPromptForCommand(args, context);
  const hooksAllowedForThisSkill = !isRestrictedToPluginOnly("hooks") || isSourceAdminTrusted(command.source);
  if (command.hooks && hooksAllowedForThisSkill) {
    const sessionId = getSessionId();
    registerSkillHooks(context.setAppState, sessionId, command.hooks, command.name, command.type === "prompt" ? command.skillRoot : undefined);
  }
  const skillPath = command.source ? `${command.source}:${command.name}` : command.name;
  const skillContent = result.filter((b) => b.type === "text").map((b) => b.text).join(`

`);
  addInvokedSkill(command.name, skillPath, skillContent, getAgentContext()?.agentId ?? null);
  const metadata = formatCommandLoadingMetadata(command, args);
  const additionalAllowedTools = parseToolListFromCLI(command.allowedTools ?? []);
  const mainMessageContent = imageContentBlocks.length > 0 || precedingInputBlocks.length > 0 ? [...imageContentBlocks, ...precedingInputBlocks, ...result] : result;
  const attachmentMessages = await toArray(getAttachmentMessages(result.filter((block) => block.type === "text").map((block) => block.text).join(" "), context, null, [], context.messages, "repl_main_thread", { skipSkillDiscovery: true }));
  const messages = [
    createUserMessage({
      content: metadata,
      uuid
    }),
    createUserMessage({
      content: mainMessageContent,
      isMeta: true
    }),
    ...attachmentMessages,
    createAttachmentMessage({
      type: "command_permissions",
      allowedTools: additionalAllowedTools,
      model: command.model
    })
  ];
  return {
    messages,
    shouldQuery: true,
    allowedTools: additionalAllowedTools,
    model: command.model,
    effort: command.effort,
    command
  };
}
var React, import_react, MCP_SETTLE_POLL_MS = 200, MCP_SETTLE_TIMEOUT_MS = 1e4;
var init_processSlashCommand = __esm(() => {
  init_state();
  init_commands();
  init_WorkflowProgress();
  init_constants();
  init_messages();
  init_state();
  init_xml();
  init_analytics();
  init_dumpPrompts();
  init_compact();
  init_microCompact();
  init_runAgent();
  init_UI();
  init_abortController();
  init_agentContext();
  init_attachments();
  init_debug();
  init_envUtils();
  init_errors();
  init_file();
  init_forkedAgent();
  init_fsOperations();
  init_fullscreen();
  init_generators();
  init_registerSkillHooks();
  init_log();
  init_messageQueueManager();
  init_messages2();
  init_permissionSetup();
  init_permissions();
  init_pluginIdentifier();
  init_pluginOnlyPolicy();
  init_slashCommandParsing();
  init_sleep();
  init_skillUsageTracking();
  init_events();
  init_pluginTelemetry();
  init_tokens();
  init_uuid();
  init_workloadContext();
  React = __toESM(require_react(), 1);
  import_react = __toESM(require_react(), 1);
});
init_processSlashCommand();

export {
  processSlashCommand,
  processPromptSlashCommand,
  looksLikeCommand,
  formatSkillLoadingMetadata
};
