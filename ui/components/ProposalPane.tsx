import React, { useState } from "react";
import type { ProposalV1 } from "../../src/contracts/types";

export interface ProposalPaneProps {
  onGenerate: (input: { prompt?: string; refined_text?: string }) => Promise<{ proposal: ProposalV1 } | { error: string }>;
}

export const ProposalPane: React.FC<ProposalPaneProps> = ({ onGenerate }) => {
  const [inputType, setInputType] = useState<"prompt" | "refined">("prompt");
  const [prompt, setPrompt] = useState("");
  const [refinedText, setRefinedText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [proposal, setProposal] = useState<ProposalV1 | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setProposal(null);
    try {
      const result = await onGenerate(
        inputType === "prompt"
          ? { prompt }
          : { refined_text: refinedText }
      );
      if ("error" in result) {
        setError(result.error);
      } else {
        setProposal(result.proposal);
      }
    } catch (e) {
      setError("Unexpected error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div suppressHydrationWarning>
      <h2>Proposal Generator</h2>
      <div>
        <label>
          <input type="radio" checked={inputType === "prompt"} onChange={() => setInputType("prompt")} /> Prompt
        </label>
        <label>
          <input type="radio" checked={inputType === "refined"} onChange={() => setInputType("refined")} /> Refined
        </label>
      </div>
      {inputType === "prompt" ? (
        <textarea
          value={prompt}
          minLength={8}
          maxLength={4000}
          onChange={e => setPrompt(e.target.value)}
          placeholder="Enter prompt"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
        />
      ) : (
        <textarea
          value={refinedText}
          minLength={8}
          maxLength={4000}
          onChange={e => setRefinedText(e.target.value)}
          placeholder="Paste refined_text"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
        />
      )}
      <button disabled={loading || (inputType === "prompt" ? prompt.length < 8 : refinedText.length < 8)} onClick={handleGenerate}>Generate Proposal</button>
      {loading && <div>Loading...</div>}
      {error && <div style={{ color: "red" }}>{error}</div>}
      {proposal && (
        <div>
          <h3>Proposal</h3>
          <pre>{JSON.stringify(proposal, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};
