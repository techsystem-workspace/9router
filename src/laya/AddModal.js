"use client";

import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { Modal, Input, Button, Badge, Select } from "@/shared/components";
import { SYSTEMONE_PRESETS, getSystemonePreset, presetForNode } from "@/laya/constants";

// Dual-mode modal: edit when `node` provided, add otherwise.
// Upstream contract is fixed: POST the configured URL with Content-Type: application/json.
export default function AddCustomSystemoneModal({ isOpen, onClose, onCreated, onSaved, node }) {
  const isEdit = !!node;
  const [formData, setFormData] = useState(() => formFromPreset("laya"));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [checkKey, setCheckKey] = useState("");
  const [checkModelId, setCheckModelId] = useState("");
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    setValidationResult(null);
    setError("");
    setCheckKey("");
    setCheckModelId("");
    if (isEdit) {
      const preset = presetForNode(node);
      setFormData({
        preset: preset.id,
        name: node.name || preset.name,
        prefix: node.prefix || preset.prefix,
        baseUrl: node.baseUrl || preset.baseUrl,
      });
    } else {
      setFormData(formFromPreset("laya"));
    }
  }, [isOpen, isEdit, node]);

  const preset = getSystemonePreset(formData.preset);

  const handlePresetChange = (presetId) => {
    const next = getSystemonePreset(presetId);
    setFormData({
      preset: next.id,
      name: next.name,
      prefix: next.prefix,
      baseUrl: next.baseUrl,
    });
    setValidationResult(null);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.prefix.trim() || !formData.baseUrl.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      const url = isEdit ? `/api/provider-nodes/${node.id}` : "/api/provider-nodes";
      const method = isEdit ? "PUT" : "POST";
      const payload = {
        name: formData.name,
        prefix: formData.prefix,
        baseUrl: formData.baseUrl,
        preset: formData.preset,
      };
      if (!isEdit) payload.type = "custom-systemone";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        if (isEdit) onSaved?.(data.node);
        else onCreated?.(data.node);
      } else {
        setError(data.error || "Failed to save");
      }
    } catch (err) {
      console.log("Error saving custom systemone node:", err);
      setError("Failed to save");
    } finally {
      setSubmitting(false);
    }
  };

  const handleValidate = async () => {
    setValidating(true);
    try {
      const res = await fetch("/api/provider-nodes/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseUrl: formData.baseUrl,
          apiKey: checkKey,
          type: "custom-systemone",
          modelId: checkModelId.trim() || undefined,
        }),
      });
      const data = await res.json();
      setValidationResult(data);
    } catch {
      setValidationResult({ valid: false, error: "Network error" });
    } finally {
      setValidating(false);
    }
  };

  const renderValidationResult = () => {
    if (!validationResult) return null;
    if (validationResult.valid) return <Badge variant="success">Reachable</Badge>;
    return (
      <div className="flex flex-col gap-1">
        <Badge variant="error">Unreachable</Badge>
        {validationResult.error && <span className="text-sm text-red-500">{validationResult.error}</span>}
      </div>
    );
  };

  return (
    <Modal isOpen={isOpen} title={isEdit ? "Edit" : "Add New"} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <Select
          label="Server"
          value={formData.preset}
          onChange={(e) => handlePresetChange(e.target.value)}
          options={SYSTEMONE_PRESETS.map((item) => ({ value: item.id, label: item.label }))}
          hint="Open-source System One server. More can be added later. Name, prefix, and URL stay editable."
        />
        <Input
          label="Name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder={preset.name || "Local server"}
          hint="Required. Label on the System One page."
        />
        <Input
          label="Prefix"
          value={formData.prefix}
          onChange={(e) => setFormData({ ...formData, prefix: e.target.value })}
          placeholder={preset.prefix || "local"}
          hint={preset.prefix ? `Model ids look like ${preset.prefix}/model.` : "Required. Model ids look like prefix/model."}
        />
        <Input
          label="URL"
          value={formData.baseUrl}
          onChange={(e) => setFormData({ ...formData, baseUrl: e.target.value })}
          placeholder={preset.baseUrl || "http://127.0.0.1:8000/v1/systemone"}
          hint={preset.urlHint}
        />
        <div className="rounded-lg border border-border bg-black/[0.02] px-3 py-2 text-xs text-text-muted dark:bg-white/[0.02]">
          <div>Method: <span className="font-mono text-text-main">POST</span></div>
          <div>Header: <span className="font-mono text-text-main">Content-Type: application/json</span></div>
        </div>
        <Input
          label="API Key (for Check, optional)"
          type="password"
          value={checkKey}
          onChange={(e) => setCheckKey(e.target.value)}
          hint={preset.keyHint}
        />
        <Input
          label="Model ID (for Check)"
          value={checkModelId}
          onChange={(e) => setCheckModelId(e.target.value)}
          placeholder={preset.models[0]?.id || "model-id"}
          hint={preset.modelHint}
        />
        <div className="flex items-center gap-3">
          <Button
            onClick={handleValidate}
            disabled={validating || !formData.baseUrl.trim()}
            variant="secondary"
          >
            {validating ? "Checking..." : "Check"}
          </Button>
          {renderValidationResult()}
        </div>
        {error && <span className="text-sm text-red-500">{error}</span>}
        <div className="flex gap-2">
          <Button
            onClick={handleSubmit}
            fullWidth
            disabled={!formData.name.trim() || !formData.prefix.trim() || !formData.baseUrl.trim() || submitting}
          >
            {submitting ? (isEdit ? "Saving..." : "Creating...") : (isEdit ? "Save" : "Create")}
          </Button>
          <Button onClick={onClose} variant="ghost" fullWidth>Cancel</Button>
        </div>
      </div>
    </Modal>
  );
}

AddCustomSystemoneModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onCreated: PropTypes.func,
  onSaved: PropTypes.func,
  node: PropTypes.shape({
    id: PropTypes.string,
    name: PropTypes.string,
    prefix: PropTypes.string,
    baseUrl: PropTypes.string,
    preset: PropTypes.string,
  }),
};

function formFromPreset(presetId) {
  const preset = getSystemonePreset(presetId);
  return {
    preset: preset.id,
    name: preset.name,
    prefix: preset.prefix,
    baseUrl: preset.baseUrl,
  };
}
