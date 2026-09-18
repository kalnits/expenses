/* global URL */

/** Cloudflare Worker entry point for the static Vite single-page application. */
export default {
  async fetch(request, env) {
    const response = await env.ASSETS.fetch(request)
    const acceptsHtml = request.headers.get('accept')?.includes('text/html')

    if (request.method !== 'GET' || response.status !== 404 || !acceptsHtml) {
      return response
    }

    const fallbackUrl = new URL(request.url)
    fallbackUrl.pathname = '/index.html'
    fallbackUrl.search = ''
    return env.ASSETS.fetch(fallbackUrl.toString())
  },
}
