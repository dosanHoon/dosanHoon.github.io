---
title: "이미지 검색 만들다가 브라우저에서 AI 모델까지 돌리게 됨 — WebGPU 427ms"
date: "2026-09-07T09:00:00.000Z"
template: "post"
draft: false
slug: "/posts/browser-image-search-webgpu"
category: "AI"
tags:
  - "WebGPU"
  - "Transformers.js"
  - "YOLOS"
  - "Frontend Performance"
  - "On-device AI"
description: "브라우저에서 객체를 인식하고 크롭한 뒤 서버 이미지 검색으로 연결함. WebGPU를 적용하고도 남아 있던 캐시, 첫 화면, 파일 I/O 병목을 제거한 기록."
---

이미지를 올리면 비슷한 에셋을 찾아주는 기능을 만들게 됨.

서버에는 이미지 임베딩과 Elasticsearch kNN 검색이 이미 있었음.

이미지 한 장 보내면 끝날 줄 알았음.

아니었음.

## 이미지 한 장 안에 물체가 여러 개 있음

사용자가 올리는 이미지는 깔끔한 상품 사진이 아니었음.

캐릭터, 무기, 배경이 한 장에 같이 들어 있음.

사용자는 전체 이미지보다 **그 안의 특정 물체**로 검색하고 싶어 함.

그래서 검색 전에 객체를 찾고, 사용자가 검색할 영역을 고르게 함.

객체 인식과 크롭은 프론트에서 처리함.

검색 임베딩과 벡터 검색은 서버에서 처리함.

```text
사용자 이미지
   │
   ├─ 브라우저
   │   ├─ YOLOS 객체 인식
   │   ├─ bounding box 표시
   │   └─ Canvas 크롭
   │
   └─ 서버
       ├─ 이미지 임베딩 생성
       ├─ Elasticsearch kNN 검색
       └─ 권한·필터 적용
```

## 객체 인식은 왜 프론트에서 함?

첫째, 원본 이미지가 브라우저에 이미 있음.

서버에서 객체를 인식하면 API 왕복이 하나 더 생김.

```text
원본 업로드
→ 객체 인식 API
→ bounding box 응답
→ 객체 선택
→ 다시 검색 요청
```

브라우저에서 인식하면 앞의 업로드와 API가 사라짐.

원본 `File`도 서버에 보내지 않음.

- 전체 검색: 긴 변 768px JPEG 전송
- 객체 검색: Canvas로 자른 이미지만 전송

둘째, 서버 GPU가 필요 없음.

각 사용자의 GPU에서 객체를 인식함.

사용자가 늘어도 서버에 추론 대기열이 생기지 않음.

객체 인식 서버의 배포, 확장, timeout도 관리하지 않아도 됨.

셋째, 백엔드가 단순해짐.

백엔드는 전체 이미지와 크롭 이미지를 구분하지 않음.

그냥 이미지 한 장을 받아 검색하면 됨.

```text
프론트
   ├─ 최적화된 전체 이미지 ─┐
   └─ 선택한 크롭 이미지 ───┤
                             ▼
백엔드             단일 이미지 검색 엔드포인트
                    → 임베딩 → 벡터 검색
```

객체 인식 모델이나 선택 UI가 바뀌어도 백엔드 API는 그대로임.

프론트는 **무엇을 검색할지** 결정함.

백엔드는 **받은 이미지 한 장을 검색하는 것**만 신경 씀.

## 브라우저에서 YOLOS 돌림

Transformers.js의 `object-detection` pipeline을 사용함.

모델은 `Xenova/yolos-tiny`.

모델 파일은 서비스에 포함하고 원격 다운로드는 막음.

이미지를 넣으면 label, score, bounding box가 나옴.

Canvas로 영역을 잘라 검색 후보로 보여줌.

기능은 잘 됨.

문제는 속도였음.

| 구간 | M1 Mac 실측 |
|---|---:|
| 모델 로딩 | 3~5초 |
| 객체 인식 | 1~3초 |

최악이면 객체 목록을 보기까지 8초 가까이 걸림.

로컬 AI고 뭐고 그냥 느린 기능이었음.

## 아뿔싸. 모델 로딩이 너무 느림

WebGPU를 사용하기로 함.

- WebGPU 지원: GPU + fp16
- WebGPU 미지원: WASM + q8

```typescript
const supportsWebGPU =
  typeof navigator !== "undefined" &&
  "gpu" in navigator;

if (supportsWebGPU) {
  try {
    detector = await load("webgpu", "fp16");
  } catch {
    detector = await load("wasm", "q8");
  }
} else {
  detector = await load("wasm", "q8");
}
```

`navigator.gpu`가 있다고 초기화까지 성공하는 건 아님.

브라우저나 드라이버 문제로 실패할 수 있음.

그래서 pipeline 생성까지 `try/catch`로 감쌈.

| 구간 | 기존 | WebGPU + fp16 |
|---|---:|---:|
| 모델 로딩 | 3~5초 | 427ms |
| 객체 인식 | 1~3초 | 680ms |

드디어 쓸 만해짐.

단, 이 숫자는 당시 개발 기록 기준임.

최초 측정은 동적 import 이후부터 시간을 쟀음.

현재 코드는 Transformers.js import부터 측정함.

정식 비교 전에 같은 범위로 다시 잴 예정.

<!-- TODO: 같은 Chrome과 M1 Mac에서 cold/warm 각각 5회 측정. 중앙값과 import 포함 여부를 추가함. -->

## 끝난 줄 알았는데 다시 열면 또 느림

팝오버를 닫았다 열면 모델을 다시 로딩하고 있었음.

detector를 `useRef`에 저장한 게 원인.

컴포넌트가 unmount되면 ref도 사라짐.

모델과 컴포넌트의 생명주기가 달랐음.

detector와 loading promise를 모듈 스코프로 옮김.

```typescript
let cachedDetector = null;
let cachedLoadingPromise = null;

const preloadDetector = () => {
  if (cachedDetector) {
    return Promise.resolve(cachedDetector);
  }

  if (cachedLoadingPromise) {
    return cachedLoadingPromise;
  }

  cachedLoadingPromise = loadDetector()
    .then((detector) => {
      cachedDetector = detector;
      return detector;
    })
    .catch((error) => {
      cachedLoadingPromise = null;
      throw error;
    });

  return cachedLoadingPromise;
};
```

동시 호출도 같은 promise를 사용함.

실패한 promise는 지워서 다음 호출에서 재시도함.

첫 로딩은 약 600ms.

같은 탭에서는 두 번째부터 즉시 반환됨.

## 같은 이미지도 다시 분석하고 있었음

모델만 캐시해서 끝이 아니었음.

팝오버를 다시 열 때 같은 이미지로 객체 인식을 반복함.

인식 결과와 크롭 이미지를 검색 세션 store에 저장함.

새 이미지를 첨부할 때만 캐시를 지움.

같은 이미지라면 후보를 바로 복원함.

실제 환경에서 약 12초 걸리던 재분석을 건너뜀.

## 프리로드했더니 화면이 늦게 열림

팝오버를 여는 순간 모델을 미리 로딩해 봄.

사용자가 파일을 고르는 동안 준비하려고 했음.

그런데 동적 import와 모델 초기화가 첫 화면 표시와 경쟁함.

전체 시간은 짧아져도 팝오버가 늦게 열림.

버튼이 안 눌린 것처럼 보임.

결국 화면을 먼저 보여주기로 함.

이미지를 그린 뒤 두 번의 `requestAnimationFrame`을 기다림.

그다음 모델과 검색을 시작함.

빨리 끝나는 것과 빨라 보이는 것은 달랐음.

## 객체 인식과 검색을 같이 돌림

기존에는 객체 인식이 끝난 뒤 검색을 시작함.

그런데 기본 선택은 항상 전체 이미지임.

전체 이미지 검색이 객체 인식을 기다릴 이유가 없음.

두 작업을 병렬로 시작함.

```text
검색 이미지 준비
   ├─ 서버에서 전체 이미지 검색
   └─ 브라우저에서 객체 인식
       └─ 객체 선택 시 크롭 이미지로 검색 전환
```

전체 이미지 결과를 먼저 보여줌.

객체 분석이 끝나면 원하는 영역으로 다시 검색할 수 있음.

빠르게 객체를 바꿀 때는 이전 요청을 `AbortController`로 취소함.

request ID가 현재 요청과 같을 때만 결과를 반영함.

늦게 도착한 옛 응답이 새 결과를 덮는 일을 막음.

## 진짜 12초 병목은 모델 밖에 있었음

개발 PC에서는 빨랐음.

사내 PC에서는 여전히 느렸음.

단계별 로그를 추가해서 다시 측정함.

원인은 모델이 아니었음.

원본 `File`을 읽는 구간이었음.

엔드포인트 보안 프로그램이 파일 접근마다 검사하고 있었음.

| 작업 | 당시 실측 |
|---|---:|
| 원본 File 4바이트 slice | 약 12초 |
| 원본 File `arrayBuffer()` | 약 48초 |
| 메모리 Blob 읽기 | 약 4ms |

미리보기, 최적화, 객체 인식, 크롭, 업로드가 원본을 반복해서 열고 있었음.

GPU 추론을 1초 아래로 줄여도 파일을 세 번 열면 수십 초가 추가됨.

원본은 한 번만 읽기로 함.

```typescript
const bitmap = await createImageBitmap(file, {
  imageOrientation: "from-image",
});

const previewFile = await encode(
  bitmap,
  originalSize,
  0.92
);

const searchFile = await encode(
  bitmap,
  maxDimension(768),
  0.85
);

bitmap.close();
```

한 번 만든 `ImageBitmap`에서 두 파일을 만듦.

- 미리보기: 원본 해상도, JPEG 0.92
- 검색: 긴 변 768px, JPEG 0.85

이후 작업은 메모리 사본만 사용함.

effect 재실행도 막아야 했음.

`WeakMap<File, Promise<...>>`으로 인제스트 promise를 캐시함.

성공한 작업은 재사용함.

실패한 promise는 지워서 다시 시도할 수 있게 함.

## 최종 흐름

```text
1. 원본 File을 한 번 읽음
2. 미리보기용·검색용 JPEG를 만듦
3. 미리보기를 먼저 그림
4. 첫 paint 이후 두 작업을 같이 시작함
   ├─ 전체 이미지 서버 검색
   └─ 브라우저 객체 인식
5. 객체 영역을 Canvas로 자름
6. 객체 선택 시 크롭 이미지로 검색함
7. 모델·인식·업로드 결과를 재사용함
```

| 문제 | 해결 |
|---|---|
| WASM 모델이 느림 | WebGPU fp16, WASM q8 fallback |
| 팝오버마다 모델 로딩 | 모듈 스코프 캐시 |
| 같은 이미지 재분석 | 세션 store 캐시 |
| 객체 인식이 검색을 막음 | 서버 검색과 로컬 추론 병렬화 |
| 프리로드가 첫 화면을 막음 | 첫 paint 이후 모델 실행 |
| 큰 원본을 그대로 처리 | 768px JPEG로 최적화 |
| 원본 File 반복 접근 | 한 번만 읽고 메모리 사본 사용 |

## 결론

시작은 모델 로딩 3~5초였음.

WebGPU로 427ms까지 줄임.

이걸로 끝인 줄 알았음.

캐시, 컴포넌트 생명주기, 첫 paint, 파일 I/O가 더 남아 있었음.

가장 큰 병목은 모델 밖에서 나오기도 했음.

브라우저 AI 성능을 볼 때 추론 시간만 재면 안 됨.

파일 선택부터 첫 화면, 첫 검색 결과, 객체 후보까지 나눠서 봐야 함.

`device: "webgpu"` 한 줄로 끝나는 일이 아니었음.

사용자가 기다리는 전체 경로를 줄여야 비로소 쓸 수 있는 기능이 됨.
