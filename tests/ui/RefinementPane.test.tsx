/// <reference types="vitest" />
/// <reference types="@testing-library/jest-dom" />

import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, fireEvent } from "@testing-library/react";
import { RefinementPane } from "../../ui/components/RefinementPane";

describe("RefinementPane", () => {
  it("renders and disables Refine button for short goal", () => {
    const { getByRole, getByLabelText } = render(<RefinementPane onRefine={vi.fn()} />);
    fireEvent.change(getByLabelText(/Learning Goal/i), { target: { value: "short" } });
    expect(getByRole('button', { name: /^Refine$/i })).toBeDisabled();
  });

  it("calls onRefine and displays results", async () => {
    const mockRefine = vi.fn().mockResolvedValue({
      refinedPrompt: { version: 1, id: "refined-01", refined_text: "refined", lenses: { tutor: 0.4, publisher: 0.3, student: 0.3 }, rationale: "rationale", constraints: [] },
      studyPlan: { version: 1, id: "studyplan-01", overview: "overview", parts: [] }
    });
    const { getByRole, getByLabelText, findByRole } = render(<RefinementPane onRefine={mockRefine} />);
    fireEvent.change(getByLabelText(/Learning Goal/i), { target: { value: "A valid learning goal" } });
    fireEvent.click(getByRole('button', { name: /^Refine$/i }));
    expect(mockRefine).toHaveBeenCalled();
    expect(await findByRole('heading', { name: /^Refined Prompt$/i })).toBeInTheDocument();
    expect(await findByRole('heading', { name: /^Study Plan$/i })).toBeInTheDocument();
  });
});
