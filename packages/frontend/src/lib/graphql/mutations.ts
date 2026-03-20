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
  mutation AddQuestion($sessionCode: String!, $text: String!, $fingerprint: String!, $authorName: String, $isHostQuestion: Boolean!) {
    addQuestion(sessionCode: $sessionCode, text: $text, fingerprint: $fingerprint, authorName: $authorName, isHostQuestion: $isHostQuestion) {
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

export const EDIT_QUESTION = `
  mutation EditQuestion($sessionCode: String!, $questionId: String!, $text: String!, $fingerprint: String, $hostSecretHash: String) {
    editQuestion(sessionCode: $sessionCode, questionId: $questionId, text: $text, fingerprint: $fingerprint, hostSecretHash: $hostSecretHash) {
      eventType
      sessionCode
      payload
    }
  }
`;

export const DELETE_QUESTION = `
  mutation DeleteQuestion($sessionCode: String!, $questionId: String!, $fingerprint: String, $hostSecretHash: String) {
    deleteQuestion(sessionCode: $sessionCode, questionId: $questionId, fingerprint: $fingerprint, hostSecretHash: $hostSecretHash) {
      eventType
      sessionCode
      payload
    }
  }
`;

export const EDIT_REPLY = `
  mutation EditReply($sessionCode: String!, $replyId: String!, $text: String!, $fingerprint: String, $hostSecretHash: String) {
    editReply(sessionCode: $sessionCode, replyId: $replyId, text: $text, fingerprint: $fingerprint, hostSecretHash: $hostSecretHash) {
      eventType
      sessionCode
      payload
    }
  }
`;

export const DELETE_REPLY = `
  mutation DeleteReply($sessionCode: String!, $replyId: String!, $fingerprint: String, $hostSecretHash: String) {
    deleteReply(sessionCode: $sessionCode, replyId: $replyId, fingerprint: $fingerprint, hostSecretHash: $hostSecretHash) {
      eventType
      sessionCode
      payload
    }
  }
`;

export const EDIT_SNIPPET = `
  mutation EditSnippet($sessionCode: String!, $snippetId: String!, $content: String!, $language: String, $hostSecretHash: String!) {
    editSnippet(sessionCode: $sessionCode, snippetId: $snippetId, content: $content, language: $language, hostSecretHash: $hostSecretHash) {
      eventType
      sessionCode
      payload
    }
  }
`;

export const HARD_DELETE_QUESTION = `
  mutation HardDeleteQuestion($sessionCode: String!, $questionId: String!, $hostSecretHash: String!) {
    hardDeleteQuestion(sessionCode: $sessionCode, questionId: $questionId, hostSecretHash: $hostSecretHash) {
      eventType
      sessionCode
      payload
    }
  }
`;

export const HARD_DELETE_REPLY = `
  mutation HardDeleteReply($sessionCode: String!, $replyId: String!, $hostSecretHash: String!) {
    hardDeleteReply(sessionCode: $sessionCode, replyId: $replyId, hostSecretHash: $hostSecretHash) {
      eventType
      sessionCode
      payload
    }
  }
`;

export const HARD_DELETE_SNIPPET = `
  mutation HardDeleteSnippet($sessionCode: String!, $snippetId: String!, $hostSecretHash: String!) {
    hardDeleteSnippet(sessionCode: $sessionCode, snippetId: $snippetId, hostSecretHash: $hostSecretHash) {
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
        editedAt
        TTL
      }
      questions {
        id
        sessionCode
        text
        fingerprint
        authorName
        isHostQuestion
        upvoteCount
        downvoteCount
        isHidden
        isFocused
        isBanned
        reactionCounts
        reactionOrder
        createdAt
        editedAt
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
        editedAt
        TTL
      }
    }
  }
`;
