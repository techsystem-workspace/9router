"use client";

import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { Modal, Input, Button, Badge } from "@/shared/components";

const EMPTY_FORM = { name: "", prefix: "", baseUrl: "" };

// Dual-mode modal: edit when `node` provided, add otherwise.
// One System One server form: name, prefix, and the POST URL.
export default function AddCustomSystemoneModal({ isOpen, onClose, onCreated, onSaved, node }) {
  const isEdit = !!node;
  const [formData, setFormData] = useState(EMPTY_FORM);
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
    setFormData(isEdit
      ? { name: node.name || "", prefix: node.prefix || "", baseUrl: node.baseUrl || "" }
      : EMPTY_FORM);
  }, [isOpen, isEdit, node]);

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
        <Input
          label="Name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Local server"
          hint="Required. Label on the System One page."
        />
        <Input
          label="Prefix"
          value={formData.prefix}
          onChange={(e) => setFormData({ ...formData, prefix: e.target.value })}
          placeholder="local"
          hint="Required. Model ids look like prefix/model."
        />
        <Input
          label="URL"
          value={formData.baseUrl}
          onChange={(e) => setFormData({ ...formData, baseUrl: e.target.value })}
          placeholder="http://127.0.0.1:8000/v1/systemone"
          hint="Full endpoint. Requests are POSTed here as JSON."
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
          hint="Optional. Sent as Authorization: Bearer when the server requires a key."
        />
        <Input
          label="Model ID (for Check)"
          value={checkModelId}
          onChange={(e) => setCheckModelId(e.target.value)}
          placeholder="model-id"
          hint="Optional. Sent as the model field when Check calls the endpoint."
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
  }),
};
