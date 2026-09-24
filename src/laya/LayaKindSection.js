"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, Badge, Button } from "@/shared/components";
import ProviderIcon from "@/shared/components/ProviderIcon";
import AddLayaModal from "./AddModal";
import { CUSTOM_SYSTEMONE_NODE_TYPE } from "./constants";

// Self-contained System One listing for Laya nodes. The media-providers page
// only renders this component, so upstream changes to that page stay small.
export default function LayaKindSection({ kind }) {
  const [nodes, setNodes] = useState([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (kind !== "systemone") return;
    let cancelled = false;
    fetch("/api/provider-nodes", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        setNodes((d.nodes || []).filter((n) => n.type === CUSTOM_SYSTEMONE_NODE_TYPE));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [kind]);

  if (kind !== "systemone") return null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-end">
        <Button size="sm" icon="add" onClick={() => setOpen(true)}>Add New</Button>
      </div>
      {nodes.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {nodes.map((node) => (
            <Link key={node.id} href={`/dashboard/media-providers/systemone/${node.id}`} className="group">
              <Card padding="xs" className="h-full hover:bg-black/[0.01] dark:hover:bg-white/[0.01] transition-colors cursor-pointer">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="size-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: "#7C3AED15" }}>
                    <ProviderIcon
                      src="/providers/laya.png"
                      alt={node.name || "Laya"}
                      size={30}
                      className="object-contain rounded-lg max-w-[30px] max-h-[30px]"
                      fallbackText="S1"
                      fallbackColor="#7C3AED"
                    />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-sm truncate">{node.name || "Laya"}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="default" size="sm">Custom</Badge>
                      <span className="text-xs text-text-muted truncate">{node.baseUrl}</span>
                    </div>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
      <AddLayaModal
        isOpen={open}
        onClose={() => setOpen(false)}
        onCreated={(node) => {
          setNodes((prev) => [...prev, node]);
          setOpen(false);
        }}
      />
    </div>
  );
}
