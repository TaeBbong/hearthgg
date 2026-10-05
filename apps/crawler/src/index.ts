import { createAlert } from "./alert";
import { runProbeCycle } from "./probe";

export { CrawlBoardWorkflow } from "./workflow";

export default {
  async scheduled(_controller, env, ctx) {
    ctx.waitUntil(
      runProbeCycle({
        db: env.DB,
        alert: createAlert(env.ALERT_WEBHOOK_URL),
        startCrawl: async (params) => {
          await env.CRAWL_BOARD.create({ id: params.runId, params });
        },
      }).then((outcomes) => console.log(JSON.stringify({ event: "probe", outcomes }))),
    );
  },
} satisfies ExportedHandler<Env>;
