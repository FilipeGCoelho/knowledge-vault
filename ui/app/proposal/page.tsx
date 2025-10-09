"use client";
import React from "react";
import dynamic from "next/dynamic";
import { postProposal } from "../../lib/api";

const ProposalPane = dynamic(() => import("../../components/ProposalPane").then(m => m.ProposalPane), { ssr: false });

export default function ProposalPage() {
  return (
    <section>
      <h1>Proposal Viewer</h1>
      <ProposalPane
        onGenerate={async (input) => {
          const data = await postProposal(input);
          return { proposal: data.proposal };
        }}
      />
    </section>
  );
}
