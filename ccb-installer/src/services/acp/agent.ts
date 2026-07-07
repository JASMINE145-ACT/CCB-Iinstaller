/**
 * ACP Agent implementation — bridges ACP protocol methods to Claude Code's
 * internal QueryEngine / query() pipeline.
 *
 * Architecture: Uses internal QueryEngine (not @anthropic-ai/claude-agent-sdk)
 * to directly run queries, with a bridge layer converting SDKMessage → ACP SessionUpdate.
 */
import './wanDEnvBootstrap.js'
import type {
  Agent,
  AgentSideConnection,
  InitializeRequest,
  InitializeResponse,
  AuthenticateRequest,
  AuthenticateResponse,
  NewSessionRequest,
  NewSessionResponse,
  PromptRequest,
  PromptResponse,
  CancelNotification,
  LoadSessionRequest,
  LoadSessionResponse,
  ListSessionsRequest,
  ListSessionsResponse,
  ResumeSessionRequest,
  ResumeSessionResponse,
  ForkSessionRequest,
  ForkSessionResponse,
  CloseSessionRequest,
  CloseSessionResponse,
  SetSessionModeRequest,
  SetSessionModeResponse,
  SetSessionModelRequest,
  SetSessionModelResponse,
  SetSessionConfigOptionRequest,
  SetSessionConfigOptionResponse,
  ClientCapabilities,
  SessionModeState,
  SessionModelState,
  SessionConfigOption,
} from '@agentclientprotocol/sdk'
import { randomUUID, type UUID } from 'node:crypto'
import { dirname, join } from 'node:path'
import type { Message } from '../../types/message.js'
import { deserializeMessages } from '../../utils/conversationRecovery.js'
import {
  getLastSessionLog,
  sessionIdExists,
} from '../../utils/sessionStorage.js'
import { QueryEngine } from '../../QueryEngine.js'
import type { QueryEngineConfig } from '../../QueryEngine.js'
import type { Tools } from '../../Tool.js'
import { getTools } from '../../tools.js'
import { getEmptyToolPermissionContext } from '../../Tool.js'
import type { PermissionMode } from '../../types/permissions.js'
import type { Command } from '../../types/command.js'
import { buildAvailableCommandsUpdatePayload } from './capabilities.js'
import { getCommands } from '../../commands.js'
import {
  clearAgentDefinitionsCache,
  getAgentDefinitionsWithOverrides,
} from '@claude-code-best/builtin-tools/tools/AgentTool/loadAgentsDir.js'
import { prefetchAllMcpResources } from '../../services/mcp/client.js'
import type { ScopedMcpServerConfig } from '@claude-code-best/mcp-client'
import {
  loadMcpConfigsFromSettings,
} from './mcpManifest.js'
import { omitLazySessionMcpServers } from './mcpSessionPrefetch.js'
import {
  consumeNextAssistantProfileId,
  filterCommandsForAssistantProfile,
  filterMcpConfigsForAssistantProfile,
  resolvePresetContextFromMeta,
  type CcbAssistantProfile,
} from './assistantProfiles.js'
import {
  appendWanDDelegationIndex,
  getDefaultSessionAgentId,
  filterDelegatableCustomAgents,
  filterMcpConfigsForOrchestratorSession,
  isSpecialistDirectSession,
  isWandeOrchestratorSession,
  repairAgentMarkdownBomIfNeeded,
  resolveSessionAgentIdFromMeta,
  resolveSessionProfile,
  resolveSessionProfileIdForCreate,
  resolveSessionUserContextOverride,
  wrapCanUseToolForWandeOrchestrator,
} from './agentSessionProfile.js'
import {
  setOriginalCwd,
  switchSession,
  getSessionProjectDir,
} from '../../bootstrap/state.js'
import { publishActiveWorkspace } from './workspacePointer.js'
import type { SessionId } from '../../types/ids.js'
import { enableConfigs } from '../../utils/config.js'
import { FileStateCache } from '../../utils/fileStateCache.js'
import { getDefaultAppState } from '../../state/AppStateStore.js'
import type { AppState } from '../../state/AppStateStore.js'
import {
  resetToolCallRepeatState,
  wrapCanUseToolWithRepeatGuard,
  wrapSdkMessagesForInventoryBatch,
} from './mcpToolRepeatGuard.js'
import { scheduleWanDMcpWarmup } from './wanDMcpWarmup.js'
import { createAcpCanUseTool } from './permissions.js'
import {
  forwardSessionUpdates,
  replayHistoryMessages,
  type ToolUseCache,
} from './bridge.js'
import {
  resolvePermissionMode,
  computeSessionFingerprint,
  sanitizeTitle,
} from './utils.js'
import {
  isEmptyPromptSubmitInput,
  promptToSubmitInput,
} from './promptConversion.js'
import { trimMessagesToCompleteTurnBoundary } from './sessionTranscript.js'
import { listSessionsImpl } from '../../utils/listSessionsImpl.js'
import { resolveSessionFilePath } from '../../utils/sessionStoragePortable.js'
import { getMainLoopModel } from '../../utils/model/model.js'
import { getModelOptions } from '../../utils/model/modelOptions.js'
import {
  getMiniMaxM3ModelOptions,
  resolveMiniMaxM3Variant,
  shouldExposeMiniMaxM3Variants,
} from '../../utils/model/minimaxM3.js'
import { getSettings_DEPRECATED } from '../../utils/settings/settings.js'

// ── Session state ─────────────────────────────────────────────────

type AcpSession = {
  queryEngine: QueryEngine
  cancelled: boolean
  cancelGeneration: number
  cwd: string
  sessionFingerprint: string
  appliedProfileId?: string
  sessionCreateParams?: Pick<NewSessionRequest, 'mcpServers' | '_meta'>
  modes: SessionModeState
  models: SessionModelState
  configOptions: SessionConfigOption[]
  promptRunning: boolean
  pendingMessages: Map<string, PendingPrompt>
  pendingQueue: string[]
  pendingQueueHead: number
  toolUseCache: ToolUseCache
  clientCapabilities?: ClientCapabilities
  appState: AppState
  commands: Command[]
}

type PendingPrompt = {
  resolve: (cancelled: boolean) => void
}

type AcpParamMcpServer = { name: string } & Record<string, unknown>

function loadMcpConfigsFromParams(
  paramServers: AcpParamMcpServer[],
): Record<string, ScopedMcpServerConfig> {
  const mcpConfigs: Record<string, ScopedMcpServerConfig> = {}
  for (const server of paramServers) {
    if (
      server &&
      typeof server === 'object' &&
      typeof server.name === 'string'
    ) {
      const { name, ...rest } = server
      mcpConfigs[name] = {
        ...rest,
        scope: 'dynamic',
      } as ScopedMcpServerConfig
    }
  }
  return mcpConfigs
}

/** User MCP from settings.json, overlaid by ACP client servers (e.g. AionUI guide_mcp). */
export function resolveSessionMcpConfigs(
  params: Pick<NewSessionRequest, 'mcpServers'>,
  assistantProfile?: CcbAssistantProfile | null,
  sessionProfileId?: string,
): Record<string, ScopedMcpServerConfig> {
  const paramServers = (params.mcpServers ?? []) as AcpParamMcpServer[]
  const merged = {
    ...filterMcpConfigsForAssistantProfile(
      loadMcpConfigsFromSettings(),
      assistantProfile ?? null,
    ),
    ...loadMcpConfigsFromParams(paramServers),
  }
  return filterMcpConfigsForOrchestratorSession(merged, sessionProfileId)
}

// ── Agent class ───────────────────────────────────────────────────

/** WanD default router must sync-wait Agent() — async subagents break table delivery in ACP. */
export function ensureWanDSyncSubagents(): void {
  if (!process.env.CLAUDE_CODE_DISABLE_BACKGROUND_TASKS) {
    process.env.CLAUDE_CODE_DISABLE_BACKGROUND_TASKS = '1'
  }
}

export class AcpAgent implements Agent {
  private conn: AgentSideConnection
  sessions = new Map<string, AcpSession>()
  private clientCapabilities?: ClientCapabilities
  /** User-selected model variant per session — survives in-memory session eviction / recreate. */
  private sessionPreferredModelIds = new Map<string, string>()
  /** Avoid re-teardown when the same stale-id pair was already rehydrated this process. */
  private rehydratedStalePairs = new Set<string>()

  constructor(conn: AgentSideConnection) {
    ensureWanDSyncSubagents()
    this.conn = conn
  }

  private rememberSessionModelPreference(sessionId: string, modelId: string): void {
    const trimmed = modelId.trim()
    if (!trimmed) return
    this.sessionPreferredModelIds.set(sessionId, trimmed)
  }

  /**
   * aioncore may keep a persisted session id after IdleTimeout kills the CLI.
   * After session/new the live process often has exactly one in-memory session
   * with a different id — redirect prompt/setModel to that session instead of
   * failing with "Session not found" (mislabeled as provider 404 upstream).
   */
  private resolveSessionRequest(requestedSessionId: string): {
    session: AcpSession
    sessionId: string
  } {
    const direct = this.sessions.get(requestedSessionId)
    if (direct) {
      return { session: direct, sessionId: requestedSessionId }
    }

    if (this.sessions.size === 1) {
      const [activeSessionId, session] = this.sessions.entries().next()
        .value as [string, AcpSession]
      if (activeSessionId !== requestedSessionId) {
        console.warn(
          `[ACP] stale session id redirect requested=${requestedSessionId} active=${activeSessionId}`,
        )
      }
      return { session, sessionId: activeSessionId }
    }

    throw new Error(`Session ${requestedSessionId} not found`)
  }

  /**
   * After IdleTimeout, aioncore may prompt with a persisted session id while the
   * live CLI only has a fresh empty session/new id. Rebuild the requested session
   * from disk transcript so the model regains prior turns.
   */
  private async resolveSessionRequestForPrompt(
    requestedSessionId: string,
  ): Promise<{ session: AcpSession; sessionId: string }> {
    const direct = this.sessions.get(requestedSessionId)
    if (direct) {
      return { session: direct, sessionId: requestedSessionId }
    }

    if (this.sessions.size === 1) {
      const [activeSessionId, activeSession] = this.sessions.entries().next()
        .value as [string, AcpSession]
      if (activeSessionId !== requestedSessionId) {
        const rehydrated = await this.tryRehydrateStaleSession(
          requestedSessionId,
          activeSessionId,
          activeSession,
        )
        if (rehydrated) {
          return rehydrated
        }
        console.warn(
          `[ACP] stale session id redirect requested=${requestedSessionId} active=${activeSessionId}`,
        )
      }
      return { session: activeSession, sessionId: activeSessionId }
    }

    throw new Error(`Session ${requestedSessionId} not found`)
  }

  private async tryRehydrateStaleSession(
    requestedSessionId: string,
    activeSessionId: string,
    activeSession: AcpSession,
  ): Promise<{ session: AcpSession; sessionId: string } | null> {
    const pairKey = `${requestedSessionId}<-${activeSessionId}`
    const cached = this.sessions.get(requestedSessionId)
    if (cached && this.rehydratedStalePairs.has(pairKey)) {
      return { session: cached, sessionId: requestedSessionId }
    }

    let diskMessageCount = 0
    try {
      const log = await getLastSessionLog(requestedSessionId as UUID)
      diskMessageCount = log?.messages?.length ?? 0
      if (diskMessageCount === 0) {
        return null
      }
    } catch {
      return null
    }

    const resolved = await resolveSessionFilePath(
      requestedSessionId,
      activeSession.cwd,
    )
    if (!resolved) {
      return null
    }

    await this.teardownSession(activeSessionId)

    // Wrong-session appliedProfileId in _meta overrides fresh handoff from AionUI warmup.
    const bootstrap = {
      mcpServers: activeSession.sessionCreateParams?.mcpServers ?? [],
      _meta: undefined,
    }

    await this.getOrCreateSession({
      sessionId: requestedSessionId,
      cwd: activeSession.cwd,
      mcpServers: bootstrap.mcpServers ?? [],
      _meta: bootstrap._meta,
    })

    const session = this.sessions.get(requestedSessionId)
    if (!session) {
      return null
    }

    this.rehydratedStalePairs.add(pairKey)
    console.info(
      `[ACP] stale session rehydrated from disk requested=${requestedSessionId} replaced=${activeSessionId} diskMessages=${diskMessageCount}`,
    )
    return { session, sessionId: requestedSessionId }
  }

  private resolveSessionPreferredModelId(
    sessionId: string,
    profileModel?: string | null,
  ): string | undefined {
    if (typeof profileModel === 'string' && profileModel.trim()) {
      return profileModel.trim()
    }
    const remembered = this.sessionPreferredModelIds.get(sessionId)
    return remembered?.trim() || undefined
  }

  // ── initialize ────────────────────────────────────────────────

  async initialize(params: InitializeRequest): Promise<InitializeResponse> {
    this.clientCapabilities = params.clientCapabilities

    return {
      protocolVersion: 1,
      agentInfo: {
        name: 'claude-code',
        title: 'Claude Code',
        version:
          typeof (globalThis as unknown as Record<string, unknown>).MACRO ===
            'object' &&
          (globalThis as unknown as Record<string, Record<string, unknown>>)
            .MACRO !== null
            ? String(
                (
                  (
                    globalThis as unknown as Record<
                      string,
                      Record<string, unknown>
                    >
                  ).MACRO as Record<string, unknown>
                ).VERSION ?? '0.0.0',
              )
            : '0.0.0',
      },
      agentCapabilities: {
        _meta: {
          claudeCode: {
            promptQueueing: true,
          },
        },
        promptCapabilities: {
          image: true,
          embeddedContext: true,
        },
        mcpCapabilities: {
          http: true,
          sse: true,
        },
        loadSession: true,
        sessionCapabilities: {
          fork: {},
          list: {},
          resume: {},
          close: {},
        },
      },
    }
  }

  // ── authenticate ──────────────────────────────────────────────

  async authenticate(
    _params: AuthenticateRequest,
  ): Promise<AuthenticateResponse> {
    // No authentication required — this is a self-hosted/custom deployment
    return {}
  }

  // ── newSession ────────────────────────────────────────────────

  async newSession(params: NewSessionRequest): Promise<NewSessionResponse> {
    const result = await this.createSession(params)
    this.scheduleAvailableCommandsUpdate(result.sessionId)
    return result
  }

  // ── resumeSession ──────────────────────────────────────────────

  async unstable_resumeSession(
    params: ResumeSessionRequest,
  ): Promise<ResumeSessionResponse> {
    const result = await this.getOrCreateSession(params)
    this.scheduleAvailableCommandsUpdate(result.sessionId)
    return result
  }

  // ── loadSession ────────────────────────────────────────────────

  async loadSession(params: LoadSessionRequest): Promise<LoadSessionResponse> {
    const result = await this.getOrCreateSession(params)
    this.scheduleAvailableCommandsUpdate(result.sessionId)
    return result
  }

  // ── listSessions ───────────────────────────────────────────────

  async listSessions(
    params: ListSessionsRequest,
  ): Promise<ListSessionsResponse> {
    const candidates = await listSessionsImpl({
      dir: params.cwd ?? undefined,
      limit: 100,
    })

    const sessions = []
    for (const candidate of candidates) {
      if (!candidate.cwd) continue
      sessions.push({
        sessionId: candidate.sessionId,
        cwd: candidate.cwd,
        title: sanitizeTitle(candidate.summary ?? ''),
        updatedAt: new Date(candidate.lastModified).toISOString(),
      })
    }

    return { sessions }
  }

  // ── forkSession ────────────────────────────────────────────────

  async unstable_forkSession(
    params: ForkSessionRequest,
  ): Promise<ForkSessionResponse> {
    const response = await this.createSession({
      cwd: params.cwd,
      mcpServers: params.mcpServers ?? [],
      _meta: params._meta,
    })
    this.scheduleAvailableCommandsUpdate(response.sessionId)
    return response
  }

  // ── closeSession ───────────────────────────────────────────────

  async unstable_closeSession(
    params: CloseSessionRequest,
  ): Promise<CloseSessionResponse> {
    const session = this.sessions.get(params.sessionId)
    if (!session) {
      throw new Error('Session not found')
    }
    await this.teardownSession(params.sessionId)
    return {}
  }

  // ── prompt ────────────────────────────────────────────────────

  async prompt(params: PromptRequest): Promise<PromptResponse> {
    const { session, sessionId: effectiveSessionId } =
      await this.resolveSessionRequestForPrompt(params.sessionId)

    // Extract text/image content from the prompt
    const promptInput = promptToSubmitInput(params.prompt)

    if (isEmptyPromptSubmitInput(promptInput)) {
      return { stopReason: 'end_turn' }
    }

    const promptCancelGeneration = session.cancelGeneration

    // Handle prompt queuing — if a prompt is already running, queue this one
    if (session.promptRunning) {
      const promptUuid = randomUUID()
      const cancelled = await new Promise<boolean>(resolve => {
        session.pendingQueue.push(promptUuid)
        session.pendingMessages.set(promptUuid, { resolve })
      })
      if (cancelled) {
        return { stopReason: 'cancelled' }
      }
    }

    if (session.cancelGeneration !== promptCancelGeneration) {
      return { stopReason: 'cancelled' }
    }

    // Reset cancellation only when this prompt is about to run. Queued prompts
    // must not clear the cancellation state for the active prompt.
    session.cancelled = false
    session.promptRunning = true

    try {
      // Reset the query engine's abort controller for a fresh query.
      // After a previous interrupt(), the internal controller is stuck in
      // aborted state — without this, submitMessage() fails immediately.
      session.queryEngine.resetAbortController()
      // Switch global session state so recordTranscript writes to the correct
      // session file. Without this, multi-session scenarios (or creating a new
      // session after another) write transcript data to the wrong file.
      switchSession(effectiveSessionId as SessionId, getSessionProjectDir())

      const sdkMessages = wrapSdkMessagesForInventoryBatch(
        session.queryEngine.submitMessage(promptInput),
      )

      const { stopReason, usage } = await forwardSessionUpdates(
        effectiveSessionId,
        sdkMessages,
        this.conn,
        session.queryEngine.getAbortSignal(),
        session.toolUseCache,
        this.clientCapabilities,
        session.cwd,
        () => session.cancelled,
      )

      // If the session was cancelled during processing, return cancelled
      if (session.cancelled) {
        return { stopReason: 'cancelled' }
      }

      return {
        stopReason,
        usage: usage
          ? {
              inputTokens: usage.inputTokens,
              outputTokens: usage.outputTokens,
              cachedReadTokens: usage.cachedReadTokens,
              cachedWriteTokens: usage.cachedWriteTokens,
              totalTokens:
                usage.inputTokens +
                usage.outputTokens +
                usage.cachedReadTokens +
                usage.cachedWriteTokens,
            }
          : undefined,
      }
    } catch (err: unknown) {
      if (session.cancelled) {
        return { stopReason: 'cancelled' }
      }

      // Check for process death errors
      if (
        err instanceof Error &&
        (err.message.includes('terminated') ||
          err.message.includes('process exited'))
      ) {
        this.teardownSession(effectiveSessionId)
        throw new Error(
          'The Claude Agent process exited unexpectedly. Please start a new session.',
        )
      }

      throw err
    } finally {
      // Resolve next pending prompt if any
      const nextPrompt = popNextPendingPrompt(session)
      if (nextPrompt) {
        session.promptRunning = true
        nextPrompt.resolve(false)
      } else {
        session.promptRunning = false
      }
    }
  }

  // ── cancel ────────────────────────────────────────────────────

  async cancel(params: CancelNotification): Promise<void> {
    const session = this.sessions.get(params.sessionId)
    if (!session) return

    // Set cancelled flag — checked by prompt() loop to break out
    session.cancelled = true
    session.cancelGeneration += 1

    // Cancel any queued prompts
    for (const [, pending] of session.pendingMessages) {
      pending.resolve(true)
    }
    session.pendingMessages.clear()
    session.pendingQueue = []
    session.pendingQueueHead = 0

    // Interrupt the query engine to abort the current API call
    session.queryEngine.interrupt()
  }

  // ── setSessionMode ──────────────────────────────────────────────

  async setSessionMode(
    params: SetSessionModeRequest,
  ): Promise<SetSessionModeResponse> {
    const { sessionId: effectiveSessionId } = this.resolveSessionRequest(
      params.sessionId,
    )

    this.applySessionMode(effectiveSessionId, params.modeId)
    await this.updateConfigOption(effectiveSessionId, 'mode', params.modeId)
    return {}
  }

  // ── setSessionModel ─────────────────────────────────────────────

  async unstable_setSessionModel(
    params: SetSessionModelRequest,
  ): Promise<SetSessionModelResponse> {
    const { session, sessionId: effectiveSessionId } = this.resolveSessionRequest(
      params.sessionId,
    )
    const modelId = params.modelId.trim()
    if (shouldExposeMiniMaxM3Variants() && resolveMiniMaxM3Variant(modelId)) {
      applyMiniMaxM3SessionModels(session, modelId)
    }

    this.rememberSessionModelPreference(effectiveSessionId, modelId)
    if (effectiveSessionId !== params.sessionId) {
      this.rememberSessionModelPreference(params.sessionId, modelId)
    }

    // Store the raw value — QueryEngine.submitMessage() calls
    // parseUserSpecifiedModel() to resolve aliases (e.g. "sonnet" → "glm-5.1-turbo")
    session.queryEngine.setModel(modelId)
    await this.updateConfigOption(effectiveSessionId, 'model', modelId)
    return {}
  }

  // ── setSessionConfigOption ──────────────────────────────────────

  async setSessionConfigOption(
    params: SetSessionConfigOptionRequest,
  ): Promise<SetSessionConfigOptionResponse> {
    const { session, sessionId: effectiveSessionId } = this.resolveSessionRequest(
      params.sessionId,
    )
    if (typeof params.value !== 'string') {
      throw new Error(
        `Invalid value for config option ${params.configId}: ${String(params.value)}`,
      )
    }

    const option = session.configOptions.find(o => o.id === params.configId)
    if (!option) {
      throw new Error(`Unknown config option: ${params.configId}`)
    }

    const value = params.value

    if (params.configId === 'mode') {
      this.applySessionMode(effectiveSessionId, value)
      await this.conn.sessionUpdate({
        sessionId: effectiveSessionId,
        update: {
          sessionUpdate: 'current_mode_update',
          currentModeId: value,
        },
      })
    } else if (params.configId === 'model') {
      if (shouldExposeMiniMaxM3Variants() && resolveMiniMaxM3Variant(value)) {
        applyMiniMaxM3SessionModels(session, value)
      }
      session.queryEngine.setModel(value)
      this.rememberSessionModelPreference(effectiveSessionId, value)
      if (effectiveSessionId !== params.sessionId) {
        this.rememberSessionModelPreference(params.sessionId, value)
      }
    }

    this.syncSessionConfigState(session, params.configId, value)

    session.configOptions = session.configOptions.map(o =>
      o.id === params.configId && typeof o.currentValue === 'string'
        ? { ...o, currentValue: value }
        : o,
    )

    return { configOptions: session.configOptions }
  }

  // ── Private helpers ─────────────────────────────────────────────

  private async createSession(
    params: NewSessionRequest,
    opts: {
      forceNewId?: boolean
      sessionId?: string
      initialMessages?: Message[]
    } = {},
  ): Promise<NewSessionResponse> {
    enableConfigs()

    const sessionId = opts.sessionId ?? randomUUID()
    const cwd = params.cwd

    // Align the global session state so that transcript persistence,
    // analytics, and cost tracking use the ACP session ID.
    // Preserve the projectDir set by getOrCreateSession so that
    // getSessionProjectDir() continues to resolve correctly.
    const currentProjectDir = getSessionProjectDir()
    switchSession(sessionId as SessionId, currentProjectDir)

    // Set CWD for the session
    setOriginalCwd(cwd)
    publishActiveWorkspace(cwd)
    const previousProcessCwd = process.cwd()
    let processCwdChanged = false
    try {
      process.chdir(cwd)
      processCwdChanged = true
    } catch {
      // CWD may not exist yet; best-effort
    }

    try {
      const meta = params._meta as Record<string, unknown> | null | undefined
      const resolvedProfile = resolveSessionProfileIdForCreate(meta, {
        consumeHandoff: true,
      })
      const sessionProfileId = resolvedProfile.profileId
      if (resolvedProfile.source === 'handoff') {
        console.info(
          `[ACP] session profile id from handoff: ${sessionProfileId}`,
        )
      } else if (resolvedProfile.source === 'meta') {
        console.info(
          `[ACP] session profile id from session meta: ${sessionProfileId}`,
        )
      } else if (resolvedProfile.source === 'default') {
        console.info(
          `[ACP] session profile id from default fallback: ${sessionProfileId}`,
        )
      }
      const resolvedSessionProfile = sessionProfileId
        ? resolveSessionProfile(sessionProfileId)
        : { profile: null, profileId: undefined, source: undefined }
      const assistantProfile = resolvedSessionProfile.profile
      if (resolvedSessionProfile.source === 'agent') {
        console.info(
          `[ACP] agent session profile applied: ${resolvedSessionProfile.profileId}`,
        )
      } else if (resolvedSessionProfile.source === 'assistant') {
        console.info(
          `[ACP] legacy assistant session profile applied: ${resolvedSessionProfile.profileId}`,
        )
      }
      if (sessionProfileId && !assistantProfile) {
        console.warn(
          `[ACP] session profile '${sessionProfileId}' not found under agents or assistants dir`,
        )
      }
      const presetContext =
        assistantProfile || sessionProfileId
          ? undefined
          : resolvePresetContextFromMeta(meta)

      // Build tools with a permissive permission context.
      const permissionContext = getEmptyToolPermissionContext()
      const baseTools: Tools = getTools(permissionContext)

      // Register MCP servers for this session. MCP tools must appear in the
      // tools[] array passed to QueryEngine (not just in mcpClients) so the
      // model can invoke them directly — see acp-session-flow.md § "Source vs
      // live dist".
      //
      // Load user MCP from CLAUDE_CONFIG_DIR/settings.json (quotation, accurate,
      // excel-mcp for CCB-Wanding), filtered by assistant profile allowlist.
      // AionUI dynamic servers (e.g. guide_mcp) merge via session/new params.
      //
      // Do NOT prefetch all settings MCPs unconditionally — excel-mcp COM startup
      // (~5s) blocked session/new. Lazy servers connect on first tool use via
      // memoized connectToServer. Sub-agents prefetch their own mcpServers on spawn.
      const mcpConfigs = omitLazySessionMcpServers(
        resolveSessionMcpConfigs(params, assistantProfile, sessionProfileId),
        { keepForProfile: assistantProfile?.defaults.mcp.enabled ?? [] },
      )
      const { clients: mcpClients, tools: mcpTools } =
        await prefetchAllMcpResources(mcpConfigs)
      const tools: Tools = [...baseTools, ...mcpTools]
      console.info(
        `[ACP] session mcp servers: ${Object.keys(mcpConfigs).join(', ') || '(none)'} profile=${sessionProfileId ?? '(none)'}`,
      )
      scheduleWanDMcpWarmup(sessionProfileId)

      // Parse permission mode from _meta (passed by RCS/acp-link) or settings.
      const hasMetaPermissionMode = hasOwnField(meta, 'permissionMode')
      const metaPermissionMode = hasMetaPermissionMode
        ? meta?.permissionMode
        : undefined
      const settingsPermissionMode = this.getSetting<string>(
        'permissions.defaultMode',
      )
      const assistantPermissionMode =
        !hasMetaPermissionMode && assistantProfile?.defaults.permission_mode
          ? assistantProfile.defaults.permission_mode
          : undefined
      const permissionMode = resolveSessionPermissionMode(
        metaPermissionMode ?? assistantPermissionMode,
        hasMetaPermissionMode || Boolean(assistantPermissionMode),
        settingsPermissionMode,
      )

      // Create the permission bridge canUseTool function
      const baseCanUseTool = createAcpCanUseTool(
        this.conn,
        sessionId,
        () => this.sessions.get(sessionId)?.modes.currentModeId ?? 'default',
        this.clientCapabilities,
        cwd,
        (modeId: string) => {
          this.applySessionMode(sessionId, modeId)
        },
        () =>
          this.sessions.get(sessionId)?.appState.toolPermissionContext
            .isBypassPermissionsModeAvailable ?? false,
      )
      const guardedCanUseTool = wrapCanUseToolWithRepeatGuard(
        baseCanUseTool,
        sessionId,
      )
      const canUseTool = isWandeOrchestratorSession(sessionProfileId)
        ? wrapCanUseToolForWandeOrchestrator(guardedCanUseTool)
        : guardedCanUseTool

      // ACP clients can expose bypass only when both the process and local config allow it.
      const isBypassAvailable = isAcpBypassPermissionModeAvailable(
        settingsPermissionMode,
      )

      // Create a mutable AppState for the session
      const appState: AppState = {
        ...getDefaultAppState(),
        toolPermissionContext: {
          ...permissionContext,
          mode: permissionMode as PermissionMode,
          isBypassPermissionsModeAvailable: isBypassAvailable,
        },
      }

      // Load commands and agent definitions for subagent support
      const bomRepaired = repairAgentMarkdownBomIfNeeded()
      if (bomRepaired.length > 0) {
        clearAgentDefinitionsCache()
      }
      const [allCommands, agentDefinitionsResult] = await Promise.all([
        getCommands(cwd),
        getAgentDefinitionsWithOverrides(cwd),
      ])
      const delegatableActiveAgents = filterDelegatableCustomAgents(
        agentDefinitionsResult.activeAgents,
        undefined,
        {
          orchestratorSession: isWandeOrchestratorSession(sessionProfileId),
        },
      )
      const specialistDirectSession = isSpecialistDirectSession(
        sessionProfileId,
        assistantProfile,
      )
      const sessionDelegatableAgents = specialistDirectSession
        ? []
        : delegatableActiveAgents
      const filteredAgentDefinitions = {
        ...agentDefinitionsResult,
        activeAgents: sessionDelegatableAgents,
      }
      const commands = filterCommandsForAssistantProfile(
        allCommands,
        assistantProfile,
      )

      const orchestratorSystemPrompt =
        sessionProfileId === getDefaultSessionAgentId()
          ? appendWanDDelegationIndex(
              assistantProfile?.instructions.system_prompt,
              sessionDelegatableAgents,
            )
          : assistantProfile?.instructions.system_prompt

      // Inject agent definitions into appState
      appState.agentDefinitions = filteredAgentDefinitions

      const userContextOverride = resolveSessionUserContextOverride({
        assistantProfile,
        sessionProfileId,
        presetContext,
      })

      // Build QueryEngine config
      const engineConfig: QueryEngineConfig = {
        cwd,
        tools,
        commands,
        mcpClients,
        agents: sessionDelegatableAgents,
        canUseTool,
        getAppState: () => appState,
        setAppState: (updater: (prev: AppState) => AppState) => {
          const updated = updater(appState)
          Object.assign(appState, updated)
        },
        readFileCache: new FileStateCache(500, 50 * 1024 * 1024),
        includePartialMessages: true,
        replayUserMessages: true,
        initialMessages: opts.initialMessages,
        ...(orchestratorSystemPrompt
          ? { customSystemPrompt: orchestratorSystemPrompt }
          : {}),
        ...(userContextOverride ? { userContextOverride } : {}),
        ...(assistantProfile?.defaults.model
          ? { userSpecifiedModel: assistantProfile.defaults.model }
          : {}),
      }

      const profileModel = assistantProfile?.defaults.model ?? null
      const preferredSessionModel = this.resolveSessionPreferredModelId(
        sessionId,
        profileModel,
      )
      if (preferredSessionModel && !assistantProfile?.defaults.model) {
        engineConfig.userSpecifiedModel = preferredSessionModel
      }

      const queryEngine = new QueryEngine(engineConfig)

      // Build modes — bypassPermissions is opt-in for ACP clients.
      const availableModes = [
        {
          id: 'default',
          name: 'Default',
          description: 'Standard behavior, prompts for dangerous operations',
        },
        {
          id: 'acceptEdits',
          name: 'Accept Edits',
          description: 'Auto-accept file edit operations',
        },
        {
          id: 'plan',
          name: 'Plan Mode',
          description: 'Planning mode, no actual tool execution',
        },
        {
          id: 'auto',
          name: 'Auto',
          description:
            'Use a model classifier to approve/deny permission prompts.',
        },
        ...(isBypassAvailable
          ? [
              {
                id: 'bypassPermissions' as const,
                name: 'Bypass Permissions',
                description: 'Skip all permission checks',
              },
            ]
          : []),
        {
          id: 'dontAsk',
          name: "Don't Ask",
          description: "Don't prompt for permissions, deny if not pre-approved",
        },
      ]

      const modes: SessionModeState = {
        currentModeId: permissionMode,
        availableModes,
      }

      // Build models — MiniMax sessions expose CCB variant ids, not effort tiers
      const modelOptions = getModelOptions()
      const currentModel = getMainLoopModel()
      const rawModelId = preferredSessionModel || currentModel
      const models: SessionModelState = shouldExposeMiniMaxM3Variants()
        ? buildMiniMaxM3SessionModels(rawModelId)
        : {
            availableModels: modelOptions.map(m => ({
              modelId: String(m.value ?? ''),
              name: m.label ?? String(m.value ?? ''),
              description: m.description ?? undefined,
            })),
            currentModelId: rawModelId,
          }

      // Set the model on the engine
      queryEngine.setModel(models.currentModelId)

      // Build config options
      const configOptions = buildConfigOptions(modes, models)

      const session: AcpSession = {
        queryEngine,
        cancelled: false,
        cancelGeneration: 0,
        cwd,
        modes,
        models,
        configOptions,
        promptRunning: false,
        pendingMessages: new Map(),
        pendingQueue: [],
        pendingQueueHead: 0,
        toolUseCache: {},
        clientCapabilities: this.clientCapabilities,
        appState,
        commands,
        sessionCreateParams: {
          mcpServers: params.mcpServers,
          _meta: params._meta,
        },
        sessionFingerprint: computeSessionFingerprint({
          cwd,
          mcpServers: params.mcpServers as
            | Array<{ name: string; [key: string]: unknown }>
            | undefined,
          profileId: sessionProfileId,
        }),
        appliedProfileId: sessionProfileId,
      }

      this.sessions.set(sessionId, session)

      return {
        sessionId,
        models,
        modes,
        configOptions,
      }
    } finally {
      if (processCwdChanged) {
        process.chdir(previousProcessCwd)
      }
    }
  }

  private async getOrCreateSession(params: {
    sessionId: string
    cwd: string
    mcpServers?: NewSessionRequest['mcpServers']
    _meta?: NewSessionRequest['_meta']
  }): Promise<NewSessionResponse> {
    const meta = params._meta as Record<string, unknown> | null | undefined
    const { profileId: requestedProfileId } = resolveSessionProfileIdForCreate(
      meta,
      { consumeHandoff: false },
    )
    const existingSession = this.sessions.get(params.sessionId)
    if (existingSession) {
      const fingerprint = computeSessionFingerprint({
        cwd: params.cwd,
        mcpServers: params.mcpServers as
          | Array<{ name: string; [key: string]: unknown }>
          | undefined,
        profileId: requestedProfileId,
      })
      if (fingerprint === existingSession.sessionFingerprint) {
        const resolved = await resolveSessionFilePath(
          params.sessionId,
          params.cwd,
        )
        switchSession(
          params.sessionId as SessionId,
          resolved ? dirname(resolved.filePath) : null,
        )
        setOriginalCwd(params.cwd)
        publishActiveWorkspace(params.cwd)

        await this.replaySessionHistory(params)

        // Reused in-memory sessions may still carry legacy effort-tier model
        // lists from an older CCB build — refresh before aioncore caches them.
        const configModelOption = existingSession.configOptions.find(
          o => o.id === 'model',
        )
        const configModel =
          typeof configModelOption?.currentValue === 'string'
            ? configModelOption.currentValue
            : ''
        const modelSeed = configModel || existingSession.models.currentModelId
        if (configModel) {
          this.rememberSessionModelPreference(params.sessionId, configModel)
        }
        if (shouldExposeMiniMaxM3Variants()) {
          applyMiniMaxM3SessionModels(existingSession, modelSeed)
        }

        return {
          sessionId: params.sessionId,
          modes: existingSession.modes,
          models: existingSession.models,
          configOptions: existingSession.configOptions,
        }
      }

      await this.teardownSession(params.sessionId)
    }

    // Locate the session file by sessionId across all project directories.
    // params.cwd may not match the project directory where the session was
    // originally created (e.g. client sends a subdirectory path), so we
    // search by sessionId first and fall back to cwd-based lookup.
    const resolved = await resolveSessionFilePath(params.sessionId, params.cwd)
    const projectDir = resolved ? dirname(resolved.filePath) : null
    switchSession(params.sessionId as SessionId, projectDir)
    setOriginalCwd(params.cwd)
    publishActiveWorkspace(params.cwd)

    let initialMessages: Message[] | undefined
    if (resolved) {
      try {
        const log = await getLastSessionLog(params.sessionId as UUID)
        if (log && log.messages.length > 0) {
          const diskMessages = deserializeMessages(log.messages)
          initialMessages = trimMessagesToCompleteTurnBoundary(diskMessages)
          if (initialMessages.length !== diskMessages.length) {
            console.warn(
              `[ACP] trimmed incomplete transcript tail sessionId=${params.sessionId} kept=${initialMessages.length} dropped=${diskMessages.length - initialMessages.length}`,
            )
          }
        }
      } catch (err) {
        console.error('[ACP] Failed to load session history:', err)
      }
    }

    const response = await this.createSession(
      {
        cwd: params.cwd,
        mcpServers: params.mcpServers ?? [],
        _meta: params._meta,
      },
      { sessionId: params.sessionId, initialMessages },
    )

    // Replay history to client if loaded
    if (initialMessages && initialMessages.length > 0) {
      const session = this.sessions.get(params.sessionId)
      if (session) {
        await replayHistoryMessages(
          params.sessionId,
          initialMessages as unknown as Array<Record<string, unknown>>,
          this.conn,
          session.toolUseCache,
          this.clientCapabilities,
          session.cwd,
        )
      }
    }

    return {
      sessionId: response.sessionId,
      modes: response.modes,
      models: response.models,
      configOptions: response.configOptions,
    }
  }

  private async teardownSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId)
    if (!session) return

    await this.cancel({ sessionId })
    resetToolCallRepeatState(sessionId)
    this.sessions.delete(sessionId)
  }

  /**
   * Load session history from disk and replay it to the ACP client.
   * Used when switching back to a session that is already in memory
   * (the client needs the conversation replayed to display it).
   */
  private async replaySessionHistory(params: {
    sessionId: string
    cwd: string
  }): Promise<void> {
    try {
      const log = await getLastSessionLog(params.sessionId as UUID)
      if (!log || log.messages.length === 0) return
      const diskMessages = deserializeMessages(log.messages)
      const messages = trimMessagesToCompleteTurnBoundary(diskMessages)
      if (messages.length !== diskMessages.length) {
        console.warn(
          `[ACP] trimmed incomplete replay tail sessionId=${params.sessionId} kept=${messages.length} dropped=${diskMessages.length - messages.length}`,
        )
      }
      if (messages.length === 0) return

      const session = this.sessions.get(params.sessionId)
      if (!session) return

      await replayHistoryMessages(
        params.sessionId,
        messages as unknown as Array<Record<string, unknown>>,
        this.conn,
        session.toolUseCache,
        this.clientCapabilities,
        session.cwd,
      )
    } catch (err) {
      console.error('[ACP] Failed to replay session history:', err)
    }
  }

  private applySessionMode(sessionId: string, modeId: string): void {
    if (!isPermissionMode(modeId)) {
      throw new Error(`Invalid mode: ${modeId}`)
    }
    const session = this.sessions.get(sessionId)
    if (session) {
      if (
        modeId === 'bypassPermissions' &&
        !session.appState.toolPermissionContext.isBypassPermissionsModeAvailable
      ) {
        throw new Error(`Mode not available: ${modeId}`)
      }
      const isAvailable = session.modes.availableModes.some(
        mode => mode.id === modeId,
      )
      if (!isAvailable) {
        throw new Error(`Mode not available: ${modeId}`)
      }

      session.modes = { ...session.modes, currentModeId: modeId }
      // Sync mode to appState so the permission pipeline sees the correct mode
      session.appState.toolPermissionContext = {
        ...session.appState.toolPermissionContext,
        mode: modeId as PermissionMode,
      }
    }
  }

  private async updateConfigOption(
    sessionId: string,
    configId: string,
    value: string,
  ): Promise<void> {
    const session = this.sessions.get(sessionId)
    if (!session) return

    this.syncSessionConfigState(session, configId, value)

    session.configOptions = session.configOptions.map(o =>
      o.id === configId && typeof o.currentValue === 'string'
        ? { ...o, currentValue: value }
        : o,
    )

    await this.conn.sessionUpdate({
      sessionId,
      update: {
        sessionUpdate: 'config_option_update',
        configOptions: session.configOptions,
      },
    })
  }

  private syncSessionConfigState(
    session: AcpSession,
    configId: string,
    value: string,
  ): void {
    if (configId === 'mode') {
      session.modes = { ...session.modes, currentModeId: value }
    } else if (configId === 'model') {
      session.models = { ...session.models, currentModelId: value }
    }
  }

  private async sendAvailableCommandsUpdate(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId)
    if (!session) return

    const payload = buildAvailableCommandsUpdatePayload(session.commands)

    await this.conn.sessionUpdate({
      sessionId,
      update: {
        sessionUpdate: 'available_commands_update',
        availableCommands: payload.availableCommands,
        _meta: payload._meta,
      },
    })
  }

  private scheduleAvailableCommandsUpdate(sessionId: string): void {
    setTimeout(() => {
      void this.sendAvailableCommandsUpdate(sessionId).catch(err => {
        console.error('[ACP] Failed to send available commands update:', err)
      })
    }, 0)
  }

  /** Read a setting from Claude config (simplified — no file watching) */
  private getSetting<T>(key: string): T | undefined {
    const settings = getSettings_DEPRECATED() as Record<string, unknown>
    const value = key.split('.').reduce<unknown>((current, segment) => {
      if (!current || typeof current !== 'object') return undefined
      return (current as Record<string, unknown>)[segment]
    }, settings)
    return value as T | undefined
  }
}

// ── Helpers ────────────────────────────────────────────────────────

const permissionModeIds: readonly PermissionMode[] = [
  'auto',
  'default',
  'acceptEdits',
  'bypassPermissions',
  'dontAsk',
  'plan',
]

function isPermissionMode(modeId: string): modeId is PermissionMode {
  return (permissionModeIds as readonly string[]).includes(modeId)
}

function resolveSessionPermissionMode(
  metaMode: unknown,
  hasMetaMode: boolean,
  settingsMode: unknown,
): PermissionMode {
  if (hasMetaMode) {
    const metaResolved = resolveRequiredPermissionMode(
      metaMode,
      '_meta.permissionMode',
    )
    if (
      metaResolved === 'bypassPermissions' &&
      !isAcpBypassPermissionModeAvailable(settingsMode)
    ) {
      throw new Error(
        'Mode not available: bypassPermissions requires a local ACP bypass opt-in.',
      )
    }

    return metaResolved
  }

  const settingsResolved = resolveConfiguredPermissionMode(settingsMode)
  return settingsResolved ?? 'default'
}

function resolveRequiredPermissionMode(
  mode: unknown,
  source: string,
): PermissionMode {
  if (mode === undefined || mode === null) {
    throw new Error(`Invalid ${source}: expected a string.`)
  }

  return resolvePermissionMode(mode, source) as PermissionMode
}

function resolveConfiguredPermissionMode(
  mode: unknown,
): PermissionMode | undefined {
  if (mode === undefined || mode === null) return undefined

  try {
    return resolvePermissionMode(
      mode,
      'permissions.defaultMode',
    ) as PermissionMode
  } catch (err: unknown) {
    const reason = err instanceof Error ? err.message : String(err)
    console.error(
      '[ACP] Invalid permissions.defaultMode, using default:',
      reason,
    )
    return undefined
  }
}

function hasOwnField(
  value: Record<string, unknown> | null | undefined,
  key: string,
): boolean {
  return !!value && Object.hasOwn(value, key)
}

function isAcpBypassPermissionModeAvailable(settingsMode?: unknown): boolean {
  return (
    isProcessBypassPermissionModeAvailable() &&
    (isAcpBypassLocallyEnabled() ||
      isSettingsBypassPermissionMode(settingsMode))
  )
}

function isProcessBypassPermissionModeAvailable(): boolean {
  if (process.env.IS_SANDBOX) return true
  if (typeof process.geteuid === 'function') return process.geteuid() !== 0
  if (typeof process.getuid === 'function') return process.getuid() !== 0
  return true
}

function isAcpBypassLocallyEnabled(): boolean {
  return (
    process.env.ACP_PERMISSION_MODE === 'bypassPermissions' ||
    isTruthyEnv(process.env.CLAUDE_CODE_ACP_ALLOW_BYPASS_PERMISSIONS)
  )
}

function isSettingsBypassPermissionMode(settingsMode: unknown): boolean {
  try {
    return resolvePermissionMode(settingsMode) === 'bypassPermissions'
  } catch {
    return false
  }
}

function isTruthyEnv(value: string | undefined): boolean {
  return value === '1' || value?.toLowerCase() === 'true'
}

function popNextPendingPrompt(session: AcpSession): PendingPrompt | undefined {
  while (session.pendingQueueHead < session.pendingQueue.length) {
    const nextId = session.pendingQueue[session.pendingQueueHead++]
    if (!nextId) continue
    const next = session.pendingMessages.get(nextId)
    if (!next) continue
    session.pendingMessages.delete(nextId)
    compactPendingQueue(session)
    return next
  }

  compactPendingQueue(session)
  return undefined
}

function compactPendingQueue(session: AcpSession): void {
  if (session.pendingQueueHead === 0) return

  if (session.pendingQueueHead >= session.pendingQueue.length) {
    session.pendingQueue = []
    session.pendingQueueHead = 0
    return
  }

  if (
    session.pendingQueueHead > 1024 &&
    session.pendingQueueHead * 2 > session.pendingQueue.length
  ) {
    session.pendingQueue = session.pendingQueue.slice(session.pendingQueueHead)
    session.pendingQueueHead = 0
  }
}

function normalizeMiniMaxM3SessionModelId(modelId: string): string {
  const trimmed = modelId.trim()
  const lower = trimmed.toLowerCase()
  if (lower === 'minimax-m3-thinking') {
    return 'minimax-m3-thinking'
  }
  const slash = lower.indexOf('/')
  const base = slash === -1 ? lower : lower.slice(0, slash)
  if (base === 'minimax-m3-thinking') {
    return 'minimax-m3-thinking'
  }
  const variant = resolveMiniMaxM3Variant(trimmed)
  if (variant) {
    return variant.thinking.type === 'adaptive'
      ? 'minimax-m3-thinking'
      : 'minimax-m3'
  }
  if (lower.includes('minimax')) {
    return 'minimax-m3'
  }
  return trimmed
}

function buildMiniMaxM3SessionModels(currentModelId: string): SessionModelState {
  const availableModels = getMiniMaxM3ModelOptions().map(m => ({
    modelId: m.value,
    name: m.label,
    description: m.description,
  }))
  const normalized = normalizeMiniMaxM3SessionModelId(currentModelId)
  const resolvedCurrent = availableModels.some(m => m.modelId === normalized)
    ? normalized
    : (availableModels[0]?.modelId ?? 'minimax-m3')
  return { availableModels, currentModelId: resolvedCurrent }
}

function applyMiniMaxM3SessionModels(
  session: AcpSession,
  modelId: string,
): void {
  session.models = buildMiniMaxM3SessionModels(modelId)
  session.configOptions = buildConfigOptions(session.modes, session.models)
}

function buildConfigOptions(
  modes: SessionModeState,
  models: SessionModelState,
): SessionConfigOption[] {
  return [
    {
      id: 'mode',
      name: 'Mode',
      description: 'Session permission mode',
      category: 'mode',
      type: 'select' as const,
      currentValue: modes.currentModeId,
      options: modes.availableModes.map(
        (m: SessionModeState['availableModes'][number]) => ({
          value: m.id,
          name: m.name,
          description: m.description,
        }),
      ),
    },
    {
      id: 'model',
      name: 'Model',
      description: 'AI model to use',
      category: 'model',
      type: 'select' as const,
      currentValue: models.currentModelId,
      options: models.availableModels.map(
        (m: SessionModelState['availableModels'][number]) => ({
          value: m.modelId,
          name: m.name,
          description: m.description ?? undefined,
        }),
      ),
    },
  ] as SessionConfigOption[]
}
