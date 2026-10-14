import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ShareButton } from "./share-button";

const props = { title: "duriwinner - 아시아·태평양 정규전 | hearthgg", text: "duriwinner · 아시아·태평양 정규전 2위" };

function stubNavigator(overrides: Partial<Navigator>) {
  for (const [key, value] of Object.entries(overrides)) Object.defineProperty(navigator, key, { value, configurable: true });
}

afterEach(() => {
  for (const key of ["share", "canShare", "clipboard"]) Reflect.deleteProperty(navigator, key);
  vi.useRealTimers();
});

describe("ShareButton", () => {
  it("opens the system share sheet with the page link when the browser has one", async () => {
    const share = vi.fn(async () => {});
    stubNavigator({ share, canShare: () => true });
    render(<ShareButton {...props} />);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "공유" })));
    expect(share).toHaveBeenCalledWith({ ...props, url: "http://localhost:3000/" });
  });

  it("stays quiet when the user dismisses the share sheet", async () => {
    const clipboard = { writeText: vi.fn() };
    stubNavigator({ share: vi.fn(async () => Promise.reject(new DOMException("cancel", "AbortError"))), canShare: () => true, clipboard } as never);
    render(<ShareButton {...props} />);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "공유" })));
    expect(clipboard.writeText).not.toHaveBeenCalled();
    expect(screen.queryByRole("status")).toBeEmptyDOMElement();
  });

  it("copies the link and says so when there is no share sheet", async () => {
    vi.useFakeTimers();
    const clipboard = { writeText: vi.fn(async () => {}) };
    stubNavigator({ clipboard } as never);
    render(<ShareButton {...props} />);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "공유" })));
    expect(clipboard.writeText).toHaveBeenCalledWith("http://localhost:3000/");
    expect(screen.getByRole("status")).toHaveTextContent("링크를 복사했습니다");
    act(() => vi.advanceTimersByTime(3_000));
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("tells the user when copying is not possible", async () => {
    stubNavigator({ clipboard: { writeText: vi.fn(async () => Promise.reject(new Error("denied"))) } } as never);
    render(<ShareButton {...props} />);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "공유" })));
    expect(screen.getByRole("status")).toHaveTextContent("주소창의 링크를 복사해 주세요");
  });
});
