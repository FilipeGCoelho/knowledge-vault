import Link from "next/link";

export default function HomePage() {
  return (
    <section>
      <h1>KMV Console</h1>
      <p>Local-first console. Use the nav to access Refinement and Proposal flows.</p>
      <ul>
        <li><Link href="/refine">Prompt Refinement</Link></li>
        <li><Link href="/proposal">Proposal Viewer</Link></li>
      </ul>
    </section>
  );
}
