/** Posts to a Discord-compatible webhook, or logs when none is configured. */
export function createAlert(webhookUrl: string | undefined, fetchFn: typeof fetch = fetch) {
  return async (message: string): Promise<void> => {
    if (!webhookUrl) {
      console.warn(message);
      return;
    }
    const response = await fetchFn(webhookUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      // Messages quote upstream errors; never let their text mention @everyone or a role.
      body: JSON.stringify({ content: message, allowed_mentions: { parse: [] } }),
    });
    if (!response.ok) console.error(`alert webhook responded ${response.status}`);
  };
}
