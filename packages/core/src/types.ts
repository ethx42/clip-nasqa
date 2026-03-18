// DynamoDB item interfaces (as stored in the table)

export interface SessionItem {
  PK: string; // SESSION#code
  SK: string; // SESSION#code
  code: string;
  title: string;
  isActive: boolean;
  createdAt: number; // Unix epoch seconds
  TTL: number; // Unix epoch seconds
}

export interface SnippetItem {
  PK: string; // SESSION#code
  SK: string; // SNIPPET#ulid
  id: string;
  sessionCode: string;
  type: string;
  content: string;
  language?: string;
  createdAt: number;
  TTL: number;
  editedAt?: number;
  deletedAt?: number;
}

export interface QuestionItem {
  PK: string; // SESSION#code
  SK: string; // QUESTION#ulid
  id: string;
  sessionCode: string;
  text: string;
  fingerprint: string;
  authorName?: string;
  isHostQuestion: boolean;
  upvoteCount: number;
  downvoteCount: number;
  isHidden: boolean;
  isFocused: boolean;
  isBanned: boolean;
  createdAt: number;
  TTL: number;
  editedAt?: number;
  deletedAt?: number;
}

export interface ReplyItem {
  PK: string; // SESSION#code
  SK: string; // REPLY#ulid
  id: string;
  questionId: string;
  sessionCode: string;
  text: string;
  isHostReply: boolean;
  fingerprint: string;
  authorName?: string;
  createdAt: number;
  TTL: number;
  editedAt?: number;
  deletedAt?: number;
}

// Application interfaces (used in resolvers — no DynamoDB internals)

export interface Session {
  code: string;
  title: string;
  isActive: boolean;
  createdAt: number;
  TTL: number;
}

export interface Snippet {
  id: string;
  sessionCode: string;
  type: string;
  content: string;
  language?: string;
  createdAt: number;
  TTL: number;
  editedAt?: number;
}

export interface Question {
  id: string;
  sessionCode: string;
  text: string;
  fingerprint: string;
  authorName?: string;
  isHostQuestion: boolean;
  upvoteCount: number;
  downvoteCount: number;
  isHidden: boolean;
  isFocused: boolean;
  isBanned: boolean;
  reactionCounts?: string; // AWSJSON — JSON.stringify of ReactionCounts
  reactionOrder?: string; // AWSJSON — JSON.stringify of EmojiKey[] (insertion order)
  createdAt: number;
  TTL: number;
  editedAt?: number;
}

export interface Reply {
  id: string;
  questionId: string;
  sessionCode: string;
  text: string;
  isHostReply: boolean;
  fingerprint: string;
  authorName?: string;
  reactionCounts?: string; // AWSJSON — JSON.stringify of ReactionCounts
  reactionOrder?: string; // AWSJSON — JSON.stringify of EmojiKey[] (insertion order)
  createdAt: number;
  TTL: number;
  editedAt?: number;
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
  QUESTION_EDITED = "QUESTION_EDITED",
  QUESTION_DELETED = "QUESTION_DELETED",
  REPLY_EDITED = "REPLY_EDITED",
  REPLY_DELETED = "REPLY_DELETED",
  SNIPPET_EDITED = "SNIPPET_EDITED",
}

// SessionUpdate tagged union — mirrors the GraphQL SessionUpdate type
export interface SessionUpdate {
  eventType: SessionEventType;
  sessionCode: string;
  payload: unknown;
}

// AppSync resolver context for API key auth (no identity object)
export interface AppSyncResolverContext<TArgs = Record<string, unknown>> {
  arguments: TArgs;
  identity: null;
}

// Mutation argument interfaces
export interface PushSnippetArgs {
  sessionCode: string;
  hostSecretHash: string;
  content: string;
  type: string;
  language?: string;
}
export interface DeleteSnippetArgs {
  sessionCode: string;
  hostSecretHash: string;
  snippetId: string;
}
export interface ClearClipboardArgs {
  sessionCode: string;
  hostSecretHash: string;
}
export interface AddQuestionArgs {
  sessionCode: string;
  text: string;
  fingerprint: string;
  authorName?: string;
  isHostQuestion: boolean;
}
export interface UpvoteQuestionArgs {
  sessionCode: string;
  questionId: string;
  fingerprint: string;
  remove?: boolean;
}
export interface AddReplyArgs {
  sessionCode: string;
  questionId: string;
  text: string;
  fingerprint: string;
  isHostReply: boolean;
  authorName?: string;
}
export interface FocusQuestionArgs {
  sessionCode: string;
  hostSecretHash: string;
  questionId?: string;
}
export interface GetSessionDataArgs {
  sessionCode: string;
}

// Moderation mutation argument interfaces
export interface BanQuestionArgs {
  sessionCode: string;
  hostSecretHash: string;
  questionId: string;
}
export interface BanParticipantArgs {
  sessionCode: string;
  hostSecretHash: string;
  fingerprint: string;
}
export interface DownvoteQuestionArgs {
  sessionCode: string;
  questionId: string;
  fingerprint: string;
  remove?: boolean;
}
export interface RestoreQuestionArgs {
  sessionCode: string;
  hostSecretHash: string;
  questionId: string;
}

// BAN item interface
export interface BanItem {
  PK: string; // SESSION#code
  SK: string; // BAN#fingerprint
  fingerprint: string;
  isBanned: boolean;
  bannedPostCount: number;
  TTL: number;
}

// Edit/Delete mutation argument interfaces
export interface EditQuestionArgs {
  sessionCode: string;
  questionId: string;
  text: string;
  fingerprint?: string;
  hostSecretHash?: string;
}
export interface DeleteQuestionArgs {
  sessionCode: string;
  questionId: string;
  fingerprint?: string;
  hostSecretHash?: string;
}
export interface EditReplyArgs {
  sessionCode: string;
  replyId: string;
  text: string;
  fingerprint?: string;
  hostSecretHash?: string;
}
export interface DeleteReplyArgs {
  sessionCode: string;
  replyId: string;
  fingerprint?: string;
  hostSecretHash?: string;
}
export interface EditSnippetArgs {
  sessionCode: string;
  snippetId: string;
  content: string;
  language?: string;
  hostSecretHash: string;
}

// Reaction mutation argument interface
export interface ReactArgs {
  sessionCode: string;
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
