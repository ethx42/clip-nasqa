export const PUSH_SNIPPET = `
  mutation PushSnippet($sessionSlug: String!, $hostSecretHash: String!, $content: String!, $type: String!, $language: String) {
    pushSnippet(sessionSlug: $sessionSlug, hostSecretHash: $hostSecretHash, content: $content, type: $type, language: $language) {
      eventType
      sessionSlug
      payload
    }
  }
`;

export const DELETE_SNIPPET = `
  mutation DeleteSnippet($sessionSlug: String!, $hostSecretHash: String!, $snippetId: String!) {
    deleteSnippet(sessionSlug: $sessionSlug, hostSecretHash: $hostSecretHash, snippetId: $snippetId) {
      eventType
      sessionSlug
      payload
    }
  }
`;

export const CLEAR_CLIPBOARD = `
  mutation ClearClipboard($sessionSlug: String!, $hostSecretHash: String!) {
    clearClipboard(sessionSlug: $sessionSlug, hostSecretHash: $hostSecretHash) {
      eventType
      sessionSlug
      payload
    }
  }
`;

export const ADD_QUESTION = `
  mutation AddQuestion($sessionSlug: String!, $text: String!, $fingerprint: String!) {
    addQuestion(sessionSlug: $sessionSlug, text: $text, fingerprint: $fingerprint) {
      eventType
      sessionSlug
      payload
    }
  }
`;

export const UPVOTE_QUESTION = `
  mutation UpvoteQuestion($sessionSlug: String!, $questionId: String!, $fingerprint: String!, $remove: Boolean) {
    upvoteQuestion(sessionSlug: $sessionSlug, questionId: $questionId, fingerprint: $fingerprint, remove: $remove) {
      eventType
      sessionSlug
      payload
    }
  }
`;

export const ADD_REPLY = `
  mutation AddReply($sessionSlug: String!, $questionId: String!, $text: String!, $fingerprint: String!, $isHostReply: Boolean!) {
    addReply(sessionSlug: $sessionSlug, questionId: $questionId, text: $text, fingerprint: $fingerprint, isHostReply: $isHostReply) {
      eventType
      sessionSlug
      payload
    }
  }
`;

export const FOCUS_QUESTION = `
  mutation FocusQuestion($sessionSlug: String!, $hostSecretHash: String!, $questionId: String) {
    focusQuestion(sessionSlug: $sessionSlug, hostSecretHash: $hostSecretHash, questionId: $questionId) {
      eventType
      sessionSlug
      payload
    }
  }
`;

export const GET_SESSION_DATA = `
  query GetSessionData($sessionSlug: String!) {
    getSessionData(sessionSlug: $sessionSlug) {
      snippets {
        id
        sessionSlug
        type
        content
        language
        createdAt
        TTL
      }
      questions {
        id
        sessionSlug
        text
        fingerprint
        authorName
        upvoteCount
        downvoteCount
        isHidden
        isFocused
        isBanned
        createdAt
        TTL
      }
      replies {
        id
        questionId
        sessionSlug
        text
        isHostReply
        fingerprint
        createdAt
        TTL
      }
    }
  }
`;
