export type PageInfo = {
  pageSize: number
  nextCursor: string | null
  hasNextPage: boolean
}

export type PaginatedResult<T> = {
  items: T[]
  pageInfo: PageInfo
}
