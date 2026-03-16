import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";

import { QAInput } from "@/components/session/qa-input";

import messages from "../../messages/en.json";

function renderInput(
  props: { onSubmit?: ReturnType<typeof vi.fn>; disabled?: boolean; isBanned?: boolean } = {},
) {
  const onSubmit = props.onSubmit ?? vi.fn();

  const result = render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <QAInput onSubmit={onSubmit} disabled={props.disabled} isBanned={props.isBanned} />
    </NextIntlClientProvider>,
  );

  return { ...result, onSubmit };
}

describe("QAInput", () => {
  it("renders input with placeholder text from translations", () => {
    renderInput();
    expect(screen.getByPlaceholderText("Ask a question...")).toBeInTheDocument();
  });

  it("submit button is disabled when input is empty", () => {
    renderInput();
    const submitButton = screen.getByRole("button", { name: /send question/i });
    expect(submitButton).toBeDisabled();
  });

  it("calls onSubmit with trimmed input text when submit button is clicked", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    renderInput({ onSubmit });

    const textarea = screen.getByPlaceholderText("Ask a question...");
    await user.type(textarea, "  How does this work?  ");

    const submitButton = screen.getByRole("button", { name: /send question/i });
    await user.click(submitButton);

    expect(onSubmit).toHaveBeenCalledWith("How does this work?");
  });

  it("clears input after successful submit", async () => {
    const user = userEvent.setup();
    renderInput();

    const textarea = screen.getByPlaceholderText("Ask a question...");
    await user.type(textarea, "Test question");
    await user.click(screen.getByRole("button", { name: /send question/i }));

    expect(textarea).toHaveValue("");
  });

  it("shows character counter when input exceeds 80% of limit (400+ chars)", async () => {
    const user = userEvent.setup();
    renderInput();

    const textarea = screen.getByPlaceholderText("Ask a question...");
    // Type 401 characters (just above the 400 threshold)
    const longText = "a".repeat(401);
    await user.type(textarea, longText);

    expect(screen.getByText("401/500")).toBeInTheDocument();
  });

  it("does not show character counter for short inputs", async () => {
    const user = userEvent.setup();
    renderInput();

    const textarea = screen.getByPlaceholderText("Ask a question...");
    await user.type(textarea, "Short question");

    expect(screen.queryByText(/\/500/)).not.toBeInTheDocument();
  });

  it("shows banned message and no textarea when isBanned is true", () => {
    renderInput({ isBanned: true });
    expect(
      screen.getByText("You've been blocked from posting in this session."),
    ).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Ask a question...")).not.toBeInTheDocument();
  });

  it("submit button is disabled when input is only whitespace", async () => {
    const user = userEvent.setup();
    renderInput();

    const textarea = screen.getByPlaceholderText("Ask a question...");
    await user.type(textarea, "   ");

    const submitButton = screen.getByRole("button", { name: /send question/i });
    expect(submitButton).toBeDisabled();
  });
});
