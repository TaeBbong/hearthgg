import { afterEach, describe, expect, it } from "vitest";
import { addRecent, isFavorite, MAX_RECENT, readSaved, removeRecent, toggleFavorite, type SavedPlayer } from "./saved-players";

const sinah: SavedPlayer = { region: "AP", mode: "arena", name: "Sinah" };
const other: SavedPlayer = { region: "EU", mode: "standard", name: "Other" };

afterEach(() => localStorage.clear());

describe("saved players", () => {
  it("toggles favorites, matching names case-insensitively per board", () => {
    toggleFavorite(sinah);
    expect(isFavorite(readSaved().favorites, { ...sinah, name: "SINAH" })).toBe(true);
    expect(isFavorite(readSaved().favorites, { ...sinah, mode: "wild" })).toBe(false);
    toggleFavorite({ ...sinah, name: "sinah" });
    expect(readSaved().favorites).toEqual([]);
  });

  it("keeps recent visits newest first, without duplicates and capped", () => {
    addRecent(sinah);
    addRecent(other);
    addRecent({ ...sinah, name: "SINAH" });
    expect(readSaved().recent).toEqual([{ ...sinah, name: "SINAH" }, other]);

    for (let i = 0; i < MAX_RECENT + 3; i++) addRecent({ ...other, name: `p${i}` });
    expect(readSaved().recent).toHaveLength(MAX_RECENT);
    expect(readSaved().recent[0]?.name).toBe(`p${MAX_RECENT + 2}`);

    removeRecent(readSaved().recent[0]!);
    expect(readSaved().recent[0]?.name).toBe(`p${MAX_RECENT + 1}`);
  });

  it("ignores corrupt storage", () => {
    localStorage.setItem("hearthgg:favorites", "{not json");
    localStorage.setItem("hearthgg:recent", JSON.stringify([{ region: "KR", mode: "arena", name: "x" }, sinah]));
    expect(readSaved()).toEqual({ favorites: [], recent: [sinah] });
  });
});
