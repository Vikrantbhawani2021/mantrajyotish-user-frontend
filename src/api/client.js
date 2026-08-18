import { BACKEND_URL } from "../config/backend";

export async function apiFetch(path, options = {}) {
  const url = path.startsWith("http") ? path : `${BACKEND_URL}${path.startsWith("/") ? "" : "/"}${path}`;

  const headers = { ...(options.headers || {}) };
  // Let FormData pass through without JSON content-type
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = headers["Content-Type"] || "application/json";
  }

  const token = localStorage.getItem("authToken");
  if (token && !headers["Authorization"]) headers["Authorization"] = `Bearer ${token}`;

  const opts = { ...options, headers };

  if (opts.body && typeof opts.body === "object" && !(opts.body instanceof FormData)) {
    opts.body = JSON.stringify(opts.body);
  }

  const res = await fetch(url, opts);
  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    // ignore non-json responses
  }

  if (!res.ok) {
    const err = new Error(data?.message || res.statusText || "API Error");
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

export default apiFetch;
