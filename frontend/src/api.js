import { useCallback, useEffect, useState } from 'react';

const TOKEN_KEY = 'secret_token';

export const getToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

export const setToken = (token) => {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Storage unavailable (private mode) - the session just won't survive a reload.
  }
};

// Calls the backend. Empty query values are skipped. Throws an Error with the API message on failure.
export async function api(path, { method = 'GET', body, query } = {}) {
  const url = new URL(`/api${path}`, window.location.origin);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== '' && value != null) url.searchParams.set(key, value);
  }

  const token = getToken();
  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: body && JSON.stringify(body),
  });
  const data = res.status === 204 ? null : await res.json().catch(() => null);

  if (res.status === 401 && path !== '/auth/login') {
    setToken(null);
    window.dispatchEvent(new Event('auth:logout'));
  }
  if (!res.ok) throw new Error(data?.message || `Request failed (${res.status})`);
  return data;
}

// Loads `path` and re-loads whenever the query changes or reload() is called.
export function useFetch(path, query) {
  const [state, setState] = useState({ data: null, error: '', loading: true });
  const [version, setVersion] = useState(0);
  const queryKey = JSON.stringify(query ?? {});

  useEffect(() => {
    let active = true;
    setState((s) => ({ ...s, loading: true, error: '' }));
    api(path, { query: JSON.parse(queryKey) })
      .then((data) => active && setState({ data, error: '', loading: false }))
      .catch((err) => active && setState((s) => ({ ...s, error: err.message, loading: false })));
    return () => {
      active = false;
    };
  }, [path, queryKey, version]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  return { ...state, reload };
}

export const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export const today = () => new Date().toISOString().slice(0, 10);
