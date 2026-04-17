import { describe, expect, it, vi } from 'vitest'

import { createAssetRecord } from '@/server/services/assets/create-asset-record'

describe('createAssetRecord', () => {
  it('throws EMPTY_INPUT and skips validate/insert when text is blank', async () => {
    const validate = vi.fn()
    const insert = vi.fn()

    await expect(
      createAssetRecord({
        text: '   ',
        validate,
        insert,
        map: (row) => row,
      })
    ).rejects.toThrow('EMPTY_INPUT')

    expect(validate).not.toHaveBeenCalled()
    expect(insert).not.toHaveBeenCalled()
  })

  it('propagates validate error and skips insert', async () => {
    const validate = vi.fn(() => {
      throw new Error('VALIDATION_FAILED')
    })
    const insert = vi.fn()

    await expect(
      createAssetRecord({
        text: ' task ',
        validate,
        insert,
        map: (row) => row,
      })
    ).rejects.toThrow('VALIDATION_FAILED')

    expect(validate).toHaveBeenCalledWith('task')
    expect(insert).not.toHaveBeenCalled()
  })

  it('runs validate -> insert -> map with trimmed text', async () => {
    const steps: string[] = []
    const validate = vi.fn((trimmedText: string) => {
      steps.push(`validate:${trimmedText}`)
    })
    const insert = vi.fn(async (trimmedText: string) => {
      steps.push(`insert:${trimmedText}`)
      return { id: 'r1', originalText: trimmedText }
    })
    const map = vi.fn((row: { id: string; originalText: string }) => {
      steps.push(`map:${row.id}`)
      return { id: row.id, title: row.originalText }
    })

    const result = await createAssetRecord({
      text: '  hello  ',
      validate,
      insert,
      map,
    })

    expect(result).toEqual({ id: 'r1', title: 'hello' })
    expect(steps).toEqual(['validate:hello', 'insert:hello', 'map:r1'])
  })
})
