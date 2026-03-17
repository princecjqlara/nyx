// API base URL — in the APK, this points to the deployed Vercel backend.
// In development, it's empty (same-origin).
// Set NEXT_PUBLIC_API_URL when building for mobile.
const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

export async function api<T = any>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...opts?.headers,
    },
  });
  return res.json();
}
