# Laya overlay

Local System One provider for [Laya](/projects/laya) (`laya-serve`, `POST /v1/systemone`).

Everything specific to that server lives in this directory and in `open-sse/laya/`. Upstream files only call into it. After a pull, re-apply the hooks marked `laya-hook` if a conflict lands on one of them:

- `open-sse/handlers/systemoneCore.js` — delegate custom nodes before the builtin handler
- `src/sse/services/model.js` — resolve a Laya prefix to its node id
- `src/app/api/provider-nodes/route.js` — create
- `src/app/api/provider-nodes/[id]/route.js` — update URL and delete the node's models
- `src/app/api/provider-nodes/validate/route.js` — Check button
- `src/app/api/providers/route.js` — connection without a required API key
- `src/app/api/providers/[id]/models/route.js` — fetch `/v1/models` for a custom node
- `src/app/api/providers/validate/route.js` — connection check
- `src/app/(dashboard)/dashboard/media-providers/[kind]/page.js` — `<LayaKindSection />`
- `src/app/(dashboard)/dashboard/media-providers/[kind]/[id]/page.js` — early return to `LayaDetailPage`
- `src/app/(dashboard)/dashboard/media-providers/[kind]/[id]/components/GenericExampleCard.js` — optional `customAlias`, `modelOptions` (added models, including an empty list), and `payloadEditor`
- `src/app/(dashboard)/dashboard/providers/components/ConnectionsCard.js` — optional API key
- `src/app/(dashboard)/dashboard/providers/components/ModelsCard.js` — optional `extraActions` for Fetch from API
