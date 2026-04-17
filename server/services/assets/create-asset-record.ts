import 'server-only'

type CreateAssetRecordOptions<TRow, TResult> = {
  text: string
  validate?: (trimmedText: string) => void | Promise<void>
  insert: (trimmedText: string) => Promise<TRow>
  map: (row: TRow) => TResult
}

export async function createAssetRecord<TRow, TResult>({
  text,
  validate,
  insert,
  map,
}: CreateAssetRecordOptions<TRow, TResult>): Promise<TResult> {
  const trimmedText = text.trim()

  if (!trimmedText) {
    throw new Error('EMPTY_INPUT')
  }

  if (validate) {
    await validate(trimmedText)
  }

  const createdRow = await insert(trimmedText)
  return map(createdRow)
}
