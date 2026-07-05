import { describe, expect, it } from 'bun:test'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import {
  appendEmployeeProfileToUserContext,
  CCB_EMPLOYEE_PROFILE_FILE,
  derivePreferredAddressName,
  formatEmployeeProfileClaudeMd,
  mergeEmployeeProfileIntoResolvedUserContext,
  readEmployeeProfile,
} from '../employeeProfile.js'

describe('employeeProfile', () => {
  it('derives 嘉诚 from 祐嘉诚', () => {
    expect(derivePreferredAddressName({ displayName: '祐嘉诚' })).toBe('嘉诚')
  })

  it('format includes addressing instructions', () => {
    const md = formatEmployeeProfileClaudeMd({ displayName: '祐嘉诚' })
    expect(md).toContain('优先用「嘉诚」')
  })

  it('reads profile from config dir json file', () => {
    const configDir = mkdtempSync(join(tmpdir(), 'ccb-employee-profile-'))
    writeFileSync(
      join(configDir, CCB_EMPLOYEE_PROFILE_FILE),
      JSON.stringify({ displayName: 'Alice', department: 'IT' }),
      'utf8',
    )
    expect(readEmployeeProfile(configDir)?.displayName).toBe('Alice')
  })

  it('ignores cleared profile marker file', () => {
    const configDir = mkdtempSync(join(tmpdir(), 'ccb-employee-cleared-'))
    writeFileSync(
      join(configDir, CCB_EMPLOYEE_PROFILE_FILE),
      JSON.stringify({ cleared_at: new Date().toISOString() }),
      'utf8',
    )
    expect(readEmployeeProfile(configDir)).toBeNull()
  })

  it('appends employee block to existing user context', () => {
    const configDir = mkdtempSync(join(tmpdir(), 'ccb-employee-merge-'))
    writeFileSync(
      join(configDir, CCB_EMPLOYEE_PROFILE_FILE),
      JSON.stringify({ displayName: '王五', jobTitle: '专员' }),
      'utf8',
    )
    const merged = appendEmployeeProfileToUserContext(
      { claudeMd: '# Specialist', currentDate: 'Today' },
      configDir,
    )
    expect(merged?.claudeMd).toContain('# Specialist')
    expect(merged?.claudeMd).toContain('王五')
  })

  it('merge is idempotent when marker already present', () => {
    const configDir = mkdtempSync(join(tmpdir(), 'ccb-employee-idem-'))
    writeFileSync(
      join(configDir, CCB_EMPLOYEE_PROFILE_FILE),
      JSON.stringify({ displayName: '祐嘉诚' }),
      'utf8',
    )
    const once = mergeEmployeeProfileIntoResolvedUserContext(
      { currentDate: 'Today' },
      configDir,
    )
    const twice = mergeEmployeeProfileIntoResolvedUserContext(once, configDir)
    expect(twice?.claudeMd).toBe(once?.claudeMd)
    expect(twice?.claudeMd?.match(/# 当前用户 \/ Current user/g)?.length).toBe(
      1,
    )
  })

  it('merge works when omitClaudeMd left only currentDate', () => {
    const configDir = mkdtempSync(join(tmpdir(), 'ccb-employee-omit-'))
    writeFileSync(
      join(configDir, CCB_EMPLOYEE_PROFILE_FILE),
      JSON.stringify({ displayName: '祐嘉诚' }),
      'utf8',
    )
    const merged = mergeEmployeeProfileIntoResolvedUserContext(
      { currentDate: "Today's date is 2026-07-05." },
      configDir,
    )
    expect(merged?.currentDate).toContain('2026-07-05')
    expect(merged?.claudeMd).toContain('优先用「嘉诚」')
  })
})
