import React, { useState } from "react";
import type { RefinedPromptV1, StudyPlanV1 } from "../../src/contracts/types";

export interface RefinementPaneProps {
  onRefine: (
    goal: string,
    contextRefs: string[],
    weights: Record<string, number>
  ) => Promise<
    { refinedPrompt: RefinedPromptV1; studyPlan: StudyPlanV1 } | { error: string }
  >;
}

export const RefinementPane: React.FC<RefinementPaneProps> = ({ onRefine }) => {
  const [goal, setGoal] = useState("");
  const [contextRefs, setContextRefs] = useState<string[]>([]);
  const [weights, setWeights] = useState({ tutor: 0.33, publisher: 0.33, student: 0.34 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refinedPrompt, setRefinedPrompt] = useState<RefinedPromptV1 | null>(null);
  const [studyPlan, setStudyPlan] = useState<StudyPlanV1 | null>(null);

  const handleRefine = async () => {
    setLoading(true);
    setError(null);
    setRefinedPrompt(null);
    setStudyPlan(null);
    try {
      const result = await onRefine(goal, contextRefs, weights);
      if ("error" in result) {
        setError(result.error);
      } else {
        setRefinedPrompt(result.refinedPrompt);
        setStudyPlan(result.studyPlan);
      }
    } catch (e) {
      setError("Unexpected error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div suppressHydrationWarning>
      <h2>Prompt Refinement</h2>
      <label>
        Learning Goal
        <textarea
          value={goal}
          minLength={8}
          maxLength={4000}
          onChange={e => setGoal(e.target.value)}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
        />
      </label>
      <div>
        <label>Context References (max 8)</label>
        <input
          type="text"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          onKeyDown={e => {
            if (e.key === "Enter" && e.currentTarget.value) {
              setContextRefs([...contextRefs, e.currentTarget.value]);
              e.currentTarget.value = "";
            }
          }}
        />
        <ul>
          {contextRefs.map((ref, i) => (
            <li key={i}>
              {ref}{" "}
              <button onClick={() => setContextRefs(contextRefs.filter((_, idx) => idx !== i))}>Remove</button>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <label>Tutor Weight</label>
        <input type="range" min={0} max={1} step={0.01} value={weights.tutor} onChange={e => setWeights({ ...weights, tutor: Number(e.target.value) })} />
        <label>Publisher Weight</label>
        <input type="range" min={0} max={1} step={0.01} value={weights.publisher} onChange={e => setWeights({ ...weights, publisher: Number(e.target.value) })} />
        <label>Student Weight</label>
        <input type="range" min={0} max={1} step={0.01} value={weights.student} onChange={e => setWeights({ ...weights, student: Number(e.target.value) })} />
      </div>
      <button disabled={loading || goal.length < 8} onClick={handleRefine}>Refine</button>
      {loading && <div>Loading...</div>}
      {error && <div style={{ color: "red" }}>{error}</div>}
      {refinedPrompt && (
        <div>
          <h3>Refined Prompt</h3>
          <pre>{refinedPrompt.refined_text}</pre>
        </div>
      )}
      {studyPlan && (
        <div>
          <h3>Study Plan</h3>
          <pre>{JSON.stringify(studyPlan, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};
