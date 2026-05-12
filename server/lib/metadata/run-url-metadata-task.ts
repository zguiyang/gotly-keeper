import 'server-only'

import { fetchUrlMetadata } from './fetch-url-metadata'

import type { UrlMetadataTask, UrlMetadataTaskResult } from './url-metadata-task.contract'

export async function runUrlMetadataTask(task: UrlMetadataTask): Promise<UrlMetadataTaskResult> {
  try {
    const metadata = await fetchUrlMetadata(task.url)

    return {
      taskId: task.taskId,
      success: true,
      data: {
        finalUrl: metadata.finalUrl,
        title: metadata.title,
        icon: metadata.icon,
        description: metadata.description,
      },
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    const fetchHttpMatch = /^FETCH_HTTP_(\d+)$/.exec(errorMessage)

    return {
      taskId: task.taskId,
      success: false,
      error: {
        code: fetchHttpMatch ? 'FETCH_HTTP_ERROR' : (
          error instanceof Error &&
          (error.message === 'FETCH_TOO_LARGE' ||
            error.message === 'PRIVATE_URL_BLOCKED' ||
            error.message === 'INVALID_URL' ||
            error.message === 'TOO_MANY_REDIRECTS' ||
            error.message === 'REDIRECT_LOCATION_MISSING' ||
            error.message === 'UNSUPPORTED_CONTENT_TYPE')
            ? error.message
            : 'ENRICH_FAILED'
        ),
        message: fetchHttpMatch ? `failed to fetch page with status ${fetchHttpMatch[1]}` : errorMessage,
        retryable: false,
      },
    }
  }
}
