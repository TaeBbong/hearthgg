import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { addRecent, readSaved, toggleFavorite } from "@/lib/saved-players";
import { FavoriteButton, RecordVisit, SavedPlayers } from "./saved-players";

const { track } = vi.hoisted(() => ({ track: vi.fn() }));
vi.mock("@/lib/analytics", () => ({ track }));

const sinah = { region: "AP", mode: "arena", name: "Sinah" } as const;
const seasons = { "AP:arena": 56, "EU:standard": 156 };

afterEach(() => {
  localStorage.clear();
  track.mockReset();
});

describe("FavoriteButton", () => {
  it("adds and removes the player from favorites", () => {
    render(<FavoriteButton player={sinah} />);
    const button = screen.getByRole("button", { name: "즐겨찾기" });
    expect(button).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(button);
    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(readSaved().favorites).toEqual([sinah]);
    fireEvent.click(button);
    expect(readSaved().favorites).toEqual([]);
  });

  it("reports adding a favorite, not removing one", () => {
    render(<FavoriteButton player={sinah} />);
    const button = screen.getByRole("button", { name: "즐겨찾기" });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(track.mock.calls).toEqual([["add_favorite", { region: "AP", mode: "arena" }]]);
  });
});

describe("RecordVisit", () => {
  it("records the viewed player as the most recent", () => {
    render(<RecordVisit player={sinah} />);
    expect(readSaved().recent).toEqual([sinah]);
  });
});

describe("SavedPlayers", () => {
  it("renders nothing until something is saved", () => {
    const { container } = render(<SavedPlayers currentSeasons={seasons} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("links favorites and recent players to their current season and lets recent ones be removed", () => {
    toggleFavorite(sinah);
    addRecent({ region: "EU", mode: "standard", name: "Other" });
    render(<SavedPlayers currentSeasons={seasons} />);

    const favorites = screen.getByRole("region", { name: "즐겨찾기" });
    expect(within(favorites).getByRole("link", { name: /Sinah/ })).toHaveAttribute("href", "/ap/arena/56/Sinah");

    const recent = screen.getByRole("region", { name: "최근 본 플레이어" });
    expect(within(recent).getByRole("link", { name: /Other/ })).toHaveAttribute("href", "/eu/standard/156/Other");
    act(() => fireEvent.click(within(recent).getByRole("button", { name: "Other 기록 삭제" })));
    expect(screen.queryByRole("region", { name: "최근 본 플레이어" })).not.toBeInTheDocument();
  });
});
