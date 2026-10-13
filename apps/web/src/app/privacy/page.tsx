import type { Metadata } from "next";
import { LegalDocument, LegalSection } from "@/components/legal-document";
import { CONTACT_URL } from "@/lib/site";

export const metadata: Metadata = { title: "개인정보처리방침" };

export default function PrivacyPage() {
  return (
    <LegalDocument title="개인정보처리방침" effectiveDate="2026년 10월 13일">
      <p>
        hearthgg(이하 &ldquo;서비스&rdquo;)는 「개인정보 보호법」에 따라 이용자의 개인정보를 보호하고 관련 고충을 원활하게 처리하기
        위해 다음과 같이 개인정보처리방침을 공개합니다. 서비스는 회원가입이 없으며, 이용자에게 이름, 이메일, 연락처 같은 정보를 받지
        않습니다.
      </p>

      <LegalSection title="1. 처리하는 개인정보와 목적">
        <ul>
          <li>
            <b>접속 기록</b>: 접속 IP 주소, 요청한 주소(URL), 브라우저 정보(User-Agent), 접속 일시. 서비스에 접속하면 호스팅
            인프라에서 자동으로 생성되며, 서비스 제공, 장애 대응, 과도한 요청 같은 부정 이용 방지에만 사용합니다.
          </li>
          <li>
            <b>리더보드 공개 정보</b>: Blizzard 공식 커뮤니티 리더보드에 공개된 플레이어 이름(배틀태그의 # 뒤 번호 제외), 순위,
            레이팅. 순위 검색과 순위 추이 제공에 사용하며, 다른 정보와 결합하지 않습니다.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="2. 보유 기간과 파기">
        <ul>
          <li>접속 기록: 생성 후 7일이 지나면 자동으로 삭제됩니다.</li>
          <li>
            리더보드 정보: 최신 순위는 다음 수집 때 새 데이터로 교체됩니다. 순위 추이를 위한 일별 기록은 서비스를 운영하는 동안
            보관하며, 삭제를 요청하면 지체 없이 파기합니다.
          </li>
          <li>파기는 저장소에서 복구할 수 없도록 삭제하는 방식으로 합니다.</li>
        </ul>
      </LegalSection>

      <LegalSection title="3. 제3자 제공">
        <p>서비스는 개인정보를 제3자에게 제공하지 않습니다.</p>
      </LegalSection>

      <LegalSection title="4. 처리 위탁과 국외 이전">
        <p>서비스는 호스팅을 위해 다음과 같이 개인정보 처리를 위탁하며, 이에 따라 개인정보가 국외로 이전됩니다.</p>
        <ul>
          <li>받는 자: Cloudflare, Inc. (미국, privacyquestions@cloudflare.com)</li>
          <li>위탁 업무: 서비스 호스팅, 데이터 전송, 접속 기록 저장</li>
          <li>이전 항목: 접속 기록(1항)</li>
          <li>이전 시기와 방법: 서비스에 접속할 때 네트워크를 통해 전송</li>
          <li>보유 기간: 7일</li>
        </ul>
        <p>국외 이전을 원하지 않으면 서비스 이용을 중단하면 됩니다. 이 경우 접속 기록은 생성되지 않습니다.</p>
      </LegalSection>

      <LegalSection title="5. 쿠키와 브라우저 저장소">
        <p>
          서비스는 쿠키를 사용하지 않으며, 분석 도구나 광고 도구도 사용하지 않습니다. 화면 테마(라이트/다크) 선택만 이용자의 브라우저
          저장소(localStorage)에 저장합니다. 이 값은 서버로 전송되지 않으며 브라우저 설정에서 언제든 삭제할 수 있습니다.
        </p>
      </LegalSection>

      <LegalSection title="6. 정보주체의 권리와 행사 방법">
        <p>
          이용자는 자신의 개인정보에 대해 열람, 정정, 삭제, 처리 정지를 요구할 수 있습니다. 서비스에 표시되는 자신의 이름과 순위
          기록의 삭제나 표시 중단을 원하는 경우를 포함해, 아래 문의처로 요청하면 지체 없이 조치합니다.
        </p>
      </LegalSection>

      <LegalSection title="7. 안전성 확보 조치">
        <ul>
          <li>모든 접속을 HTTPS로 암호화합니다.</li>
          <li>데이터 저장소와 접속 기록에 접근할 수 있는 권한을 운영자로 한정합니다.</li>
        </ul>
      </LegalSection>

      <LegalSection title="8. 개인정보 보호책임자와 문의">
        <ul>
          <li>개인정보 보호책임자: hearthgg 운영자</li>
          <li>
            문의: <a href={CONTACT_URL}>GitHub Issues</a>
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="9. 권익 침해 구제 방법">
        <p>개인정보 침해에 대한 신고나 상담이 필요하면 아래 기관에 문의할 수 있습니다.</p>
        <ul>
          <li>개인정보침해신고센터: privacy.kisa.or.kr, 국번 없이 118</li>
          <li>개인정보분쟁조정위원회: www.kopico.go.kr, 1833-6972</li>
          <li>대검찰청: www.spo.go.kr, 국번 없이 1301</li>
          <li>경찰청: ecrm.police.go.kr, 국번 없이 182</li>
        </ul>
      </LegalSection>

      <LegalSection title="10. 처리방침의 변경">
        <p>이 처리방침을 바꿀 때는 시행일과 변경 내용을 이 페이지에 게시합니다.</p>
      </LegalSection>
    </LegalDocument>
  );
}
