import {
  getCommandName,
  isCommandEnabled,
  type Command,
} from '../../types/command.js'

export type CapabilitySource = 'ccb-wanding'

export type CapabilityExecution =
  | 'backend_prompt'
  | 'backend_local'
  | 'backend_local_jsx'

export type CapabilityStatus = 'ready' | 'needs_mapping' | 'hidden'

export type CcbCapability = {
  id: string
  title: string
  description: string
  source: CapabilitySource
  kind: 'slash_command'
  execution: CapabilityExecution
  status: CapabilityStatus
  commandName: string
  commandType: Command['type']
  userInvocable: boolean
  hidden: boolean
  reason?: string
  inputHint?: string
}

export type AvailableCommandPayload = {
  name: string
  description: string
  input?: { hint: string }
  _meta?: {
    capability: {
      source: CapabilitySource
      status: CapabilityStatus
      execution: CapabilityExecution
      commandType: Command['type']
      reason?: string
    }
  }
}

export type AvailableCommandsUpdatePayload = {
  availableCommands: AvailableCommandPayload[]
  _meta: {
    capabilities: CcbCapability[]
  }
}

function resolveExecution(command: Command): CapabilityExecution {
  switch (command.type) {
    case 'prompt':
      return 'backend_prompt'
    case 'local':
      return 'backend_local'
    case 'local-jsx':
      return 'backend_local_jsx'
  }
}

function resolveStatus(command: Command): CapabilityStatus {
  const hidden = command.isHidden ?? false
  const userInvocable = command.userInvocable !== false

  if (hidden || !userInvocable) {
    return 'hidden'
  }

  if (command.type === 'local-jsx') {
    return 'needs_mapping'
  }

  return 'ready'
}

function resolveReason(
  command: Command,
  status: CapabilityStatus,
): string | undefined {
  if (status === 'hidden') {
    return command.isHidden ? 'hidden' : 'not_user_invocable'
  }
  if (status === 'needs_mapping' && command.type === 'local-jsx') {
    return 'requires_renderer_ui'
  }
  return undefined
}

export function buildCcbCapabilities(commands: readonly Command[]): CcbCapability[] {
  return commands
    .filter(isCommandEnabled)
    .map(command => {
      const commandName = getCommandName(command)
      const status = resolveStatus(command)
      const execution = resolveExecution(command)
      const hidden = command.isHidden ?? false
      const userInvocable = command.userInvocable !== false

      return {
        id: `slash:${commandName}`,
        title: commandName,
        description: command.description,
        source: 'ccb-wanding' as const,
        kind: 'slash_command' as const,
        execution,
        status,
        commandName,
        commandType: command.type,
        userInvocable,
        hidden,
        reason: resolveReason(command, status),
        ...(command.argumentHint ? { inputHint: command.argumentHint } : {}),
      }
    })
}

export function toAvailableCommandsUpdatePayload(
  capabilities: readonly CcbCapability[],
): AvailableCommandsUpdatePayload {
  const userVisible = capabilities.filter(capability => capability.status !== 'hidden')

  return {
    availableCommands: userVisible.map(capability => ({
      name: capability.commandName,
      description: capability.description,
      ...(capability.inputHint ? { input: { hint: capability.inputHint } } : {}),
      _meta: {
        capability: {
          source: capability.source,
          status: capability.status,
          execution: capability.execution,
          commandType: capability.commandType,
          ...(capability.reason ? { reason: capability.reason } : {}),
        },
      },
    })),
    _meta: {
      capabilities: [...capabilities],
    },
  }
}

export function buildAvailableCommandsUpdatePayload(
  commands: readonly Command[],
): AvailableCommandsUpdatePayload {
  return toAvailableCommandsUpdatePayload(buildCcbCapabilities(commands))
}
