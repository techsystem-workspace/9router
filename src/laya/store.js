import { addCustomModel, deleteCustomModel } from "@/lib/db/index.js";
import { LAYA_MODELS } from "./constants.js";

export function layaHealthUrl(systemoneUrl) {
  return `${new URL(systemoneUrl).origin}/health`;
}

export function layaProbeBody(modelId) {
  return {
    model: (modelId || "english").trim() || "english",
    state: "ping",
    questions: {
      probe: { type: "noul", instructions: "Is this a probe?" },
    },
  };
}

function detailFromBody(text) {
  if (!text) return "";
  try {
    const parsed = JSON.parse(text);
    if (typeof parsed.detail === "string") return parsed.detail;
  } catch { /* raw text */ }
  return text.slice(0, 200);
}

// Keyless Laya is confirmed with GET /health so Check does not wait on inference.
// A key is still POSTed, because /health never checks LAYA_API_KEY.
export async function probeLaya(systemoneUrl, apiKey, modelId) {
  const url = String(systemoneUrl || "").trim().replace(/\/+$/, "");
  let health = null;
  try {
    const healthRes = await fetch(layaHealthUrl(url), { signal: AbortSignal.timeout(8000) });
    if (healthRes.ok) {
      health = await healthRes.json().catch(() => ({}));
      if (!apiKey) {
        return { valid: true, method: "health", loaded: health.loaded || null, device: health.device || null };
      }
    }
  } catch {
    health = null;
  }

  const headers = { "Content-Type": "application/json" };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
  let probeRes;
  try {
    probeRes = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(layaProbeBody(modelId)),
      signal: AbortSignal.timeout(8000),
    });
  } catch (error) {
    if (health) {
      return { valid: true, method: "health", loaded: health.loaded || null, device: health.device || null };
    }
    return { valid: false, error: error?.message || "Laya endpoint unreachable" };
  }

  if (probeRes.ok) return { valid: true, method: "systemone" };
  if (probeRes.status === 401 || probeRes.status === 403) {
    return { valid: false, error: "API key unauthorized" };
  }
  const detail = detailFromBody(await probeRes.text().catch(() => ""));
  if (health) {
    return { valid: true, method: "health", loaded: health.loaded || null, device: health.device || null };
  }
  return {
    valid: false,
    error: `Laya request failed (${probeRes.status})${detail ? `: ${detail}` : ""}`,
  };
}

export async function seedPresetModels(prefix, models = LAYA_MODELS) {
  const alias = String(prefix || "").trim();
  if (!alias) return;
  for (const model of models) {
    await addCustomModel({ providerAlias: alias, id: model.id, type: "systemone", name: model.name });
  }
}

export async function removePresetModels(prefix, models = LAYA_MODELS) {
  const alias = String(prefix || "").trim();
  if (!alias) return;
  for (const model of models) {
    await deleteCustomModel({ providerAlias: alias, id: model.id, type: "systemone" });
  }
}

export const seedLayaModels = (prefix) => seedPresetModels(prefix, LAYA_MODELS);
export const removeLayaModels = (prefix) => removePresetModels(prefix, LAYA_MODELS);
