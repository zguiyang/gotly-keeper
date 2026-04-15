import { describe, it, expect } from 'vitest'
import { listAssets, listLinkAssets, listNoteAssets, listTodoAssets } from '../../../../server/assets/assets.query'

describe('assets.query', () => {
  describe('listAssets', () => {
    it('is a function', () => {
      expect(typeof listAssets).toBe('function')
    })
  })

  describe('listLinkAssets', () => {
    it('is a function', () => {
      expect(typeof listLinkAssets).toBe('function')
    })
  })

  describe('listNoteAssets', () => {
    it('is a function', () => {
      expect(typeof listNoteAssets).toBe('function')
    })
  })

  describe('listTodoAssets', () => {
    it('is a function', () => {
      expect(typeof listTodoAssets).toBe('function')
    })
  })
})
