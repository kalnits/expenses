const jsonHeaders = { 'Content-Type': 'application/json; charset=utf-8' }

function allowedOrigin(request: Request): string | null {
  const origin = request.headers.get('origin')
  const appOrigin = Deno.env.get('APP_ORIGIN')
  return origin && appOrigin && origin === appOrigin ? origin : null
}

export function corsHeaders(request: Request): HeadersInit {
  const origin = allowedOrigin(request)
  return origin ? { ...jsonHeaders, 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } : jsonHeaders
}

export function optionsResponse(request: Request): Response {
  return new Response(null, { status: 204, headers: { ...corsHeaders(request), 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type' } })
}

export function jsonResponse(request: Request, body: unknown, status = 200): Response { return new Response(JSON.stringify(body), { status, headers: corsHeaders(request) }) }
export function errorResponse(request: Request, message: string, status: number): Response { return jsonResponse(request, { error: message }, status) }
