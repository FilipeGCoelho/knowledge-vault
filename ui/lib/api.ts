export const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3030';

export type RefineRequest = {
  goal: string;
  contextRefs?: string[];
  weights?: Record<string, number>;
  options?: { autoStripAdditionalProps?: boolean };
};

export async function postRefine(body: RefineRequest) {
  const res = await fetch(`${API_BASE}/refine`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const err = await safeJson(res);
    throw new Error(err?.message || `Refine failed (${res.status})`);
  }
  return res.json();
}

export async function postProposal(body: { prompt?: string; refined_text?: string }) {
  const res = await fetch(`${API_BASE}/proposal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const err = await safeJson(res);
    throw new Error(err?.message || `Proposal failed (${res.status})`);
    }
  return res.json();
}

async function safeJson(res: Response) {
  try { return await res.json(); } catch { return undefined; }
}
