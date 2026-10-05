import { isMode } from "@hearthgg/core/domain";
import type { Metadata } from "next";
import { Suspense } from "react";
import { SearchBox } from "@/components/search-box";
import { SearchResults, SearchResultsSkeleton } from "@/components/search-results";

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

export async function generateMetadata({ searchParams }: PageProps<"/search">): Promise<Metadata> {
  const query = first((await searchParams).q);
  return { title: query ? `"${query}" 검색` : "검색", robots: { index: false } };
}

export default function SearchPage({ searchParams }: PageProps<"/search">) {
  return (
    <div className="flex flex-col gap-4 py-6">
      <Suspense fallback={<SearchResultsSkeleton />}>
        {searchParams.then((params) => {
          const query = first(params.q).slice(0, 50);
          const mode = first(params.mode);
          return (
            <>
              <div className="md:hidden">
                {/* Header search is hidden on small screens. Keyed so a new query resets the input. */}
                <SearchBox key={query} size="sm" defaultValue={query} />
              </div>
              <SearchResults query={query} mode={isMode(mode) ? mode : undefined} />
            </>
          );
        })}
      </Suspense>
    </div>
  );
}
