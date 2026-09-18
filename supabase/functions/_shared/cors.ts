const APP_ORIGIN = Deno.env.get('APP_ORIGIN')?.trim()

export function corsHeaders(request: Request): HeadersInit {
  const origin = request.headers.get('origin')
  if (!APP_ORIGIN) throw new Error('APP_ORIGIN не настроен.')
  if (origin && origin !== APP_ORIGIN) throw new Error('Источник запроса не разрешён.')
  return {
    'Access-Control-Allow-Origin': APP_ORIGIN,
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json; charset=utf-8',
    Vary: 'Origin',
  }
}

export function jsonResponse(request: Request, value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), { status, headers: corsHeaders(request) })
}

export function errorResponse(request: Request, message: string, status = 400, extra: Record<string, unknown> = {}): Response {
  return jsonResponse(request, { error: message, ...extra }, status)
}

export function handleOptions(request: Request): Response {
  try { return new Response(null, { status: 204, headers: corsHeaders(request) }) }
  catch { return new Response(null, { status: 403 }) }
}
