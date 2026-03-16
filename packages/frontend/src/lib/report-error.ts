// TODO(MON-01): Replace with Sentry.captureException(error)
export function reportError(error: Error): void {
  console.error("[reportError]", error);
}
