"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, notFound } from "next/navigation";
import Link from "next/link";
import { Badge, Button } from "@/shared/components";
import ProviderIcon from "@/shared/components/ProviderIcon";
import ConnectionsCard from "@/app/(dashboard)/dashboard/providers/components/ConnectionsCard";
import ModelsCard from "@/app/(dashboard)/dashboard/providers/components/ModelsCard";
import { GenericExampleCard } from "@/app/(dashboard)/dashboard/media-providers/[kind]/[id]/components/GenericExampleCard";
import AddLayaModal from "./AddModal";
import SystemonePayloadFields from "./PayloadFields";
import FetchModelsButton from "./FetchModelsButton";
import { defaultSystemoneQuestions, questionsReady, questionsToBody } from "./payload";

// Detail page for a custom-systemone node. Mounted only for those ids so the
// upstream media-provider detail page does not grow a second provider shape.
export default function LayaDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [node, setNode] = useState(null);
  const [addedModels, setAddedModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/provider-nodes", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        const found = (d.nodes || []).find((n) => n.id === id) || null;
        setNode(found);
        if (found?.name) {
          window.dispatchEvent(new CustomEvent("provider-node-updated", { detail: { id: found.id, name: found.name } }));
        }
        setLoading(false);
      })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    const prefix = node?.prefix;
    if (!prefix) return undefined;
    let cancelled = false;
    const load = () => {
      fetch("/api/models/custom", { cache: "no-store" })
        .then((r) => r.json())
        .then((d) => {
          if (cancelled) return;
          const models = (d.models || [])
            .filter((model) => model.providerAlias === prefix && model.type === "systemone")
            .map((model) => ({ id: model.id, name: model.name || model.id }));
          setAddedModels(models);
        })
        .catch(() => { if (!cancelled) setAddedModels([]); });
    };
    load();
    window.addEventListener("customModelChanged", load);
    return () => {
      cancelled = true;
      window.removeEventListener("customModelChanged", load);
    };
  }, [node?.prefix]);

  const handleDelete = async () => {
    if (!confirm("Delete this Laya node?")) return;
    const res = await fetch(`/api/provider-nodes/${id}`, { method: "DELETE" });
    if (res.ok) router.push("/dashboard/media-providers/systemone");
  };

  if (loading) return <div className="text-text-muted text-sm py-12 text-center">Loading...</div>;
  if (!node) return notFound();

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link
          href="/dashboard/media-providers/systemone"
          className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-primary transition-colors mb-4"
        >
          <span className="material-symbols-outlined text-lg">arrow_back</span>
          System One
        </Link>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <div className="size-12 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: "#7C3AED15" }}>
            <ProviderIcon
              src="/providers/laya.png"
              alt={node.name || "Laya"}
              size={48}
              className="object-contain rounded-lg max-w-[48px] max-h-[48px]"
              fallbackText="S1"
              fallbackColor="#7C3AED"
            />
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-semibold tracking-tight">{node.name || "Laya"}</h1>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              <Badge variant="default" size="sm">Custom · {node.prefix}</Badge>
              <Badge variant="primary" size="sm">SYSTEMONE</Badge>
            </div>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <Button size="sm" variant="secondary" icon="edit" onClick={() => setEditing(true)}>Edit</Button>
            <Button size="sm" variant="secondary" icon="delete" onClick={handleDelete}>Delete</Button>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-border px-4 py-3 text-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-xs text-text-muted w-28 shrink-0">Method</span>
            <span className="font-mono">POST</span>
          </div>
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-xs text-text-muted w-28 shrink-0">Header</span>
            <span className="font-mono truncate">Content-Type: application/json</span>
          </div>
          <div className="flex items-center gap-3 min-w-0 sm:col-span-2">
            <span className="text-xs text-text-muted w-28 shrink-0">Endpoint</span>
            <span className="font-mono truncate">{node.baseUrl}</span>
          </div>
        </div>
      </div>

      <ConnectionsCard providerId={id} isOAuth={false} apiKeyOptional />
      <ModelsCard
        providerId={id}
        kindFilter="systemone"
        providerAliasOverride={node.prefix}
        extraActions={<FetchModelsButton providerId={id} prefix={node.prefix} />}
      />
      <GenericExampleCard
        providerId={id}
        kind="systemone"
        customAlias={node.prefix}
        modelOptions={addedModels}
        payloadEditor={{
          Fields: SystemonePayloadFields,
          initialQuestions: defaultSystemoneQuestions(),
          toBody: questionsToBody,
          isReady: questionsReady,
        }}
      />

      <AddLayaModal
        isOpen={editing}
        node={node}
        onClose={() => setEditing(false)}
        onSaved={(updated) => {
          setNode(updated);
          if (updated?.name) {
            window.dispatchEvent(new CustomEvent("provider-node-updated", { detail: { id: updated.id, name: updated.name } }));
          }
          setEditing(false);
        }}
      />
    </div>
  );
}
