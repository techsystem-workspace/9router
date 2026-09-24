"use client";

import { blankSystemoneQuestion, questionsReady, SYSTEMONE_QUESTION_TYPES } from "./payload";

const fieldClass = "w-full px-3 py-1.5 text-sm border border-border rounded-lg bg-background focus:outline-none focus:border-primary";

function FieldLabel({ children }) {
  return <span className="text-xs font-medium text-text-muted">{children}</span>;
}

export default function SystemonePayloadFields({ input, onInput, placeholder, questions, onQuestions }) {
  const update = (index, patch) => {
    onQuestions(questions.map((question, i) => (i === index ? { ...question, ...patch } : question)));
  };

  const updateChoice = (index, rowIndex, patch) => {
    const rows = questions[index].choiceCriteria.map((row, i) => (i === rowIndex ? { ...row, ...patch } : row));
    update(index, { choiceCriteria: rows });
  };

  return (
    <div className="flex flex-col gap-2.5">
      <label className="flex flex-col gap-1.5">
        <FieldLabel>State</FieldLabel>
        <textarea
          value={input}
          onChange={(e) => onInput(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className={fieldClass}
        />
      </label>

      <div className="flex items-center justify-between gap-2">
        <FieldLabel>Questions</FieldLabel>
        <button
          type="button"
          onClick={() => onQuestions([...questions, blankSystemoneQuestion()])}
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
        >
          <span className="material-symbols-outlined text-[14px]">add</span>
          Add question
        </button>
      </div>

      {questions.map((question, index) => (
        <div key={index} className="rounded-lg border border-border p-3 flex flex-col gap-2">
          <div className="flex items-end gap-2">
            <label className="flex min-w-0 flex-1 flex-col gap-1.5">
              <FieldLabel>Name</FieldLabel>
              <input
                value={question.name}
                onChange={(e) => update(index, { name: e.target.value })}
                placeholder="is_urgent"
                className={`${fieldClass} font-mono`}
              />
            </label>
            <label className="flex w-28 shrink-0 flex-col gap-1.5">
              <FieldLabel>Type</FieldLabel>
              <select
                value={question.type}
                onChange={(e) => update(index, { type: e.target.value })}
                className={fieldClass}
              >
                {SYSTEMONE_QUESTION_TYPES.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => onQuestions(questions.filter((_, i) => i !== index))}
              className="mb-1.5 inline-flex shrink-0 items-center justify-center text-text-muted hover:text-primary"
              aria-label="Remove question"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>

          <label className="flex flex-col gap-1.5">
            <FieldLabel>Instructions</FieldLabel>
            <textarea
              value={question.instructions}
              onChange={(e) => update(index, { instructions: e.target.value })}
              placeholder="What should this question decide?"
              rows={2}
              className={fieldClass}
            />
          </label>

          {question.type === "choice" && (
            <div className="flex flex-col gap-1.5">
              <FieldLabel>Criteria</FieldLabel>
              {question.choiceCriteria.map((row, rowIndex) => (
                <div key={rowIndex} className="flex flex-col gap-2 sm:flex-row">
                  <input
                    value={row.label}
                    onChange={(e) => updateChoice(index, rowIndex, { label: e.target.value })}
                    placeholder="label"
                    className={`${fieldClass} font-mono sm:w-40`}
                  />
                  <input
                    value={row.description}
                    onChange={(e) => updateChoice(index, rowIndex, { description: e.target.value })}
                    placeholder="description"
                    className={fieldClass}
                  />
                  <button
                    type="button"
                    onClick={() => update(index, {
                      choiceCriteria: question.choiceCriteria.filter((_, i) => i !== rowIndex),
                    })}
                    className="text-text-muted hover:text-primary"
                    aria-label="Remove option"
                  >
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => update(index, {
                  choiceCriteria: [...question.choiceCriteria, { label: "", description: "" }],
                })}
                className="self-start text-xs text-primary hover:underline"
              >
                Add option
              </button>
            </div>
          )}

          {question.type === "score" && (
            <div className="flex flex-col gap-1.5">
              <FieldLabel>Levels</FieldLabel>
              {question.scoreLevels.map((level, levelIndex) => (
                <div key={levelIndex} className="flex gap-2">
                  <input
                    value={level}
                    onChange={(e) => update(index, {
                      scoreLevels: question.scoreLevels.map((item, i) => (i === levelIndex ? e.target.value : item)),
                    })}
                    placeholder="level"
                    className={fieldClass}
                  />
                  <button
                    type="button"
                    onClick={() => update(index, {
                      scoreLevels: question.scoreLevels.filter((_, i) => i !== levelIndex),
                    })}
                    className="text-text-muted hover:text-primary"
                    aria-label="Remove level"
                  >
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => update(index, { scoreLevels: [...question.scoreLevels, ""] })}
                className="self-start text-xs text-primary hover:underline"
              >
                Add level
              </button>
            </div>
          )}
        </div>
      ))}

      {!questionsReady(questions) && (
        <p className="text-xs text-text-muted">
          Each question needs a unique name and instructions. Choice needs at least one option label. Score needs at least one level.
        </p>
      )}
    </div>
  );
}
