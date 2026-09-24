export {
  CUSTOM_SYSTEMONE_PREFIX,
  CUSTOM_SYSTEMONE_NODE_TYPE,
  isCustomSystemoneProvider,
} from "open-sse/laya/constants.js";

// laya-serve default. See /projects/laya laya/serve.py.
export const LAYA_DEFAULT_URL = "http://127.0.0.1:8000/v1/systemone";

// Checkpoint names Laya honours on `model`. Anything else is auto-routed.
export const LAYA_MODELS = [
  { id: "english", name: "English" },
  { id: "multilingual", name: "Multilingual" },
  { id: "typed-decisions", name: "Typed decisions" },
];

// Open-source System One servers. Add a preset here when another project
// speaks the same POST / JSON decision protocol.
export const SYSTEMONE_PRESETS = [
  {
    id: "laya",
    label: "Laya",
    name: "Laya",
    prefix: "laya",
    baseUrl: LAYA_DEFAULT_URL,
    models: LAYA_MODELS,
    urlHint: "laya-serve endpoint. Check calls GET /health on the same host.",
    keyHint: "Only if laya-serve was started with LAYA_API_KEY. Leave empty otherwise.",
    modelHint: "Laya checkpoints: english, multilingual, typed-decisions.",
  },
  {
    id: "custom",
    label: "Custom",
    name: "",
    prefix: "",
    baseUrl: "",
    models: [],
    urlHint: "Full endpoint. Requests are POSTed here as JSON.",
    keyHint: "Optional. Sent as Authorization: Bearer when the server requires a key.",
    modelHint: "Optional model id understood by that server.",
  },
];

export function getSystemonePreset(id) {
  return SYSTEMONE_PRESETS.find((preset) => preset.id === id) || SYSTEMONE_PRESETS[0];
}

export function presetForNode(node) {
  if (node?.preset) return getSystemonePreset(node.preset);
  return getSystemonePreset("laya");
}

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
