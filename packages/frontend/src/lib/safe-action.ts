/**
 * Wraps a server action call to catch network-level fetch failures
 * (e.g., ERR_INTERNET_DISCONNECTED) and convert them to an ActionResult-shaped error.
 */
export async function safeAction<R extends { success: boolean }>(
  action: Promise<R>,
  networkErrorMessage: string,
): Promise<R | { success: false; error: string }> {
  try {
    return await action;
  } catch {
    return { success: false, error: networkErrorMessage };
  }
}
