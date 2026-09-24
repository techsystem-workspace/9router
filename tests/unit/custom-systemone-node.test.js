import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const originalDataDir = process.env.DATA_DIR;

async function setupApi() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "9router-custom-systemone-"));
  process.env.DATA_DIR = tempDir;
  vi.resetModules();
  vi.doMock("next/server", () => ({
    NextResponse: {
      json(body, init = {}) {
        return new Response(JSON.stringify(body), {
          status: init.status || 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  }));

  const nodesRoute = await import("@/app/api/provider-nodes/route.js");
  const providersRoute = await import("@/app/api/providers/route.js");
  const { getProviderConnections, getCustomModels } = await import("@/models/index.js");
  const { handleSystemoneCore } = await import("open-sse/handlers/systemoneCore.js");
  const { getModelInfo } = await import("@/sse/services/model.js");

  return {
    tempDir,
    createNode: nodesRoute.POST,
    createConnection: providersRoute.POST,
    getProviderConnections,
    getCustomModels,
    handleSystemoneCore,
    getModelInfo,
    cleanup() {
      fs.rmSync(tempDir, { recursive: true, force: true });
    },
  };
}

function jsonRequest(url, body) {
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("custom systemone nodes", () => {
  let cleanup = () => {};

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.doUnmock("next/server");
    vi.resetModules();
    vi.clearAllMocks();
    cleanup();
    cleanup = () => {};
    if (originalDataDir === undefined) delete process.env.DATA_DIR;
    else process.env.DATA_DIR = originalDataDir;
  });

  it("creates a node with the full endpoint URL and a keyless connection", async () => {
    const ctx = await setupApi();
    cleanup = ctx.cleanup;

    const created = await ctx.createNode(jsonRequest("https://9router.local/api/provider-nodes", {
      type: "custom-systemone",
      name: "Local System One",
      prefix: "sys1",
      baseUrl: "http://127.0.0.1:8000/v1/systemone/",
    }));
    const { node } = await created.json();

    expect(created.status).toBe(201);
    expect(node.id.startsWith("custom-systemone-")).toBe(true);
    expect(node.type).toBe("custom-systemone");
    expect(node.baseUrl).toBe("http://127.0.0.1:8000/v1/systemone");

    const connected = await ctx.createConnection(jsonRequest("https://9router.local/api/providers", {
      provider: node.id,
      name: "local",
      apiKey: "",
    }));
    const { connection } = await connected.json();
    const stored = await ctx.getProviderConnections({ provider: node.id });

    expect(connected.status).toBe(201);
    expect(stored).toHaveLength(1);
    expect(connection.providerSpecificData).toMatchObject({
      prefix: "sys1",
      baseUrl: "http://127.0.0.1:8000/v1/systemone",
      nodeName: "Local System One",
    });

    const resolved = await ctx.getModelInfo("sys1/english");
    expect(resolved).toEqual({ provider: node.id, model: "english" });

    const models = await ctx.getCustomModels();
    expect(models).toEqual([]);
  });

  it("confirms a keyless Laya server from GET /health", async () => {
    const { probeLaya } = await import("@/laya/store.js");
    const originalFetch = globalThis.fetch;
    const calls = [];
    globalThis.fetch = async (url, init) => {
      calls.push({ url: String(url), method: init?.method || "GET" });
      if (String(url).endsWith("/health")) {
        return new Response(JSON.stringify({ status: "ok", loaded: ["english"], device: "cpu" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      throw new Error(`unexpected ${url}`);
    };
    try {
      const result = await probeLaya("http://127.0.0.1:8000/v1/systemone/", "");
      expect(result).toMatchObject({ valid: true, method: "health", loaded: ["english"], device: "cpu" });
      expect(calls).toEqual([{ url: "http://127.0.0.1:8000/health", method: "GET" }]);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("requires a URL and rejects a non-http endpoint", async () => {
    const ctx = await setupApi();
    cleanup = ctx.cleanup;

    const created = await ctx.createNode(jsonRequest("https://9router.local/api/provider-nodes", {
      type: "custom-systemone",
      name: "Default",
      prefix: "sys1",
    }));
    expect(created.status).toBe(400);

    const rejected = await ctx.createNode(jsonRequest("https://9router.local/api/provider-nodes", {
      type: "custom-systemone",
      name: "Bad",
      prefix: "sys1",
      baseUrl: "ftp://127.0.0.1/v1/systemone",
    }));
    expect(rejected.status).toBe(400);
  });

  it("POSTs JSON to the connection URL without the Zen session header", async () => {
    const ctx = await setupApi();
    cleanup = ctx.cleanup;
    const calls = [];
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (url, init) => {
      calls.push({ url, init });
      return new Response(JSON.stringify({
        answers: { probe: { type: "noul", noul: 1 } },
        usage: { input_tokens: 3, output_tokens: 1 },
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    };

    try {
      const result = await ctx.handleSystemoneCore({
        body: { state: "ping", questions: { probe: { type: "noul", instructions: "x" } } },
        modelInfo: { provider: "custom-systemone-abc", model: "jev-1.13" },
        credentials: {
          apiKey: "local-key",
          providerSpecificData: { baseUrl: "http://127.0.0.1:8000/v1/systemone" },
        },
      });

      expect(result.success).toBe(true);
      expect(calls).toHaveLength(1);
      expect(calls[0].url).toBe("http://127.0.0.1:8000/v1/systemone");
      expect(calls[0].init.method).toBe("POST");
      expect(calls[0].init.headers["Content-Type"]).toBe("application/json");
      expect(calls[0].init.headers.Authorization).toBe("Bearer local-key");
      expect(calls[0].init.headers["x-opencode-session"]).toBeUndefined();
      expect(JSON.parse(calls[0].init.body)).toMatchObject({ model: "jev-1.13", state: "ping" });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
