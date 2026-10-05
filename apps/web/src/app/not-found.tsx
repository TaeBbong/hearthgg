import Link from "next/link";
import { Card, EmptyState } from "@/components/card";

export default function NotFound() {
  return (
    <div className="py-10">
      <Card>
        <EmptyState title="페이지를 찾을 수 없습니다">
          <Link href="/" className="text-primary hover:underline">
            홈으로 돌아가기
          </Link>
        </EmptyState>
      </Card>
    </div>
  );
}
