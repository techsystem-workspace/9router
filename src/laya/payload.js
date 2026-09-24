// Request body for the custom System One example card.
// Shape matches laya-serve: { model, state, questions: { name: { type, instructions, criteria? } } }.

export const SYSTEMONE_QUESTION_TYPES = ["noul", "choice", "score"];

export function blankSystemoneQuestion() {
  return {
    name: "",
    type: "noul",
    instructions: "",
    choiceCriteria: [{ label: "", description: "" }],
    scoreLevels: [""],
  };
}

export function defaultSystemoneQuestions() {
  return [{
    ...blankSystemoneQuestion(),
    name: "is_urgent",
    instructions: "Does this request require urgent attention?",
  }];
}

function choiceCriteria(rows) {
  const criteria = {};
  for (const row of rows || []) {
    const label = String(row?.label || "").trim();
    if (!label || Object.prototype.hasOwnProperty.call(criteria, label)) continue;
    criteria[label] = String(row?.description ?? "");
  }
  return criteria;
}

function scoreLevels(levels) {
  return (levels || []).map((level) => String(level ?? "").trim()).filter(Boolean);
}

export function questionsToBody(questions) {
  const body = {};
  for (const question of questions || []) {
    const name = String(question?.name || "").trim();
    if (!name || Object.prototype.hasOwnProperty.call(body, name)) continue;
    const type = SYSTEMONE_QUESTION_TYPES.includes(question.type) ? question.type : "noul";
    const entry = {
      type,
      instructions: String(question?.instructions || "").trim(),
    };
    if (type === "choice") {
      const criteria = choiceCriteria(question.choiceCriteria);
      if (Object.keys(criteria).length) entry.criteria = criteria;
    } else if (type === "score") {
      const criteria = scoreLevels(question.scoreLevels);
      if (criteria.length) entry.criteria = criteria;
    }
    body[name] = entry;
  }
  return body;
}

export function questionsReady(questions) {
  const named = (questions || []).filter((question) => String(question?.name || "").trim());
  if (!named.length) return false;
  const names = named.map((question) => String(question.name).trim());
  if (new Set(names).size !== names.length) return false;
  return named.every((question) => {
    if (!String(question.instructions || "").trim()) return false;
    if (question.type === "choice") return Object.keys(choiceCriteria(question.choiceCriteria)).length > 0;
    if (question.type === "score") return scoreLevels(question.scoreLevels).length > 0;
    return question.type === "noul" || !question.type;
  });
}
