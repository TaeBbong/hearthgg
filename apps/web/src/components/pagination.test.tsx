import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Pagination, pageWindow } from "./pagination";

describe("pageWindow", () => {
  it("lists every page when there are few", () => {
    expect(pageWindow(2, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it("keeps the ends and a window around the current page", () => {
    expect(pageWindow(10, 40)).toEqual([1, "gap", 8, 9, 10, 11, 12, "gap", 40]);
    expect(pageWindow(1, 40)).toEqual([1, 2, 3, "gap", 40]);
    expect(pageWindow(40, 40)).toEqual([1, "gap", 38, 39, 40]);
  });
});

describe("Pagination", () => {
  const href = (page: number) => `/ap/arena?page=${page}`;

  it("links to neighbouring pages and marks the current one", () => {
    render(<Pagination page={3} totalPages={5} href={href} />);
    expect(screen.getByRole("link", { name: "이전 페이지" })).toHaveAttribute("href", href(2));
    expect(screen.getByRole("link", { name: "다음 페이지" })).toHaveAttribute("href", href(4));
    expect(screen.getByRole("link", { name: "3" })).toHaveAttribute("aria-current", "page");
  });

  it("disables previous on the first page and next on the last", () => {
    render(<Pagination page={1} totalPages={1} href={href} />);
    expect(screen.queryByRole("link", { name: "이전 페이지" })).toBeNull();
    expect(screen.queryByRole("link", { name: "다음 페이지" })).toBeNull();
  });
});
