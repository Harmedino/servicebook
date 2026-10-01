const PING_INTERVAL_MS = 10 * 60 * 1000;

let timer: ReturnType<typeof setInterval> | undefined;

/**
 * Render's free plan puts a service to sleep after 15 minutes without
 * traffic, and the next visitor waits up to a minute for it to wake. Asleep,
 * reminders and birthday notices don't run either. Pinging our own public
 * address every 10 minutes counts as traffic, so the service never sleeps.
 *
 * Runs only where a public address is known: Render sets RENDER_EXTERNAL_URL
 * on every web service, and KEEP_AWAKE_URL works on other hosts.
 * Set KEEP_AWAKE=false to turn it off.
 */
export function startKeepAwake(): void {
  const base = (process.env.KEEP_AWAKE_URL || process.env.RENDER_EXTERNAL_URL || "").replace(/\/+$/, "");
  if (!base || process.env.KEEP_AWAKE === "false") return;

  const url = `${base}/health`;
  timer = setInterval(() => {
    fetch(url, { signal: AbortSignal.timeout(30_000) }).catch((error: unknown) => console.warn(`Keep-awake ping to ${url} failed:`, error));
  }, PING_INTERVAL_MS);
  timer.unref();
  console.log(`Keep-awake: pinging ${url} every ${PING_INTERVAL_MS / 60_000} minutes`);
}

export function stopKeepAwake(): void {
  clearInterval(timer);
}
