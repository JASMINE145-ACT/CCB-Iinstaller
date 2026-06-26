import { MODEL } from './config.js'

export function authUser() {
  return {
    id: 'system_default_user',
    name: 'CCB-Wanding User',
    email: 'local@ccb-wanding',
  }
}

export function agentsList() {
  return [
    {
      id: 'ccb-wanding',
      name: 'CCB-Wanding',
      agent_type: 'aionrs',
      handshake: {
        available_models: {
          current_model_id: MODEL,
          models: [{ id: MODEL, name: MODEL }],
        },
      },
    },
  ]
}

export function providersList() {
  return [
    {
      id: 'ccb-wanding',
      name: 'CCB-Wanding',
      models: [MODEL],
      model_enabled: { [MODEL]: true },
      model_protocols: { [MODEL]: 'anthropic' },
    },
  ]
}

export function clientSettings() {
  return {
    aionrs: {
      defaultModel: { id: 'ccb-wanding', use_model: MODEL },
      config: { preferredMode: 'default' },
    },
    acp: {
      config: {
        'ccb-wanding': { preferredModelId: MODEL },
      },
    },
  }
}

export function emptyArrayStub() {
  return []
}

export function emptyObjectStub() {
  return {}
}

export {}
