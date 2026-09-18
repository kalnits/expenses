export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { Accept: 'application/json', ...init.headers },
  })
  const payload: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const message = payload && typeof payload === 'object' &&
      typeof (payload as { error?: unknown }).error === 'string'
      ? (payload as { error: string }).error
      : 'Не удалось выполнить запрос. Попробуйте снова.'
    throw new ApiError(response.status, message)
  }
  return payload as T
}

export function apiJson<T>(path: string, method: string, body?: unknown): Promise<T> {
  return apiRequest<T>(path, {
    method,
    ...(body === undefined ? {} : {
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    }),
  })
}
