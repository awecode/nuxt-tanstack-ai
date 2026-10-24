import { createGeminiChat } from '@tanstack/ai-gemini'

type GeminiChatModel = Parameters<typeof createGeminiChat>[0]

/**
 * Gemini chat adapter for Vertex AI through Cloudflare AI Gateway. The Google
 * service account is stored in the gateway (Provider Keys), so the app sends
 * no Google credential. Pass extra gateway headers (`cf-aig-skip-cache`,
 * `cf-aig-metadata`, ...) in `options.headers`.
 */
export function createVertexGatewayChat<TModel extends GeminiChatModel>(model: TModel, options: { headers?: Record<string, string> } = {}) {
  const { ai, cloudflare } = useRuntimeConfig()
  if (!cloudflare.accountId || !cloudflare.token || !ai.gatewayId || !ai.vertexProjectId)
    throw new Error('Vertex AI Gateway is not configured. Set NUXT_CLOUDFLARE_ACCOUNT_ID, NUXT_CLOUDFLARE_TOKEN, NUXT_AI_GATEWAY_ID and NUXT_AI_VERTEX_PROJECT_ID.')

  // The Workers build of @google/genai requires an API key and rejects
  // project and location, so the project path goes in the base URL and the
  // placeholder key is removed before the request is sent.
  return createGeminiChat(model, 'gateway', {
    vertexai: true,
    httpOptions: {
      baseUrl: `https://gateway.ai.cloudflare.com/v1/${cloudflare.accountId}/${ai.gatewayId}/google-vertex-ai/v1/projects/${ai.vertexProjectId}/locations/${ai.vertexLocation || 'global'}`,
      apiVersion: '',
      headers: {
        'cf-aig-authorization': `Bearer ${cloudflare.token}`,
        'x-goog-user-project': ai.vertexProjectId,
        ...options.headers,
      },
      fetch: (input, init = {}) => {
        const headers = new Headers(init.headers)
        headers.delete('x-goog-api-key')
        return fetch(input, { ...init, headers })
      },
    },
  })
}
