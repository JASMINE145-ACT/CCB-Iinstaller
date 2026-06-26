import { join, resolve } from 'path'

export const INSTALLER_DIR = resolve(import.meta.dir, '../..')
export const DATA_DIR = join(INSTALLER_DIR, 'web-data')
export const SESSIONS_FILE = join(DATA_DIR, 'sessions.json')
export const STATIC_DIR =
  process.env.CCB_WEB_DIST ||
  resolve(INSTALLER_DIR, '..', 'ccb-wanding-web', 'dist')

export const CCB_STAGE = process.env.CCB_STAGE || 'minimax'
export const FAKE_REPLY = '你好，我是 CCB-Wanding。'
export const MODEL =
  process.env.ANTHROPIC_DEFAULT_SONNET_MODEL || 'minimax-m3'
export const API_BASE = process.env.ANTHROPIC_BASE_URL || 'https://api.minimaxi.com/anthropic'

export const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-user-id',
}

export function enableMcpForStage(stage = CCB_STAGE) {
  return stage === 'agent'
}

export {}
