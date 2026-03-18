export const ON_SESSION_UPDATE = `
  subscription OnSessionUpdate($sessionCode: String!) {
    onSessionUpdate(sessionCode: $sessionCode) {
      eventType
      sessionCode
      payload
    }
  }
`;
