export type UrlMetadataTask = {
  taskId: string
  url: string
  traceId: string
  createdAt: string
}

export type UrlMetadataTaskResult = {
  taskId: string
  success: boolean
  data?: {
    finalUrl: string
    title: string | null
    icon: string | null
    description: string | null
  }
  error?: {
    code: string
    message: string
    retryable: false
  }
}
