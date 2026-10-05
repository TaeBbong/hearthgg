"use client";

import { usePathname } from "next/navigation";
import { SearchBox } from "./search-box";

/** Compact search for the header; the home page already has the large one. */
export function HeaderSearch() {
  const pathname = usePathname();
  if (pathname === "/") return null;
  return <SearchBox size="sm" />;
}
