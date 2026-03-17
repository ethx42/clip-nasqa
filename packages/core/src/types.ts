// DynamoDB item interfaces (as stored in the table)

export interface SessionItem {
  PK: string; // SESSION#slug
  SK: string; // SESSION#slug
  slug: string;
  title: string;
  isActive: boolean;
  createdAt: number; // Unix epoch seconds
  TTL: number; // Unix epoch seconds
}

export interface SnippetItem {
  PK: string; // SESSION#slug
  SK: string; // SNIPPET#ulid
  id: string;
  sessionSlug: string;
  type: string;
  content: string;
  language?: string;
  createdAt: number;
  TTL: number;
}

export interface QuestionItem {
  PK: string; // SESSION#slug
  SK: string; // QUESTION#ulid
  id: string;
  sessionSlug: string;
  text: string;
  fingerprint: string;
  authorName?: string;
  upvoteCount: number;
  downvoteCount: number;
  isHidden: boolean;
  isFocused: boolean;
  isBanned: boolean;
  createdAt: number;
  TTL: number;
}

export interface ReplyItem {
  PK: string; // SESSION#slug
  SK: string; // REPLY#ulid
  id: string;
  questionId: string;
  sessionSlug: string;
  text: string;
  isHostReply: boolean;
  fingerprint: string;
  createdAt: number;
  TTL: number;
}

// Application interfaces (used in resolvers — no DynamoDB internals)

export interface Session {
  slug: string;
  title: string;
  isActive: boolean;
  createdAt: number;
  TTL: number;
}

export interface Snippet {
  id: string;
  sessionSlug: string;
  type: string;
  content: string;
  language?: string;
  createdAt: number;
  TTL: number;
}

export interface Question {
  id: string;
  sessionSlug: string;
  text: string;
  fingerprint: string;
  authorName?: string;
  upvoteCount: number;
  downvoteCount: number;
  isHidden: boolean;
  isFocused: boolean;
  isBanned: boolean;
  reactionCounts?: string; // AWSJSON — JSON.stringify of ReactionCounts
  reactionOrder?: string; // AWSJSON — JSON.stringify of EmojiKey[] (insertion order)
  createdAt: number;
  TTL: number;
}

export interface Reply {
  id: string;
  questionId: string;
  sessionSlug: string;
  text: string;
  isHostReply: boolean;
  fingerprint: string;
  reactionCounts?: string; // AWSJSON — JSON.stringify of ReactionCounts
  reactionOrder?: string; // AWSJSON — JSON.stringify of EmojiKey[] (insertion order)
  createdAt: number;
  TTL: number;
}

// SessionEventType enum matching GraphQL schema
export enum SessionEventType {
  SNIPPET_ADDED = "SNIPPET_ADDED",
  SNIPPET_DELETED = "SNIPPET_DELETED",
  CLIPBOARD_CLEARED = "CLIPBOARD_CLEARED",
  QUESTION_ADDED = "QUESTION_ADDED",
  QUESTION_UPDATED = "QUESTION_UPDATED",
  REPLY_ADDED = "REPLY_ADDED",
  PARTICIPANT_BANNED = "PARTICIPANT_BANNED",
  REACTION_UPDATED = "REACTION_UPDATED",
}

// SessionUpdate tagged union — mirrors the GraphQL SessionUpdate type
export interface SessionUpdate {
  eventType: SessionEventType;
  sessionSlug: string;
  payload: unknown;
}

// AppSync resolver context for API key auth (no identity object)
export interface AppSyncResolverContext<TArgs = Record<string, unknown>> {
  arguments: TArgs;
  identity: null;
}

// Mutation argument interfaces
export interface PushSnippetArgs {
  sessionSlug: string;
  hostSecretHash: string;
  content: string;
  type: string;
  language?: string;
}
export interface DeleteSnippetArgs {
  sessionSlug: string;
  hostSecretHash: string;
  snippetId: string;
}
export interface ClearClipboardArgs {
  sessionSlug: string;
  hostSecretHash: string;
}
export interface AddQuestionArgs {
  sessionSlug: string;
  text: string;
  fingerprint: string;
  authorName?: string;
}
export interface UpvoteQuestionArgs {
  sessionSlug: string;
  questionId: string;
  fingerprint: string;
  remove?: boolean;
}
export interface AddReplyArgs {
  sessionSlug: string;
  questionId: string;
  text: string;
  fingerprint: string;
  isHostReply: boolean;
  authorName?: string;
}
export interface FocusQuestionArgs {
  sessionSlug: string;
  hostSecretHash: string;
  questionId?: string;
}
export interface GetSessionDataArgs {
  sessionSlug: string;
}

// Moderation mutation argument interfaces
export interface BanQuestionArgs {
  sessionSlug: string;
  hostSecretHash: string;
  questionId: string;
}
export interface BanParticipantArgs {
  sessionSlug: string;
  hostSecretHash: string;
  fingerprint: string;
}
export interface DownvoteQuestionArgs {
  sessionSlug: string;
  questionId: string;
  fingerprint: string;
  remove?: boolean;
}
export interface RestoreQuestionArgs {
  sessionSlug: string;
  hostSecretHash: string;
  questionId: string;
}

// BAN item interface
export interface BanItem {
  PK: string; // SESSION#slug
  SK: string; // BAN#fingerprint
  fingerprint: string;
  isBanned: boolean;
  bannedPostCount: number;
  TTL: number;
}

// Reaction mutation argument interface
export interface ReactArgs {
  sessionSlug: string;
  targetId: string;
  targetType: "QUESTION" | "REPLY";
  emoji: string; // validated against emojiKeySchema in the resolver
  fingerprint: string;
}

// Reaction counts for all 6 emojis (used in mutation response and subscription payload)
export interface ReactionCounts {
  thumbsup: number;
  heart: number;
  party: number;
  laugh: number;
  thinking: number;
  eyes: number;
}
