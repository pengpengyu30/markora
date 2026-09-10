import { describe, expect, it } from 'vitest'
import { areGitFeaturesEnabled } from './gitFeatureState'

describe('git feature state', () => {
  it('keeps Git disabled when the setting is missing or false', () => {
    expect(areGitFeaturesEnabled({ git_enabled: null })).toBe(false)
    expect(areGitFeaturesEnabled({ git_enabled: false })).toBe(false)
    expect(areGitFeaturesEnabled({})).toBe(false)
  })

  it('enables Git only for an explicit true setting', () => {
    expect(areGitFeaturesEnabled({ git_enabled: true })).toBe(true)
  })
})
