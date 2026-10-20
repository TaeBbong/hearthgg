import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SearchBox } from "./search-box";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
const { track } = vi.hoisted(() => ({ track: vi.fn() }));
vi.mock("@/lib/analytics", () => ({ track }));
vi.mock("next/form", () => ({
  default: ({ action, children, ...props }: React.ComponentProps<"form"> & { action: string }) => (
    <form action={action} {...props}>
      {children}
    </form>
  ),
}));

const hits = [
  { region: "AP", mode: "arena", seasonId: 56, rank: 1, accountId: "Sinah", rating: 7.7, match: "exact" },
  { region: "EU", mode: "standard", seasonId: 156, rank: 9, accountId: "sinahfan", rating: null, match: "prefix" },
];

describe("SearchBox", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    fetchMock = vi.fn(async () => Response.json({ hits, total: 2 }));
    vi.stubGlobal("fetch", fetchMock);
    push.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  async function typeAndSettle(text: string) {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const input = screen.getByRole("combobox", { name: "플레이어 검색" });
    await user.type(input, text);
    await act(() => vi.advanceTimersByTimeAsync(300));
    return { user, input };
  }

  it("submits plain queries to the search page", () => {
    render(<SearchBox />);
    const input = screen.getByRole("combobox", { name: "플레이어 검색" });
    expect(input).toHaveAttribute("name", "q");
    expect(input.closest("form")).toHaveAttribute("action", "/search");
  });

  it("fetches debounced suggestions once typing pauses", async () => {
    render(<SearchBox />);
    await typeAndSettle("sin");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe("/api/search?q=sin&limit=8");
    const options = await screen.findAllByRole("option");
    expect(options).toHaveLength(2);
    expect(options[0]).toHaveTextContent("Sinah");
    expect(options[0]).toHaveTextContent("투기장");
  });

  it("moves through suggestions with the keyboard and opens the player page", async () => {
    render(<SearchBox />);
    const { user, input } = await typeAndSettle("sin");
    await screen.findAllByRole("option");

    await user.keyboard("{ArrowDown}{ArrowDown}");
    expect(input).toHaveAttribute("aria-activedescendant", screen.getAllByRole("option")[1]!.id);

    await user.keyboard("{Enter}");
    expect(push).toHaveBeenCalledWith("/eu/standard/156/sinahfan");
    expect(track).toHaveBeenCalledWith("search", { search_term: "sin" });
  });

  it("closes suggestions on Escape", async () => {
    render(<SearchBox />);
    const { user, input } = await typeAndSettle("sin");
    await screen.findAllByRole("option");

    await user.keyboard("{Escape}");
    expect(screen.queryAllByRole("option")).toHaveLength(0);
    expect(input).toHaveAttribute("aria-expanded", "false");
  });

  it("does not query for blank input", async () => {
    render(<SearchBox />);
    await typeAndSettle("   ");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
