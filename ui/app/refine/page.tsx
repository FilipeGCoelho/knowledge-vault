"use client";
import React from "react";
import dynamic from "next/dynamic";
import { postRefine } from "../../lib/api";

const RefinementPane = dynamic(
  () => import("../../components/RefinementPane").then((m) => m.RefinementPane),
  { ssr: false }
);

export default function RefinePage() {
  return (
    <section>
      <h1>Prompt Refinement</h1>
      <RefinementPane
        onRefine={async (goal, contextRefs, weights) => {
          const { refinedPrompt, studyPlan } = await postRefine({
            goal,
            contextRefs,
            weights,
          });
          return { refinedPrompt, studyPlan };
        }}
      />
    </section>
  );
}
