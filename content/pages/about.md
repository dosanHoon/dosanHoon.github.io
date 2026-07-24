---
title: "About me"
template: "page"
---

## Contact.

- 한승훈
- 010-3487-8711
- hangru1106@gmail.com
- GitHub: [github.com/dosanHoon](https://github.com/dosanHoon)

# Introduce.

"반복적인 병목을 자동화로 제거하고, AI를 지렛대로 팀의 생산성과 제품의 범위를 함께 넓히는 프론트엔드 엔지니어입니다."

- 서비스 기능 개발을 넘어 **FE 플랫폼 설계와 개발 생산성 향상**에 집중해 왔습니다. 반복적인 병목 구간을 찾아내 **Turborepo 기반 Monorepo, CI/CD 파이프라인, 테스트 인프라**를 0→1로 구축하는 일에 강점이 있습니다. 직방(MAU 100만+) 재직 시 **빌드 시간 70%(7분→2분), 의존성 설치 92%(73초→6초) 단축** 등 실측 가능한 성과를 만들어 왔습니다.
- 최근에는 AI 도구 도입을 넘어 **AI 기능 자체를 풀스택으로** 만듭니다. 온디바이스 ML 이미지 검색(WebGPU 가속, 모델 로딩 3~5초→0.4초), Vertex AI 기반 에셋 자동 분석 등 AI 기능을 프론트엔드부터 **Kotlin/Spring 백엔드 API까지 end-to-end로 설계·구현**했습니다.
- Claude Code·Cursor를 팀 워크플로우에 도입하고 프로젝트 컨텍스트 표준화로 AI 주도 개발 환경을 구축했습니다. **AI 산출물을 스스로 검증할 수 있는 크로스스택 리터러시**가 차별점입니다.
- AI 레버리지로 제품을 end-to-end로 책임지는 **프로덕트 엔지니어** 역할을 목표로 하고 있습니다.

# 프로젝트 경험

## 엔씨소프트

**2023.10 ~ 재직중** — 사내 운영 서비스 개발

Skill : Next.js / React / TypeScript / Kotlin / Spring Boot / Turborepo / pnpm / Docker / Nginx / Storybook / Vitest / Playwright / Vertex AI

### 온에어 에셋 팀 (2025 상반기 ~ )

사내 게임 개발 에셋을 통합 관리하는 플랫폼. Next.js + pnpm Monorepo(Turborepo) 기반 0→1 설계 및 개발. 2인 FE 체제에서 코드 기여 약 절반을 담당했고, 담당 기능은 백엔드(Kotlin/Spring Boot) API까지 직접 설계·구현했습니다.

#### AI 기능 개발 (풀스택)

- **이미지 유사 검색** — 온디바이스 객체 인식(Transformers.js + YOLOS)부터 서버 임베딩 검색 연동까지 리드
    - WebGPU 가속 도입으로 모델 로딩 3~5초 → 427ms, 추론 1~3초 → 680ms (fp16 / WASM q8 폴백 설계)
    - 업로드 이미지 클라이언트 리사이즈, 모델 프리로드 등 체감 성능 최적화
- **AI 에셋 자동 분석/등록** — 업로드 이미지를 분석해 엔진·플랫폼·텍스처 등 메타데이터 자동 입력
    - 백엔드 분석 모듈을 직접 신설, 자체 호스팅 LLM(Ollama)에서 Vertex AI(Gemini)로 전환 주도 — 비용·응답속도 기준 모델 선정
- **매뉴얼 챗봇** — API 키 노출 보안 이슈를 발견하고 프록시 아키텍처를 3단계에 걸쳐 재설계, Vertex AI 연동
- **2차 인증(외부 서비스 연동 로그인)** — FE 6상태 상태머신 + BE sealed result 패턴 설계로 OpenAPI oneOf → Orval 타입 안전성 확보

#### 프론트엔드 플랫폼

- **Monorepo 환경 구축**
    - Turborepo + pnpm 기반 모노레포 세팅 — Nx 대비 설정 최소화와 빌드 캐시 효율, 팀 러닝커브를 고려해 Turborepo 선택
    - Next.js, React, Tailwind, TanStack Query 기반 UI 아키텍처 설계
    - `apps/*`, `packages/*` 구조 설계 및 공통 모듈 분리 (`ui`, `lib`, `apis`, `auth` 등)
- **빌드 및 배포 자동화**
    - Docker multi-stage build 도입 및 배포 캐시 개선
    - Nexus + Jenkins 기반 CI/CD 파이프라인 구성
- **FE 개발 환경**
    - Orval 기반 API 클라이언트 자동 생성 — OpenAPI 스펙 기반 타입 안전성 확보, API 변경 시 수동 동기화 제거
    - Three.js 3D 에셋 미리보기
- **테스트 인프라 0→1 구축**
    - 팀 내 테스트 문화가 없던 상황에서 Vitest 유닛·Playwright E2E 도입
    - 유닛 53→85개, E2E 19→104개로 확장, QA 테스트케이스 코드화, 테스트 필수 규칙 도입
- **팀 AI Agent 활용 가이드**
    - 기획서·회의록을 마크다운으로 구조화해 Agent가 기능 명세를 직접 참조하는 워크플로우 정착

#### 3D 에셋 썸네일 자동 추출 도구

Three.js 기반 3D 에셋 썸네일/프리뷰 자동 생성 배치 도구. 썸네일 시스템이 전무하던 상황에서 0→1로 설계 및 구현.

- **webp(정적 썸네일) + webm(호버 프리뷰) 이중 포맷 자체 제안** 및 채택 — GIF 대비 용량 90% 이상 절감, 호버 프리뷰로 탐색 UX 차별화
- **6만 건** 3D 모션 에셋 자동 변환 파이프라인 구축 — three.js 플레이어 활용

### 브릿지 팀 (2023.10 ~ 2025 상반기)

#### 브릿지 보이스

- PHP + JavaScript + Handsontable 기반 스프레드시트형 에디터. 대사 관리/음성 합성(TTS)/얼굴 애니메이션(FA) 기능 담당
- WebSocket 기반 실시간 TTS 일괄 배치 동기화 UI 개발
- 레거시 jQuery 코드를 Web Component 기반 모듈화 JS로 리팩토링해 글로벌 스코프 오염 제거
- Git 브랜치 보호 규칙 및 Prettier/코드 컨벤션 정립으로 협업 기반 마련

#### 브릿지 파인더

- Next.js 기반 사내 게임 개발 용어 검색 서비스

## 직방

**2020.11 ~ 2023.04** — FE팀 서비스 성능 개선 / 사내 운영 서비스 개발

MAU 100만+ B2C 부동산 플랫폼 | AWS (EC2, S3, CloudFront)

Skill : React / React-Native / TypeScript / Node.js / MobX / Next.js / Zustand / Recoil / React-Query / GraphQL

### 호갱노노 성능 개선 프로젝트

- **빌드 속도 70% 단축 (7분 → 2분)** — Webpack 5 병렬 빌드 적용 및 트랜스파일러를 Babel에서 SWC로 교체
- **의존성 설치 시간 92% 단축·용량 84% 절감** — Yarn PnP 아키텍처 도입으로 설치 73초 → 6초, 빌드 용량 1.2GB → 189MB

### 운영 자동화 도구(백오피스) 개발

- 개발팀을 거쳐야 했던 약관/배너 업데이트를 운영팀이 자체 처리하도록 Strapi 기반 CMS 구축 → 양 팀 리소스 확보
- 엑셀 의존적이던 사내 로그 관리(ZAMS)를 웹 GUI 어드민으로 전환, npm 라이브러리 배포

### 라이브 서비스 렌더링 성능 최적화

- 입사 직후 라이브 서비스의 MobX reaction 오용으로 인한 렌더링 병목 탐지
- 렌더링 횟수 50% 감소(6회→3회), 렌더링 시간 70% 단축(499ms→155ms) — [MobX 최적화로 직방앱 성능 개선하기 (Medium)](https://medium.com/zigbang/mobx-%EC%B5%9C%EC%A0%81%ED%99%94%EB%A5%BC-%ED%86%B5%ED%95%9C-%EC%A7%81%EB%B0%A9%EC%95%B1-%EC%84%B1%EB%8A%A5%EA%B0%9C%EC%84%A0%ED%95%98%EA%B8%B0-c9b1c05c75ec)
- 재발 방지를 위해 사내 개발 블로그 공유 및 팀 내 사용 컨벤션 세미나 진행

## 큐비트시큐리티

**2018.01 ~ 2020.10** — 서버 보안 모니터링 서비스 프론트엔드 개발 및 기술 도입 주도

Skill : React / TypeScript / MobX / Java / Spring / Node.js / Jenkins

- 레거시(JSP+jQuery)를 React 기반 SPA(Albert, Plura 4.0)로 포팅 주도
- Code Splitting + GZIP 압축 적용으로 JS 번들 용량 75% 감소
- 사내 FE 팀 최초 GitLab MR(코드 리뷰), TypeScript, Storybook 도입 및 MobX 아키텍처 설계

## 펀플웍스

**2016.04 ~ 2017.12** — 리니지 아이템 펀플 카드 PC방 판매 및 게임 퍼블리싱

Skill : React / JavaScript

- React 기반 커뮤니티 서비스 UI 및 게임 퍼블리싱 기능 개발

# Skill.

- **Frontend Core:** React, Next.js, TypeScript, React-Native
- **State Management:** Zustand, TanStack Query(React-Query), MobX, Recoil
- **Architecture & Build:** Turborepo, pnpm, Yarn PnP, Webpack, SWC, Vite, Babel
- **Testing & CI/CD:** Vitest, Playwright, Docker, Jenkins, AWS(EC2, S3, CloudFront)
- **AI & Backend:** Claude Code, Cursor, Vertex AI(Gemini), Ollama, Transformers.js(WebGPU), Kotlin/Spring Boot
