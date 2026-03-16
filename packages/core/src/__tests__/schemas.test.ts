import { describe, expect, it } from "vitest";

import {
  createQuestionInputSchema,
  createSessionInputSchema,
  createSnippetInputSchema,
} from "../schemas";

describe("createSessionInputSchema", () => {
  it("accepts valid title", () => {
    expect(createSessionInputSchema.parse({ title: "My Session" })).toEqual({
      title: "My Session",
    });
  });

  it("rejects empty title", () => {
    expect(() => createSessionInputSchema.parse({ title: "" })).toThrow();
  });

  it("rejects title over 50 chars", () => {
    expect(() => createSessionInputSchema.parse({ title: "a".repeat(51) })).toThrow();
  });

  it("accepts title at max length (50 chars)", () => {
    const title = "a".repeat(50);
    expect(createSessionInputSchema.parse({ title })).toEqual({ title });
  });

  it("strips unknown fields", () => {
    const result = createSessionInputSchema.parse({
      title: "Valid",
      extra: "ignored",
    });
    expect(result).toEqual({ title: "Valid" });
    expect("extra" in result).toBe(false);
  });

  it("rejects missing title", () => {
    expect(() => createSessionInputSchema.parse({})).toThrow();
  });

  it("rejects non-string title", () => {
    expect(() => createSessionInputSchema.parse({ title: 42 })).toThrow();
  });
});

describe("createSnippetInputSchema", () => {
  const validSnippet = {
    sessionSlug: "my-session-abc",
    type: "text" as const,
    content: "Hello world",
  };

  it("accepts valid text snippet", () => {
    expect(createSnippetInputSchema.parse(validSnippet)).toEqual(validSnippet);
  });

  it("accepts valid code snippet with language", () => {
    const snippet = { ...validSnippet, type: "code" as const, language: "typescript" };
    expect(createSnippetInputSchema.parse(snippet)).toEqual(snippet);
  });

  it("rejects empty content", () => {
    expect(() => createSnippetInputSchema.parse({ ...validSnippet, content: "" })).toThrow();
  });

  it("rejects content over 10000 chars", () => {
    expect(() =>
      createSnippetInputSchema.parse({ ...validSnippet, content: "a".repeat(10001) }),
    ).toThrow();
  });

  it("accepts content at max length (10000 chars)", () => {
    const content = "a".repeat(10000);
    expect(createSnippetInputSchema.parse({ ...validSnippet, content })).toMatchObject({
      content,
    });
  });

  it("rejects invalid type", () => {
    expect(() => createSnippetInputSchema.parse({ ...validSnippet, type: "image" })).toThrow();
  });

  it("accepts optional language as undefined", () => {
    const result = createSnippetInputSchema.parse({ ...validSnippet, language: undefined });
    expect(result.language).toBeUndefined();
  });

  it("rejects missing required fields", () => {
    expect(() => createSnippetInputSchema.parse({ type: "text" })).toThrow();
  });
});

describe("createQuestionInputSchema", () => {
  const validQuestion = {
    sessionSlug: "my-session-abc",
    text: "What is your name?",
    fingerprint: "123e4567-e89b-12d3-a456-426614174000",
  };

  it("accepts valid question input", () => {
    expect(createQuestionInputSchema.parse(validQuestion)).toEqual(validQuestion);
  });

  it("accepts question with optional authorName", () => {
    const input = { ...validQuestion, authorName: "Alice" };
    expect(createQuestionInputSchema.parse(input)).toEqual(input);
  });

  it("rejects empty text", () => {
    expect(() => createQuestionInputSchema.parse({ ...validQuestion, text: "" })).toThrow();
  });

  it("rejects text over 500 chars", () => {
    expect(() =>
      createQuestionInputSchema.parse({ ...validQuestion, text: "a".repeat(501) }),
    ).toThrow();
  });

  it("accepts text at max length (500 chars)", () => {
    const text = "a".repeat(500);
    expect(createQuestionInputSchema.parse({ ...validQuestion, text })).toMatchObject({ text });
  });

  it("rejects invalid fingerprint (not a UUID)", () => {
    expect(() =>
      createQuestionInputSchema.parse({ ...validQuestion, fingerprint: "not-a-uuid" }),
    ).toThrow();
  });

  it("rejects authorName over 50 chars", () => {
    expect(() =>
      createQuestionInputSchema.parse({ ...validQuestion, authorName: "a".repeat(51) }),
    ).toThrow();
  });

  it("accepts authorName at max length (50 chars)", () => {
    const authorName = "a".repeat(50);
    expect(createQuestionInputSchema.parse({ ...validQuestion, authorName })).toMatchObject({
      authorName,
    });
  });

  it("strips unknown fields", () => {
    const result = createQuestionInputSchema.parse({ ...validQuestion, extra: "ignored" });
    expect("extra" in result).toBe(false);
  });

  it("rejects missing required sessionSlug", () => {
    const { sessionSlug: _removed, ...rest } = validQuestion;
    expect(() => createQuestionInputSchema.parse(rest)).toThrow();
  });
});
