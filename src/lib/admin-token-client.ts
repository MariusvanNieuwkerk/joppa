const STORAGE_KEY = "joppa_admin_token";

export function getAdminToken() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(STORAGE_KEY) ?? "";
}

export function setAdminToken(token: string) {
  if (typeof window === "undefined") return;
  if (!token) window.localStorage.removeItem(STORAGE_KEY);
  else window.localStorage.setItem(STORAGE_KEY, token);
}

export function withAdminHeader(init?: RequestInit): RequestInit {
  const token = getAdminToken();
  if (!token) return init ?? {};
  const headers = new Headers(init?.headers ?? {});
  headers.set("x-joppa-admin", token);
  return { ...(init ?? {}), headers };
}

