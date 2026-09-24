import { CUSTOM_SYSTEMONE_NODE_TYPE } from "./constants.js";

export async function resolveLayaModel(parsed, getProviderNodes) {
  const nodes = await getProviderNodes({ type: CUSTOM_SYSTEMONE_NODE_TYPE });
  const matched = nodes.find((node) => node.prefix === parsed.providerAlias);
  if (!matched) return null;
  return { provider: matched.id, model: parsed.model };
}
