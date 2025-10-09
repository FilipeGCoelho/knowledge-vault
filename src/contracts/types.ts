// TypeScript types for UI contract enforcement

/**
 * RefinedPromptV1 contract (strictly matches RefinedPromptV1.schema.json)
 */
export interface RefinedPromptV1 {
  version: 1;
  id: string; // slug-safe, minLength: 8, pattern: ^[a-z0-9\-]{8,}$
  refined_text: string; // minLength: 3
  rationale: string;
  lenses: {
    tutor: number; // [0,1]
    publisher: number; // [0,1]
    student: number; // [0,1]
  };
  constraints?: string[]; // optional
}


/**
 * StudyPlanV1 contract (strictly matches StudyPlanV1.schema.json)
 */
export interface StudyPlanV1 {
  version: 1;
  id: string; // slug-safe, minLength: 8, pattern: ^[a-z0-9\-]{8,}$
  overview: string;
  parts: Array<{
    title: string;
    chapters: Array<{
      title: string;
      modules: Array<{
        title: string;
        outcomes: string[];
        routing_suggestions?: Array<{
          topic: string;
          folder: string;
          filename_slug: string; // pattern: ^[a-z0-9\-]+$
          tags?: string[];
        }>;
        cross_links?: string[];
        prereqs?: string[];
        flags?: {
          foundational?: boolean;
        };
      }>;
    }>;
    meta: {
      reflection?: string[];
      synthesis?: string[];
    };
  }>;
}


/**
 * ProposalV1 contract (strictly matches ProposalV1.schema.json)
 */
export interface ProposalV1 {
  version: 1;
  id: string; // slug-safe, minLength: 8, pattern: ^[a-z0-9\-]{8,}$
  origin: "prompt" | "enhancement" | "health_check";
  target: {
    route_id: string;
    path: string; // pattern: ^[^\0]+\.md$
  };
  frontmatter: {
    title: string; // minLength: 3
    status: "draft" | "in-progress" | "review" | "published" | "archived";
    tags?: string[]; // maxItems: 24
    aliases?: string[]; // maxItems: 8
  };
  body: {
    content_md: string; // minLength: 1
  };
  governance: {
    related_links: string[];
    rationale: string; // minLength: 1
  };
  hash: string; // sha256 hex, pattern: ^[a-f0-9]{64}$
}
