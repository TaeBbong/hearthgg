import type { Metadata } from "next";
import Link from "next/link";
import { LegalDocument, LegalSection } from "@/components/legal-document";
import { CONTACT_URL } from "@/lib/site";

export const metadata: Metadata = { title: "이용약관" };

export default function TermsPage() {
  return (
    <LegalDocument title="이용약관" effectiveDate="2026년 10월 13일">
      <LegalSection title="제1조 (목적)">
        <p>이 약관은 hearthgg(이하 &ldquo;서비스&rdquo;)를 이용하는 조건과 절차를 정합니다.</p>
      </LegalSection>

      <LegalSection title="제2조 (서비스의 내용)">
        <p>
          서비스는 Blizzard Entertainment가 공개하는 하스스톤 공식 커뮤니티 리더보드 데이터를 주기적으로 수집해 검색, 순위 열람,
          일별 순위 기록을 제공합니다. 서비스는 무료이며 회원가입 없이 누구나 이용할 수 있습니다.
        </p>
      </LegalSection>

      <LegalSection title="제3조 (데이터의 정확성)">
        <ul>
          <li>순위는 수집 시점의 데이터이며, 화면에 표시된 수집 시각 이후의 변동은 반영되어 있지 않을 수 있습니다.</li>
          <li>원본 데이터의 누락, 오류, 같은 이름의 여러 플레이어 등은 원본 그대로 표시됩니다.</li>
          <li>서비스는 데이터의 정확성, 완전성, 지속적인 제공을 보증하지 않습니다.</li>
        </ul>
      </LegalSection>

      <LegalSection title="제4조 (이용자의 의무)">
        <p>이용자는 다음 행위를 해서는 안 됩니다.</p>
        <ul>
          <li>서비스에 과도한 부하를 주는 자동화된 대량 요청</li>
          <li>서비스의 정상적인 운영을 방해하는 행위</li>
          <li>서비스의 정보를 이용해 다른 사람을 괴롭히거나 법령을 위반하는 행위</li>
        </ul>
        <p>운영자는 위 행위가 확인되면 해당 접속을 제한할 수 있습니다.</p>
      </LegalSection>

      <LegalSection title="제5조 (서비스의 변경과 중단)">
        <p>
          운영자는 원본 데이터 제공 방식의 변경, 시스템 점검, 운영상의 사정에 따라 서비스의 전부 또는 일부를 변경하거나 중단할 수
          있습니다. 가능한 경우 서비스 화면을 통해 미리 알립니다.
        </p>
      </LegalSection>

      <LegalSection title="제6조 (책임의 제한)">
        <p>
          서비스는 무료로 제공되며, 운영자의 고의 또는 중대한 과실이 없는 한 서비스 이용이나 데이터의 오류, 서비스 중단으로 생긴
          손해에 대해 책임을 지지 않습니다.
        </p>
      </LegalSection>

      <LegalSection title="제7조 (권리의 귀속)">
        <p>
          hearthgg는 Blizzard Entertainment와 관련이 없는 비공식 팬 사이트입니다. 하스스톤®과 관련 상표, 게임 데이터에 대한 권리는
          Blizzard Entertainment에 있습니다.
        </p>
      </LegalSection>

      <LegalSection title="제8조 (개인정보)">
        <p>
          개인정보의 처리는 <Link href="/privacy">개인정보처리방침</Link>을 따릅니다.
        </p>
      </LegalSection>

      <LegalSection title="제9조 (약관의 변경)">
        <p>약관을 바꿀 때는 시행일과 변경 내용을 이 페이지에 게시하며, 게시한 시행일부터 적용됩니다.</p>
      </LegalSection>

      <LegalSection title="제10조 (문의)">
        <p>
          서비스 이용에 관한 문의는 <a href={CONTACT_URL}>GitHub Issues</a>로 받습니다.
        </p>
      </LegalSection>

      <p className="text-muted">부칙: 이 약관은 2026년 10월 13일부터 시행합니다.</p>
    </LegalDocument>
  );
}
