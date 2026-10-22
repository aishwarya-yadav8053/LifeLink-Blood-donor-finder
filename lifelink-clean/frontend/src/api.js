let csrf = "";
export function setCSRF(value) {
  csrf = value;
}
export async function api(path, options = {}) {
  const form = options.body instanceof FormData;
  let response;
  try {
    response = await fetch("/api" + path, {
      credentials: "include",
      ...options,
      headers: {
        ...(form ? {} : { "Content-Type": "application/json" }),
        "X-CSRF-Token": csrf,
        ...options.headers,
      },
      body: options.body
        ? form
          ? options.body
          : JSON.stringify(options.body)
        : undefined,
    });
  } catch {
    throw new Error(
      "Cannot reach the backend. Start FastAPI on port 8000 and retry.",
    );
  }
  const data = await response
    .json()
    .catch(() => ({ detail: "Unexpected server response" }));
  if (!response.ok) {
    let msg = data.detail;
    if (Array.isArray(msg)) msg = msg.map((x) => x.msg).join("; ");
    if (typeof msg === "object") msg = JSON.stringify(msg);
    throw new Error(msg || "Request failed");
  }
  return data;
}
