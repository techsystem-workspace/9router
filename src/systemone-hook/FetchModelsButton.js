"use client";

import { useEffect, useState } from "react";
import { Button } from "@/shared/components";

// Pulls the upstream /v1/models list into this node's added models.
export default function FetchModelsButton({ providerId, prefix }) {
  const [connectionId, setConnectionId] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/providers", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        const connection = (d.connections || []).find((item) => item.provider === providerId && item.isActive !== false);
        setConnectionId(connection?.id || "");
      })
      .catch(() => { if (!cancelled) setConnectionId(""); });
    return () => { cancelled = true; };
  }, [providerId]);

  const handleFetch = async () => {
    if (!connectionId || busy) return;
    setBusy(true);
    setMessage("");
    setFailed(false);
    try {
      const res = await fetch(`/api/providers/${connectionId}/models`);
      const data = await res.json();
      if (!res.ok) {
        setFailed(true);
        setMessage(data.error || "Failed to fetch models");
        return;
      }
      const models = data.models || [];
      if (models.length === 0) {
        setMessage("No models returned from /models.");
        return;
      }
      const existing = await fetch("/api/models/custom", { cache: "no-store" }).then((r) => r.json());
      const have = new Set(
        (existing.models || [])
          .filter((model) => model.providerAlias === prefix && model.type === "systemone")
          .map((model) => model.id)
      );
      let added = 0;
      for (const model of models) {
        if (!model.id || have.has(model.id)) continue;
        const save = await fetch("/api/models/custom", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ providerAlias: prefix, id: model.id, type: "systemone", name: model.name || model.id }),
        });
        if (save.ok) {
          have.add(model.id);
          added += 1;
        }
      }
      window.dispatchEvent(new CustomEvent("customModelChanged"));
      setMessage(added === 0 ? "No new models were added." : `Added ${added} model${added === 1 ? "" : "s"}.`);
    } catch (error) {
      setFailed(true);
      setMessage(error?.message || "Failed to fetch models");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <Button size="sm" variant="secondary" icon="download" onClick={handleFetch} disabled={!connectionId || busy}>
        {busy ? "Fetching..." : "Fetch from API"}
      </Button>
      {!connectionId && <p className="text-xs text-text-muted">Add a connection to fetch models.</p>}
      {message && <p className={`text-xs ${failed ? "text-red-500" : "text-text-muted"}`}>{message}</p>}
    </div>
  );
}
