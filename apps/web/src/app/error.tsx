"use client";

import { Card, EmptyState } from "@/components/card";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="py-10">
      <Card>
        <EmptyState title="데이터를 불러오지 못했습니다">
          <button type="button" onClick={reset} className="text-primary hover:underline">
            다시 시도
          </button>
        </EmptyState>
      </Card>
    </div>
  );
}
