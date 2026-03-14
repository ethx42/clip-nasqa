export const ON_SESSION_UPDATE = `
  subscription OnSessionUpdate($sessionSlug: String!) {
    onSessionUpdate(sessionSlug: $sessionSlug) {
      eventType
      sessionSlug
      payload
    }
  }
`;
