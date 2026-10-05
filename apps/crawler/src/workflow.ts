import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep, type WorkflowStepConfig } from "cloudflare:workers";
import { createAlert } from "./alert";
import { runCrawl, type CrawlParams, type CrawlResult, type CrawlStep } from "./crawl";

const STEP_CONFIG: WorkflowStepConfig = {
  retries: { limit: 3, delay: "30 seconds", backoff: "exponential" },
  timeout: "10 minutes",
};

/** Durable crawl of one board: page batches are persisted, so a retry resumes where it failed. */
export class CrawlBoardWorkflow extends WorkflowEntrypoint<Env, CrawlParams> {
  override async run(event: WorkflowEvent<CrawlParams>, step: WorkflowStep): Promise<CrawlResult> {
    const crawlStep: CrawlStep = {
      do: (name, fn) => step.do(name, STEP_CONFIG, fn as () => Promise<never>),
    };
    return runCrawl(event.payload, crawlStep, {
      db: this.env.DB,
      bucket: this.env.SNAPSHOTS,
      alert: createAlert(this.env.ALERT_WEBHOOK_URL),
    });
  }
}
