import { describe, it, expect } from "vitest";
import { parseSystemoneModelList, systemoneModelsUrl } from "../../src/laya/fetchModels.js";

describe("custom systemone model fetch", () => {
  it("derives /v1/models from the decision endpoint", () => {
    expect(systemoneModelsUrl("http://127.0.0.1:3333/v1/systemone/")).toBe("http://127.0.0.1:3333/v1/models");
    expect(systemoneModelsUrl("http://127.0.0.1:3333/v1")).toBe("http://127.0.0.1:3333/v1/models");
    expect(systemoneModelsUrl("http://127.0.0.1:3333/v1/models")).toBe("http://127.0.0.1:3333/v1/models");
    expect(systemoneModelsUrl("")).toBe("");
  });

  it("reads OpenAI-style ids and drops this node's prefix", () => {
    const models = parseSystemoneModelList({
      data: [
        { id: "laya/Winnow-12B", name: "Winnow" },
        { id: "english" },
        "english",
        { id: "" },
      ],
    }, "laya");
    expect(models).toEqual([
      { id: "Winnow-12B", name: "Winnow" },
      { id: "english", name: "english" },
    ]);
  });
});
