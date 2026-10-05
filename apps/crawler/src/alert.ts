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
      body: JSON.stringify({ content: message }),
    });
    if (!response.ok) console.error(`alert webhook responded ${response.status}`);
  };
}
