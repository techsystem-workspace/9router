import { NextResponse } from "next/server";
import { updateProviderNode } from "@/models";
import {
  CUSTOM_SYSTEMONE_NODE_TYPE,
  CUSTOM_SYSTEMONE_PREFIX,
  getSystemonePreset,
  isCustomSystemoneProvider,
  sanitizeLayaUrl,
} from "./constants.js";
import { probeLaya, removePresetModels, seedPresetModels } from "./store.js";

export function layaAllowsConnection(providerId) {
  return isCustomSystemoneProvider(providerId);
}

export async function layaConnectionData(providerId, getProviderNodeById) {
  if (!isCustomSystemoneProvider(providerId)) return null;
  const node = await getProviderNodeById(providerId);
  if (!node) return { error: "Laya node not found", status: 404 };
  return {
    data: { prefix: node.prefix, baseUrl: node.baseUrl, nodeName: node.name },
  };
}

export async function createLayaNode(nodeType, fields, { createProviderNode, generateId }) {
  if (nodeType !== CUSTOM_SYSTEMONE_NODE_TYPE) return null;
  const { name, prefix, baseUrl } = fields;
  const preset = getSystemonePreset(fields.preset || "laya");
  const sanitized = sanitizeLayaUrl(baseUrl, { useDefault: preset.id !== "custom" });
  if (sanitized.error) return NextResponse.json({ error: sanitized.error }, { status: 400 });
  const created = await createProviderNode({
    id: `${CUSTOM_SYSTEMONE_PREFIX}${generateId()}`,
    type: CUSTOM_SYSTEMONE_NODE_TYPE,
    prefix: prefix.trim(),
    baseUrl: sanitized.url,
    name: name.trim(),
  });
  const node = await updateProviderNode(created.id, { preset: preset.id });
  await seedPresetModels(node.prefix, preset.models);
  return NextResponse.json({ node }, { status: 201 });
}

export function normalizeLayaNodeUrl(node, baseUrl) {
  if (node?.type !== CUSTOM_SYSTEMONE_NODE_TYPE) return null;
  return sanitizeLayaUrl(baseUrl);
}

export async function afterLayaNodeUpdate(previous, updates) {
  if (previous?.type !== CUSTOM_SYSTEMONE_NODE_TYPE) return;
  const previousPreset = getSystemonePreset(previous.preset || "laya");
  const nextPreset = getSystemonePreset(updates.preset || previous.preset || "laya");
  if (previous.prefix !== updates.prefix || previousPreset.id !== nextPreset.id) {
    await removePresetModels(previous.prefix, previousPreset.models);
  }
  await updateProviderNode(previous.id, { preset: nextPreset.id });
  await seedPresetModels(updates.prefix, nextPreset.models);
}

export async function beforeLayaNodeDelete(node) {
  if (node?.type !== CUSTOM_SYSTEMONE_NODE_TYPE) return;
  await removePresetModels(node.prefix, getSystemonePreset(node.preset || "laya").models);
}

// Returns a Response when this body is a Laya node check, otherwise null.
export async function validateLayaNodeBody(body, { localRequest, assertPublicUrl }) {
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
  const probed = await probeLaya(baseUrl, apiKey, modelId);
  return NextResponse.json(probed);
}

export async function validateLayaConnection(providerId, apiKey, getProviderNodeById) {
  if (!isCustomSystemoneProvider(providerId)) return null;
  const node = await getProviderNodeById(providerId);
  if (!node?.baseUrl) {
    return NextResponse.json({ valid: false, error: "Laya node not found" });
  }
  const probed = await probeLaya(node.baseUrl, apiKey);
  return NextResponse.json({
    valid: probed.valid,
    error: probed.valid ? null : (probed.error || "Laya endpoint unreachable"),
  });
}
