import { isCustomSystemoneProvider } from "./constants.js";

// The node stores the decision endpoint (.../v1/systemone). Model lists live
// beside it, the same way an OpenAI-compatible server exposes /v1/models.
export function systemoneModelsUrl(baseUrl) {
  const value = String(baseUrl || "").trim().replace(/\/+$/, "");
  if (!value) return "";
  if (value.endsWith("/models")) return value;
  if (value.endsWith("/systemone")) return `${value.slice(0, -"/systemone".length)}/models`;
  return `${value}/models`;
}

export function parseSystemoneModelList(data, prefix) {
  const list = Array.isArray(data) ? data : (data?.data || data?.models || []);
  if (!Array.isArray(list)) return [];
  const owner = String(prefix || "").trim();
  const seen = new Set();
  const models = [];
  for (const item of list) {
    const raw = typeof item === "string" ? item : (item?.id || item?.name || item?.model);
    if (!raw) continue;
    let id = String(raw).trim();
    if (owner && id.startsWith(`${owner}/`)) id = id.slice(owner.length + 1);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const name = typeof item === "object" && item?.name ? String(item.name) : id;
    models.push({ id, name });
  }
  return models;
}

function errorDetail(body) {
  if (!body || typeof body !== "object") return "";
  if (typeof body.detail === "string") return body.detail;
  if (typeof body.error === "string") return body.error;
  if (typeof body.error?.message === "string") return body.error.message;
  return "";
}

// Null when this connection is not a custom System One node, so other providers
// keep their own model listing.
export async function tryFetchCustomSystemoneModels(connection) {
  if (!isCustomSystemoneProvider(connection?.provider)) return null;
  const url = systemoneModelsUrl(connection.providerSpecificData?.baseUrl);
  if (!url) return { error: "No URL configured", status: 400 };

  const headers = { Accept: "application/json" };
  if (connection.apiKey) headers.Authorization = `Bearer ${connection.apiKey}`;

  let response;
  try {
    response = await fetch(url, { method: "GET", headers, signal: AbortSignal.timeout(8000) });
  } catch (error) {
    return { error: error?.message || "Failed to reach the model API", status: 502 };
  }

  if (!response.ok) {
    let detail = "";
    try {
      detail = errorDetail(await response.json());
    } catch {
      detail = "";
    }
    return {
      error: `Failed to fetch models: ${response.status}${detail ? ` ${detail}` : ""}`,
      status: response.status,
    };
  }

  let data;
  try {
    data = await response.json();
  } catch {
    return { error: "Model API did not return JSON", status: 502 };
  }

  return { models: parseSystemoneModelList(data, connection.providerSpecificData?.prefix) };
}
