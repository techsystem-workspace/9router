import { createErrorResult, formatProviderError } from "../utils/error.js";
import { HTTP_STATUS, FETCH_CONNECT_TIMEOUT_MS } from "../config/runtimeConfig.js";
import { isCustomSystemoneProvider } from "./constants.js";

// Laya answers FastAPI errors as `{ detail: "..." }`. Parsed here so the shared
// upstream error helper can stay untouched.
function messageFromBody(text) {
  try {
    const json = JSON.parse(text);
    const detail = typeof json.detail === "string" ? json.detail : "";
    const message = json.error?.message || json.message || json.error || detail || text;
    return typeof message === "string" ? message : JSON.stringify(message);
  } catch {
    return text || "Upstream error";
  }
}

/**
 * Handle a dashboard custom-systemone node. Returns null for every other
 * provider so the builtin System One path stays upstream's code.
 */
export async function tryHandleCustomSystemone({
  body,
  modelInfo,
  credentials,
  log,
  onRequestSuccess,
}) {
  const { provider, model } = modelInfo || {};
  if (!isCustomSystemoneProvider(provider)) return null;

  const baseUrl = credentials?.providerSpecificData?.baseUrl;
  if (!baseUrl) {
    return createErrorResult(HTTP_STATUS.BAD_REQUEST, "Custom System One node has no URL configured.");
  }
  if (body?.state === undefined || body?.state === null) {
    return createErrorResult(HTTP_STATUS.BAD_REQUEST, "Missing required field: state");
  }
  if (!body.questions || typeof body.questions !== "object" || Array.isArray(body.questions)) {
    return createErrorResult(HTTP_STATUS.BAD_REQUEST, "Missing required field: questions");
  }

  const apiKey = credentials?.apiKey;
  const headers = {
    "Content-Type": "application/json",
    ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
  };
  const requestBody = { ...body, model };
  log?.debug?.("SYSTEMONE", `${provider.toUpperCase()} | ${model}`);

  let providerResponse;
  try {
    providerResponse = await fetch(baseUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
      ...(typeof AbortSignal?.timeout === "function"
        ? { signal: AbortSignal.timeout(FETCH_CONNECT_TIMEOUT_MS) }
        : {}),
    });
  } catch (error) {
    const errMsg = formatProviderError(error, provider, model, HTTP_STATUS.BAD_GATEWAY);
    log?.debug?.("SYSTEMONE", `Fetch error: ${errMsg}`);
    return createErrorResult(HTTP_STATUS.BAD_GATEWAY, errMsg);
  }

  if (!providerResponse.ok) {
    const text = await providerResponse.text().catch(() => "");
    const errMsg = formatProviderError(
      new Error(messageFromBody(text)),
      provider,
      model,
      providerResponse.status
    );
    log?.debug?.("SYSTEMONE", `Provider error: ${errMsg}`);
    return createErrorResult(providerResponse.status, errMsg);
  }

  let responseBody;
  try {
    responseBody = await providerResponse.json();
  } catch {
    return createErrorResult(HTTP_STATUS.BAD_GATEWAY, `Invalid JSON response from ${provider}`);
  }

  if (onRequestSuccess) await onRequestSuccess();

  const usage = responseBody?.usage;
  return {
    success: true,
    usage: usage
      ? { prompt_tokens: usage.input_tokens || 0, completion_tokens: usage.output_tokens || 0 }
      : null,
    response: new Response(JSON.stringify(responseBody), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    }),
  };
}
