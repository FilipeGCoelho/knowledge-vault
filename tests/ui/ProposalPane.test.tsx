/// <reference types="vitest" />
/// <reference types="@testing-library/jest-dom" />

import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, fireEvent } from "@testing-library/react";
import { ProposalPane } from "../../ui/components/ProposalPane";

describe("ProposalPane", () => {
  it("renders and disables Generate button for short input", () => {
    const { getByRole, getByPlaceholderText } = render(<ProposalPane onGenerate={vi.fn()} />);
    fireEvent.change(getByPlaceholderText(/Enter prompt/i), { target: { value: "short" } });
    expect(getByRole('button', { name: /Generate Proposal/i })).toBeDisabled();
  });

  it("calls onGenerate and displays proposal", async () => {
    const mockGenerate = vi.fn().mockResolvedValue({ proposal: { version: 1, id: "proposal-01", origin: "prompt", target: { route_id: "route", path: "path.md" }, frontmatter: { title: "title", status: "draft", tags: [], aliases: [] }, body: { content_md: "body" }, governance: { related_links: [], rationale: "rationale" }, hash: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" } });
    const { getByRole, getByPlaceholderText, findByRole } = render(<ProposalPane onGenerate={mockGenerate} />);
    fireEvent.change(getByPlaceholderText(/Enter prompt/i), { target: { value: "A valid prompt" } });
    fireEvent.click(getByRole('button', { name: /Generate Proposal/i }));
    expect(mockGenerate).toHaveBeenCalled();
    expect(await findByRole('heading', { name: /^Proposal$/i })).toBeInTheDocument();
  });
});
