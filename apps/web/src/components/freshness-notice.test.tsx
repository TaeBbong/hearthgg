import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FreshnessNotice } from "./freshness-notice";

describe("FreshnessNotice", () => {
  it("renders nothing while data is flowing", () => {
    const { container } = render(<FreshnessNotice blockedUntil={null} stalledSince={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("explains an upstream block and when collection resumes", () => {
    render(<FreshnessNotice blockedUntil={Date.UTC(2026, 9, 6, 7, 30)} stalledSince={null} />);
    expect(screen.getByRole("status")).toHaveTextContent("Blizzard 요청 제한으로 10월 6일 16:30까지 데이터 수집을 멈췄습니다");
  });

  it("warns when collection has stalled", () => {
    render(<FreshnessNotice blockedUntil={null} stalledSince={Date.UTC(2026, 9, 6, 5, 0)} />);
    expect(screen.getByRole("status")).toHaveTextContent("데이터 갱신이 지연되고 있습니다");
  });
});
