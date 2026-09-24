export {
  CUSTOM_SYSTEMONE_PREFIX,
  CUSTOM_SYSTEMONE_NODE_TYPE,
  isCustomSystemoneProvider,
} from "open-sse/laya/constants.js";

// Example decision endpoint. The runtime POSTs JSON to whatever URL the node stores.
export const LAYA_DEFAULT_URL = "http://127.0.0.1:8000/v1/systemone";

// Full System One endpoint. The runtime POSTs JSON to this URL as-is.
export function sanitizeLayaUrl(raw, { useDefault = false } = {}) {
  const source = typeof raw === "string" && raw.trim()
    ? raw.trim()
    : (useDefault ? LAYA_DEFAULT_URL : "");
  const value = source.replace(/\/+$/, "");
  if (!value) return { error: "URL is required" };
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    return { error: "Invalid URL" };
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { error: "URL must start with http:// or https://" };
  }
  return { url: parsed.toString().replace(/\/+$/, "") };
}
