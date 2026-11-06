# RankMyIncome AdSense 승인 감사

2026-11-06 · 기준 브랜치 main · 운영 기준 커밋 `df36bb49af83bf2878a1d147bc3bb1b31e6a37b5`. 심사 판단과 아래 사이트 관측은 별개다. 계정 설정 변경, 광고 클릭, 재심사 신청은 수행하지 않았다.

## 1. 확인할 수 있었던 거절 사유

연결된 브라우저에서 AdSense를 열었을 때 Google이 표시한 문구는 **“애드센스 계정 없음”**이었다. 이는 현재 로그인한 계정의 접근 상태다. 사이트 소유자의 심사 결과 또는 정책 센터 세부 문구를 읽지 못했다. 연결된 메일함에서도 이 사이트의 거절 통지를 찾지 못했다. 소유자가 이전에 전달한 “애드센스 프로그램 정책 준수”는 범주 수준의 설명으로 보존한다. 아래 어떤 발견도 Google이 지목한 원인으로 확정할 수 없다.

| 기준 | 이 감사에서의 적용 |
| --- | --- |
| [사이트가 광고를 게재할 준비가 되지 않은 경우](https://support.google.com/adsense/answer/12176698) | 접근성, 코드 연결, 사용자에게 제공하는 고유 콘텐츠를 분리해 검사 |
| [계정이 승인되지 않은 경우](https://support.google.com/adsense/answer/81904) | 계정별 사유는 로그인한 계정 및 안내 메일에서 확인 |
| [게시자 콘텐츠가 없는 화면에 게재하는 광고](https://support.google.com/publisherpolicies/answer/11112688) | 탐색, 저가치·빈 화면, 오류 화면에 대한 광고 게재 위험의 직접 기준 |
| [Google 검색 스팸 정책](https://developers.google.com/search/docs/essentials/spam-policies#scaled-content) | 대량 생성물이 사람에게 가치를 주는지 점검하는 보조 기준. 검색 스팸 판정 또는 AdSense 위반을 페이지 수로 추정하지 않음 |
| [Google의 유럽 규정 메시지 안내](https://support.google.com/adsense/answer/10960768) | 광고 적격 페이지에서 표준 스크립트 유지. 지역별 메시지 게시 및 철회는 계정 측 확인 대상 |

## 2. 문제와 직접 수정

| 위험 / 근거 수준 | 운영 URL과 기준 커밋에서의 관측 | 코드와 수정 결과 |
| --- | --- | --- |
| **높음** · 광고 로더 범위 확정, 실제 광고 노출·거절 인과 미확인 | [국가 목록](https://rankmyincome.com/countries/), [도구 목록](https://rankmyincome.com/tools/), [순위 목록](https://rankmyincome.com/rankings/), [가이드 목록](https://rankmyincome.com/guides/) 모두 HTTP 200, 로더 1개. 가이드 목록 본문은 서문·기사 링크 위주. [비교 폼](https://rankmyincome.com/compare/)도 입력 전부터 로더 1개 | `scripts/build-site.mjs`의 `shell()`이 접두사로 일괄 허용했다. 기본값을 제외로 바꾸고, 생성자가 실제로 제공하는 비교 해설·순위표·가이드 기사에만 명시적으로 허용했다. 폼·목록·오류 화면은 광고 요청을 발생시키지 않는다. |
| **중간~높음** · 반복 본문 확인, 통계표의 가치 별도 | [부탄](https://rankmyincome.com/countries/bhutan/), [일본어 일본](https://rankmyincome.com/ja/countries/japan/) 등. 8개 언어별로 각각 208개 국가 본문의 공통 설명 비율이 높고, 기본 FAQ가 바로 위의 중앙값·상위 10% 금액을 되풀이했다. 반면 국가별 실제 WID 기준표, 통화, 소득 연도 및 계산기 연결은 유용하다. | `scripts/build-site.mjs`, `content/country-reading.mjs`. 기본 페이지 1,625개에서 반복 FAQ를 두 분포의 비교표로 교체. 기존 관련국 선택에 쓰던 구매력 중위값 간 비례 거리를 이용하고, 가장 가까운 국가의 p50과 p90/p50을 양쪽 소득·PPP 연도와 함께 표시한다. 자동 비교표만으로는 광고 허용 대상에 넣지 않았다. |
| **중간** · 표본에서 독자적인 해설의 격차 확인 | [한국어 말레이시아](https://rankmyincome.com/ko/countries/malaysia/), [스페인어 멕시코](https://rankmyincome.com/es/countries/mexico/)는 일반 본문이었고, [영어 프랑스](https://rankmyincome.com/countries/france/), [독일어 태국](https://rankmyincome.com/de/countries/thailand/), [일본어 에콰도르](https://rankmyincome.com/ja/countries/ecuador/)에는 이미 선정된 비교국과 국가별 해설이 있었다. | 앞의 두 페이지에만 별도로 비교국을 선정하고 배율 해석과 비교 한계를 해당 언어로 작성했다. 말레이시아는 싱가포르·태국·인도네시아와, 멕시코는 콜롬비아·칠레·브라질과 비교한다. 2024 말레이시아 p90/p50은 2.63, 멕시코는 5.36이다. |
| **중간** · 실패 시 사용자 안내 문제 재현. 일반 계산 장애는 재현되지 않음 | [한국어 계산기](https://rankmyincome.com/ko/?country=MY)의 JS 없는 초기 HTML은 국가 선택·계산 버튼에 계속 로딩 문구를 표시했다. 이미 noscript 링크와 정적 설명이 있었다. JS가 켜진 상태에서 데이터 응답을 실패시키면 폼에 오류·재시도가 표시되지만 바로 그 자리에서 정적 표로 이어지는 링크는 없었다. | `templates/home.html`, `app.js`. 초기 HTML에 동작 이름과 국가표 경로를 표시한다. 인덱스 또는 국가 파일 다운로드 실패 시 오류 옆에 해당 언어의 정적 경로가 나타난다. 재시도가 성공하면 링크를 접고 정상 계산한다. 홈페이지·도구·비교 폼은 성공, 빈 결과, 오류 상태 모두 로더 0개다. |
| **낮음~중간** · 가이드 예시 개선 확인 | [국내 순위와 세계 순위](https://rankmyincome.com/guides/country-vs-global-rank/)는 가상의 국가 A만 사용했다. 소득과 급여, PPP 정의 등 다른 가이드에는 이미 출처·예시가 있어 일괄 재작성하지 않았다. | `content/guides.mjs`. 말레이시아 p50 MYR 44,398.40 → 31,707.16 USD PPP → 2024 세계 상위 약 25.32%를 기존 계산 함수로 산출한다. 원본 JSON의 필드와 표를 연결했다. 실제로 수정한 기사만 날짜를 갱신했다. |
| **낮음** · 광고 범위 고지 정합성 | [소개](https://rankmyincome.com/about.html), [개인정보](https://rankmyincome.com/privacy.html)는 기존 계산기에 AdSense가 로드된다고 설명했다. | `about.html`, `privacy.html`에 새 게재 범위를 명시. [자료 출처](https://rankmyincome.com/data-sources.html)의 `data-sources.html`에는 비교국 선정식과 p90/p50 의미를 추가했다. |

### 전수 측정 방법과 전후 수치

기준 커밋을 빌드한 뒤 1,664개 국가 HTML의 `main` 안에서 각 `p`의 마크업을 제거하고 **같은 언어의 208개 국가 모두에 완전히 동일하게 나오는 문장**을 셌다. 각 언어에서 공통 단락 문자열은 13종이고, 카드 라벨까지 포함한 공통 단락 출현 횟수는 4,160회다. 전체 단락 수는 EN 5,117, KO 5,006, JA 5,030, ZH 5,006, ES 4,992, FR 4,999, DE 5,076, PT 4,999로, 공통 단락 출현 비율은 **81.3~83.3%**다. 이것은 페이지 텍스트 전체의 복제율이 아니다. 금액 표와 계산기를 제외한 문단 단위의 지표이며 게시자 정책의 임계값은 아니다. 기존 `content/seo-country.mjs`의 20개 표본과 `content/search-discovery.mjs`의 17개 비교 페이지, `country-reading.mjs`의 5개 해설은 따로 대조했다.

| 산출물 | 기준 main | 변경 빌드 |
| --- | ---: | ---: |
| 색인 가능한 URL / 국가 URL | 1,809 / 1,664 | 1,809 / 1,664 |
| AdSense 로더 포함 HTML | 1,803 | 66 |
| 로더 포함 국가 / 순위 상세 / 가이드 기사 | 1,664 / 32 / 10 | 24 / 32 / 10 |
| 전체 8개 언어의 기본 국가 비교표 | 0 | 1,625 |
| 직접 선정한 비교국 해설 (`data-country-reading`) | 5 | 7 |
| 오류·신뢰 페이지 수동 광고 슬롯 | 0 | 0 |

예를 들어 [부탄 페이지](https://rankmyincome.com/countries/bhutan/)의 반복 질문 3개를 대체한 표에서는 중위소득이 부탄 12,648.43, 몰도바 12,613.42 USD PPP다. 비슷한 중위소득에도 p90/p50은 각각 3.33배와 2.70배다. 두 국가 모두 소득·PPP 기준 연도는 2024다. 선정식은 두 중위값 비율의 절대 로그가 최소인 국가를 선택한다. 지역 이웃이나 생활비가 같은 국가로 해석하지 않는다.

## 3. 실제 운영 점검과 보존 항목

- [운영 빌드 식별자](https://rankmyincome.com/build-info.json)가 기준 main과 일치했다. 기준 커밋의 `scripts/verify-production.mjs`가 공개 서버에 수행한 72개 검사를 통과했다. 변경 버전 배포 후에는 이 검사기에 광고 적격·제외, 정적 표와 대체 링크에 대한 13개 검사가 더해진다.
- [ads.txt](https://rankmyincome.com/ads.txt)는 200이며 `google.com, pub-2948191504774582, DIRECT, f08c47fec0942fa0`이다. 기준 운영 HTML의 계정 메타와 표준 스크립트 client가 일치했고, 스크립트 URL 자체도 HTTP 200을 반환했다. 요청 성공은 광고 표시 또는 승인과 별개다. AdSense 소유권 메타를 홈페이지 포함 전체 빌드에서 유지했다.
- [robots.txt](https://rankmyincome.com/robots.txt)는 200이며 모든 사용자 에이전트에 `Allow: /`를 제공한다. [사이트맵](https://rankmyincome.com/sitemap.xml)은 200, loc 1,809개. 전 URL은 빌드에서 검사하고 운영에서는 대표 URL과 8개 언어를 표본 HTTP 검사했다. 실제 Google 서버에서의 크롤러 요청이나 비공개 크롤러 오류 기록은 확인할 수 없었다.
- [임의의 누락 경로](https://rankmyincome.com/__rmi_audit_missing_nov6__/)와 [없는 국가](https://rankmyincome.com/countries/__missing_audit__/) 모두 실제 404, 로더 0개. [오류 템플릿 자체](https://rankmyincome.com/404.html)는 200이지만 noindex, 사이트맵 제외다. `/index.html`은 308로 정규 경로에 연결된다. 검사한 누락 경로에서 soft 404가 재현되지 않았다.
- 공개 [문의](https://rankmyincome.com/contact.html), [방법론](https://rankmyincome.com/methodology.html), [약관](https://rankmyincome.com/terms.html)과 위의 소개·개인정보·자료 출처 총 6개는 실제 200이며 푸터에서 접근 가능했다. 문의 경로는 공개 GitHub를 이용한다. 운영자·전문가 이름이나 비공개 연락처는 새로 기재하지 않았다.
- 실제 운영 브라우저에서 한국어 페이지를 열고 샘플 연소득 MYR 60,000을 입력하니 2024 말레이시아 **상위 34.5%**, 세계 **상위 18.5%**가 표시됐다. 일반 JS 환경의 영구 로딩이나 계산 버튼 장애는 이 경로에서 재현되지 않았다. 실제 광고 소재가 표시된 화면에서 배치·오인 클릭·동의 철회를 관측하지 못했다. 생성된 HTML에는 수동 광고 슬롯이 없다.
- 수정 전후 전체 HTML 1,810개의 canonical, hreflang, robots 값과 sitemap.xml 전체 바이트가 일치한다. 기존 날짜 67개를 유지했다. 운영 검색 유입 수·Google 실제 색인 수는 별도로 측정하지 않았다.
- `data/income-data.json` SHA-256 `e733fea92bd2a037963f64e313f10cb4255886cc885928233bbe210f4f1ca4f1`; `calculator-core.js` SHA-256 `4e0af742da94199553ecb62ed06bc08b5a9f33545c6f6d04962fabed041437a3`. 원본, 배포 데이터 및 기존 알고리즘·티어·디자인 자산을 보존했다.

### 검증 결과

| 검사 | 결과 |
| --- | --- |
| `npm run check` | 48/48 통과. 계산 6, 빌드 구조·광고 적격·전체 비교값 8, DOM 12, 성장 기능 13, 배포 검증기 4, SEO 5. |
| `npm run test:browser -- --workers=2` | 88/88 통과 (Chromium 44, iPhone 13 WebKit 44). 좁은 화면·정적 본문·가이드·실제 계산·네트워크 실패·접근성·키보드·저장 결과를 검사했다. |
| 운영 브라우저, 기준 커밋 | 1,280px와 모바일 390px, JS 활성 시 MYR 60,000의 두 결과가 일치. 모바일 JS 비활성 시 정적 본문과 링크는 보였고 버튼에는 로딩 문구가 남았다. 가로 넘침 없음. 모바일 JS 활성 실행에서 실제 Google 로더 응답 200을 관찰했다. |
| 크롤러 접근 표본 | `Mediapartners-Google` 사용자 에이전트를 지정한 [프랑스](https://rankmyincome.com/countries/france/) 요청도 200. 이는 사용자 에이전트 기반 차단 점검이며 Google의 비공개 접근 로그는 아니다. |

PR 빌드와 운영 기준 커밋을 구분한다. 운영 배포 확인 시에는 GitHub의 main 푸시용 production 검증 작업 및 공개 `/build-info.json`의 커밋을 대조한다. 머지 이후의 상태는 PR과 해당 커밋의 실행 기록에서 확인할 수 있다.

## 4. 재심사 판단과 소유자 확인 사항

1. **가장 유력한 공개 위험**은 탐색용 페이지와 반복 설명 위주의 화면까지 일괄 광고 대상이었던 점이다. 정확한 Google 내부 사유는 미확인이다.
2. **직접 해결한 문제**는 광고 적격 범위, 기본 국가 페이지의 중복 FAQ, 계산 실패 시 정적 자료 접근, 국내·세계 순위 가이드의 모호한 계산 예시 및 광고 범위 고지다.
3. **남은 위험**은 계정별 심사 사유, 실제 지역별 Google CMP 동작과 데이터 수익 이용 조건이다. [WID 데이터 포털](https://wid.world/data/) 및 [공식 문의처](https://wid.world/contact-us/)에서 이 스냅샷의 시리즈를 광고 수익 사이트에 재배포하는 데 적용되는 명시적 조건을 확인해야 한다. WID 보고서의 라이선스를 원자료 전체에 대입하지 않았다. Google CMP 메시지나 게시자 ID는 변경하지 않았다.
4. **재심사 권고**는 조건부다. 운영 버전 검증 후 실제 소유자 AdSense에서 사이트 연결 방식(메타 태그 또는 ads.txt), 거절 세부 문구와 예시 URL, 크롤러 오류를 확인한다. EEA·영국·스위스 대상 설정 및 메시지 게시 여부, 동의·거부·철회 시 광고 동작을 실제 적격 페이지에서 점검한다. 계정이 다른 문제를 지목하거나 WID 사용 조건을 확인할 수 없으면 신청을 보류한다. 재심사는 소유자가 결정한다.
