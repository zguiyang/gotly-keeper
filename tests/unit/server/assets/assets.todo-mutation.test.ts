import { describe, it, expect } from 'vitest'
import { setTodoCompletion } from '../../../../server/assets/assets.todo-mutation'

describe('assets.todo-mutation', () => {
  describe('setTodoCompletion', () => {
    it('is a function', () => {
      expect(typeof setTodoCompletion).toBe('function')
    })
  })
})
