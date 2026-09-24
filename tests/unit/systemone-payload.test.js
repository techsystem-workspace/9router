import { describe, it, expect } from "vitest";
import {
  defaultSystemoneQuestions,
  questionsReady,
  questionsToBody,
} from "../../src/laya/payload.js";

describe("custom systemone example payload", () => {
  it("builds the default decision payload", () => {
    expect(questionsToBody(defaultSystemoneQuestions())).toEqual({
      is_urgent: {
        type: "noul",
        instructions: "Does this request require urgent attention?",
      },
    });
    expect(questionsReady(defaultSystemoneQuestions())).toBe(true);
  });

  it("includes choice and score criteria and skips a blank question", () => {
    const body = questionsToBody([
      {
        name: " topic ",
        type: "choice",
        instructions: " Which queue? ",
        choiceCriteria: [
          { label: "billing", description: "Payment failed" },
          { label: "", description: "ignored" },
        ],
      },
      {
        name: "severity",
        type: "score",
        instructions: "How severe?",
        scoreLevels: ["low", " ", "high"],
      },
      { name: "  ", type: "noul", instructions: "ignored" },
    ]);

    expect(body).toEqual({
      topic: {
        type: "choice",
        instructions: "Which queue?",
        criteria: { billing: "Payment failed" },
      },
      severity: {
        type: "score",
        instructions: "How severe?",
        criteria: ["low", "high"],
      },
    });
  });

  it("is not ready when a named question is incomplete or duplicated", () => {
    expect(questionsReady([{ name: "is_urgent", type: "noul", instructions: "  " }])).toBe(false);
    expect(questionsReady([{ name: "topic", type: "choice", instructions: "Which?", choiceCriteria: [] }])).toBe(false);
    expect(questionsReady([
      { name: "is_urgent", type: "noul", instructions: "Now?" },
      { name: "is_urgent", type: "noul", instructions: "Again?" },
    ])).toBe(false);
  });
});
