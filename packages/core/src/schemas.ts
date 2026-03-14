import { z } from "zod";

// Input schema for creating a session
export const createSessionInputSchema = z.object({
  title: z.string().min(1).max(50),
});

export type CreateSessionInput = z.infer<typeof createSessionInputSchema>;

// Input schema for creating a snippet
export const createSnippetInputSchema = z.object({
  sessionSlug: z.string(),
  type: z.enum(["text", "code"]),
  content: z.string().min(1).max(10000),
  language: z.string().optional(),
});

export type CreateSnippetInput = z.infer<typeof createSnippetInputSchema>;

// Input schema for creating a question
export const createQuestionInputSchema = z.object({
  sessionSlug: z.string(),
  text: z.string().min(1).max(500),
  fingerprint: z.string().uuid(),
  authorName: z.string().max(50).optional(),
});

export type CreateQuestionInput = z.infer<typeof createQuestionInputSchema>;
