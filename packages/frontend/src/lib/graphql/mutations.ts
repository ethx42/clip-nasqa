export const PUSH_SNIPPET = `
  mutation PushSnippet($sessionCode: String!, $hostSecretHash: String!, $content: String!, $type: String!, $language: String) {
    pushSnippet(sessionCode: $sessionCode, hostSecretHash: $hostSecretHash, content: $content, type: $type, language: $language) {
      eventType
      sessionCode
      payload
    }
  }
`;

export const DELETE_SNIPPET = `
  mutation DeleteSnippet($sessionCode: String!, $hostSecretHash: String!, $snippetId: String!) {
    deleteSnippet(sessionCode: $sessionCode, hostSecretHash: $hostSecretHash, snippetId: $snippetId) {
      eventType
      sessionCode
      payload
    }
  }
`;

export const CLEAR_CLIPBOARD = `
  mutation ClearClipboard($sessionCode: String!, $hostSecretHash: String!) {
    clearClipboard(sessionCode: $sessionCode, hostSecretHash: $hostSecretHash) {
      eventType
      sessionCode
      payload
    }
  }
`;

export const ADD_QUESTION = `
  mutation AddQuestion($sessionCode: String!, $text: String!, $fingerprint: String!, $authorName: String) {
    addQuestion(sessionCode: $sessionCode, text: $text, fingerprint: $fingerprint, authorName: $authorName) {
      eventType
      sessionCode
      payload
    }
  }
`;

export const UPVOTE_QUESTION = `
  mutation UpvoteQuestion($sessionCode: String!, $questionId: String!, $fingerprint: String!, $remove: Boolean) {
    upvoteQuestion(sessionCode: $sessionCode, questionId: $questionId, fingerprint: $fingerprint, remove: $remove) {
      eventType
      sessionCode
      payload
    }
  }
`;

export const ADD_REPLY = `
  mutation AddReply($sessionCode: String!, $questionId: String!, $text: String!, $fingerprint: String!, $isHostReply: Boolean!, $authorName: String) {
    addReply(sessionCode: $sessionCode, questionId: $questionId, text: $text, fingerprint: $fingerprint, isHostReply: $isHostReply, authorName: $authorName) {
      eventType
      sessionCode
      payload
    }
  }
`;

export const FOCUS_QUESTION = `
  mutation FocusQuestion($sessionCode: String!, $hostSecretHash: String!, $questionId: String) {
    focusQuestion(sessionCode: $sessionCode, hostSecretHash: $hostSecretHash, questionId: $questionId) {
      eventType
      sessionCode
      payload
    }
  }
`;

export const BAN_QUESTION = `
  mutation BanQuestion($sessionCode: String!, $hostSecretHash: String!, $questionId: String!) {
    banQuestion(sessionCode: $sessionCode, hostSecretHash: $hostSecretHash, questionId: $questionId) {
      eventType
      sessionCode
      payload
    }
  }
`;

export const BAN_PARTICIPANT = `
  mutation BanParticipant($sessionCode: String!, $hostSecretHash: String!, $fingerprint: String!) {
    banParticipant(sessionCode: $sessionCode, hostSecretHash: $hostSecretHash, fingerprint: $fingerprint) {
      eventType
      sessionCode
      payload
    }
  }
`;

export const DOWNVOTE_QUESTION = `
  mutation DownvoteQuestion($sessionCode: String!, $questionId: String!, $fingerprint: String!, $remove: Boolean) {
    downvoteQuestion(sessionCode: $sessionCode, questionId: $questionId, fingerprint: $fingerprint, remove: $remove) {
      eventType
      sessionCode
      payload
    }
  }
`;

export const RESTORE_QUESTION = `
  mutation RestoreQuestion($sessionCode: String!, $hostSecretHash: String!, $questionId: String!) {
    restoreQuestion(sessionCode: $sessionCode, hostSecretHash: $hostSecretHash, questionId: $questionId) {
      eventType
      sessionCode
      payload
    }
  }
`;

export const REACT = `
  mutation React($sessionCode: String!, $targetId: String!, $targetType: ReactionTargetType!, $emoji: String!, $fingerprint: String!) {
    react(sessionCode: $sessionCode, targetId: $targetId, targetType: $targetType, emoji: $emoji, fingerprint: $fingerprint) {
      eventType
      sessionCode
      payload
    }
  }
`;

export const GET_SESSION_DATA = `
  query GetSessionData($sessionCode: String!) {
    getSessionData(sessionCode: $sessionCode) {
      snippets {
        id
        sessionCode
        type
        content
        language
        createdAt
        TTL
      }
      questions {
        id
        sessionCode
        text
        fingerprint
        authorName
        upvoteCount
        downvoteCount
        isHidden
        isFocused
        isBanned
        reactionCounts
        reactionOrder
        createdAt
        TTL
      }
      replies {
        id
        questionId
        sessionCode
        text
        isHostReply
        fingerprint
        reactionCounts
        reactionOrder
        createdAt
        TTL
      }
    }
  }
`;
