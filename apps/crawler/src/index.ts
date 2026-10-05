import { isDailyCaptureWindow } from "@hearthgg/core";
import { createAlert } from "./alert";
import { captureDailyHistory } from "./history";
import { runProbeCycle } from "./probe";

export { CrawlBoardWorkflow } from "./workflow";

export default {
  async scheduled(controller, env, ctx) {
    ctx.waitUntil(
      runProbeCycle({
        db: env.DB,
        alert: createAlert(env.ALERT_WEBHOOK_URL),
        startCrawl: async (params) => {
          await env.CRAWL_BOARD.create({ id: params.runId, params });
        },
      }).then((outcomes) => console.log(JSON.stringify({ event: "probe", outcomes }))),
    );

    // Ticks in the last minutes of the KST day snapshot closing ranks; repeats are no-ops.
    if (isDailyCaptureWindow(controller.scheduledTime)) {
      ctx.waitUntil(
        captureDailyHistory({ db: env.DB, bucket: env.SNAPSHOTS, now: () => controller.scheduledTime }).then((results) =>
          console.log(JSON.stringify({ event: "daily-history", results })),
        ),
      );
    }
  },
} satisfies ExportedHandler<Env>;
