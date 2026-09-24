// Local overlay for a self-hosted Laya server (laya-serve).
// This directory is not part of upstream 9router. Keep the prefix stable:
// dashboard node ids are `${CUSTOM_SYSTEMONE_PREFIX}${id}`.

export const CUSTOM_SYSTEMONE_PREFIX = "custom-systemone-";
export const CUSTOM_SYSTEMONE_NODE_TYPE = "custom-systemone";

export function isCustomSystemoneProvider(providerId) {
  return typeof providerId === "string" && providerId.startsWith(CUSTOM_SYSTEMONE_PREFIX);
}
