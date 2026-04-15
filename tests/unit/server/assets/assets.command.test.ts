import { describe, it, expect } from 'vitest'
import { createAsset } from '../../../../server/assets/assets.command'

describe('assets.command', () => {
  describe('createAsset', () => {
    it('is a function', () => {
      expect(typeof createAsset).toBe('function')
    })
  })
})
