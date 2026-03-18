import { z } from "zod";

// Input schema for creating a session
export const createSessionInputSchema = z.object({
  title: z.string().min(1).max(50),
});

export type CreateSessionInput = z.infer<typeof createSessionInputSchema>;

// Input schema for creating a snippet
export const createSnippetInputSchema = z.object({
  sessionCode: z.string(),
  type: z.enum(["text", "code"]),
  content: z.string().min(1).max(10000),
  language: z.string().optional(),
});

export type CreateSnippetInput = z.infer<typeof createSnippetInputSchema>;

// Input schema for creating a question
export const createQuestionInputSchema = z.object({
  sessionCode: z.string(),
  text: z.string().min(1).max(500),
  fingerprint: z.string().uuid(),
  authorName: z.string().max(50).optional(),
});

export type CreateQuestionInput = z.infer<typeof createQuestionInputSchema>;

// Emoji palette — single source of truth for all 6 supported reaction emojis
export const EMOJI_PALETTE = [
  { key: "thumbsup", emoji: "👍", label: "Thumbs up" },
  { key: "heart", emoji: "❤️", label: "Heart" },
  { key: "party", emoji: "🎉", label: "Party" },
  { key: "laugh", emoji: "😂", label: "Laugh" },
  { key: "thinking", emoji: "🤔", label: "Thinking" },
  { key: "eyes", emoji: "👀", label: "Eyes" },
] as const;

export type EmojiKey = (typeof EMOJI_PALETTE)[number]["key"];

const emojiKeys = EMOJI_PALETTE.map((e) => e.key) as [EmojiKey, ...EmojiKey[]];

// Zod schema that validates emoji argument against the 6 allowed keys
export const emojiKeySchema = z.enum(emojiKeys);

// Runtime array of keys for Lambda attribute name construction (e.g. rxn_thumbsup_count)
export const EMOJI_KEYS = emojiKeys;
