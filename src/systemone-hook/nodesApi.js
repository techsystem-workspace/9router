import { NextResponse } from "next/server";
import {
  CUSTOM_SYSTEMONE_NODE_TYPE,
  CUSTOM_SYSTEMONE_PREFIX,
  isCustomSystemoneProvider,
  sanitizeCustomSystemoneUrl,
} from "./constants.js";
import { probeCustomSystemone, removeNodeModels } from "./store.js";

export function customSystemoneAllowsConnection(providerId) {
  return isCustomSystemoneProvider(providerId);
}

export async function customSystemoneConnectionData(providerId, getProviderNodeById) {
  if (!isCustomSystemoneProvider(providerId)) return null;
  const node = await getProviderNodeById(providerId);
  if (!node) return { error: "System One node not found", status: 404 };
  return {
    data: { prefix: node.prefix, baseUrl: node.baseUrl, nodeName: node.name },
  };
}

export async function createCustomSystemoneNode(nodeType, fields, { createProviderNode, generateId }) {
  if (nodeType !== CUSTOM_SYSTEMONE_NODE_TYPE) return null;
  const { name, prefix, baseUrl } = fields;
  const sanitized = sanitizeCustomSystemoneUrl(baseUrl);
  if (sanitized.error) return NextResponse.json({ error: sanitized.error }, { status: 400 });
  const node = await createProviderNode({
    id: `${CUSTOM_SYSTEMONE_PREFIX}${generateId()}`,
    type: CUSTOM_SYSTEMONE_NODE_TYPE,
    prefix: prefix.trim(),
    baseUrl: sanitized.url,
    name: name.trim(),
  });
  return NextResponse.json({ node }, { status: 201 });
}

export function normalizeCustomSystemoneUrl(node, baseUrl) {
  if (node?.type !== CUSTOM_SYSTEMONE_NODE_TYPE) return null;
  return sanitizeCustomSystemoneUrl(baseUrl);
}

export async function beforeCustomSystemoneNodeDelete(node) {
  if (node?.type !== CUSTOM_SYSTEMONE_NODE_TYPE) return;
  await removeNodeModels(node.prefix);
}

// Returns a Response when this body is a custom System One node check, otherwise null.
export async function validateCustomSystemoneNodeBody(body, { localRequest, assertPublicUrl }) {
  if (body?.type !== CUSTOM_SYSTEMONE_NODE_TYPE) return null;
  const { baseUrl, apiKey, modelId } = body;
  if (!baseUrl) return NextResponse.json({ error: "URL is required" }, { status: 400 });
  try {
    new URL(baseUrl);
  } catch {
    return NextResponse.json({ error: "Invalid URL format" }, { status: 400 });
  }
  if (!localRequest) {
    try {
      assertPublicUrl(baseUrl);
    } catch {
      return NextResponse.json({ error: "URL not allowed" }, { status: 400 });
    }
  }
  const probed = await probeCustomSystemone(baseUrl, apiKey, modelId);
  return NextResponse.json(probed);
}

export async function validateCustomSystemoneConnection(providerId, apiKey, getProviderNodeById) {
  if (!isCustomSystemoneProvider(providerId)) return null;
  const node = await getProviderNodeById(providerId);
  if (!node?.baseUrl) {
    return NextResponse.json({ valid: false, error: "System One node not found" });
  }
  const probed = await probeCustomSystemone(node.baseUrl, apiKey);
  return NextResponse.json({
    valid: probed.valid,
    error: probed.valid ? null : (probed.error || "System One endpoint unreachable"),
  });
}
