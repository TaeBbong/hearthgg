import { isDailyCaptureWindow } from "@hearthgg/core";
import { createAlert } from "./alert";
import { runDailyTick } from "./daily";
import { runProbeCycle } from "./probe";

export { CrawlBoardWorkflow } from "./workflow";

export default {
  async scheduled(controller, env, ctx) {
    const alert = createAlert(env.ALERT_WEBHOOK_URL);
    ctx.waitUntil(
      runProbeCycle({
        db: env.DB,
        alert,
        startCrawl: async (params) => {
          await env.CRAWL_BOARD.create({ id: params.runId, params });
        },
      }).then((outcomes) => console.log(JSON.stringify({ event: "probe", outcomes }))),
    );

    // Ticks in the last minutes of the KST day record closing ranks and send the daily report (once).
    if (isDailyCaptureWindow(controller.scheduledTime)) {
      ctx.waitUntil(
        runDailyTick({ db: env.DB, bucket: env.SNAPSHOTS, alert, now: () => controller.scheduledTime }).then((result) =>
          console.log(JSON.stringify({ event: "daily", ...result })),
        ),
      );
    }
  },
} satisfies ExportedHandler<Env>;
