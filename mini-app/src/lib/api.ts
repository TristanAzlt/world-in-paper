export async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`/api/backend${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(error.error || `API error ${res.status}`);
  }

  return res.json();
}
