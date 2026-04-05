import { getAccessToken, logout, refreshAccessToken } from "./auth";

async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getAccessToken();

  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (res.status === 401) {
    const newToken = await refreshAccessToken();
    if (!newToken) {
      logout();
      window.location.href = "/login";
      return res;
    }

    return fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${newToken}`,
        ...options.headers,
      },
    });
  }

  return res;
}

export default apiFetch;
