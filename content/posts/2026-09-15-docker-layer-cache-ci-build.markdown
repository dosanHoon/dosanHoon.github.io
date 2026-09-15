---
title: "병렬 빌드보다 Docker 캐시가 먼저였음 — CI 12분을 1분으로"
date: "2026-09-15T09:00:00.000Z"
template: "post"
draft: true
slug: "/posts/docker-layer-cache-ci-build"
category: "DevOps"
tags:
  - "Docker"
  - "BuildKit"
  - "CI/CD"
  - "Gradle"
  - "Performance"
description: "BE·BO 이미지를 병렬로 빌드해도 1분 정도밖에 줄지 않았음. CI 에이전트에 갇힌 Docker 캐시를 레지스트리로 옮기고, Gradle 멀티모듈 의존 순서대로 레이어를 나눠 12분대 빌드를 1분 15초까지 줄인 기록."
---

백엔드 CI 빌드가 12분 넘게 걸리고 있었음.

하나의 Gradle 멀티모듈 프로젝트에서 사용자 API와 운영 API 이미지를 차례로 빌드함.

둘을 동시에 빌드하면 빨라질 것 같았음.

그래서 먼저 병렬화함.

```text
기존: 사용자 API 빌드 → 운영 API 빌드
변경: 사용자 API 빌드 ─┐
                       ├→ 둘 다 끝나면 push
      운영 API 빌드 ───┘
```

결과는 이랬음.

| 방식 | CI 소요 |
|---|---:|
| 순차 빌드 | 12분 09초 |
| 병렬 빌드 | 10분 47초 |

1분 22초 줄었음.

안 줄어든 것은 아니지만 기대한 결과는 아니었음.

그래서 병렬화한 커밋을 되돌림.

## 같은 순차 빌드인데 시간이 두 배 차이 남

로그를 더 비교해 보니 이상한 값이 보임.

같은 순차 빌드가 어떤 CI 에이전트에서는 6분 18초, 다른 에이전트에서는 12분 09초 걸림.

코드도 빌드 방식도 같았음.

다른 것은 실행한 에이전트였음.

한쪽에는 이전 Docker 레이어가 남아 있었고, 다른 쪽에는 없었음.

병목은 순차 실행이 아니었음.

**CI 에이전트의 로컬 Docker 캐시 유무**였음.

에이전트가 바뀔 때마다 다음 작업을 다시 하고 있었음.

- Gradle 이미지와 인증서 준비
- 의존성 다운로드
- 공통 모듈 컴파일
- 애플리케이션 모듈 컴파일

병렬화는 캐시 미스를 두 개 동시에 실행했을 뿐이었음.

## 캐시를 CI 에이전트 밖으로 꺼냄

CI 에이전트의 로컬 디스크를 믿지 않기로 함.

Docker builder stage를 별도 이미지로 만들어 레지스트리에 저장함.

다음 빌드는 이 이미지를 `--cache-from`으로 가져와 사용함.

```bash
docker build \
  --target builder \
  --build-arg BUILDKIT_INLINE_CACHE=1 \
  --cache-from "$BUILDER_CACHE" \
  -t "$BUILDER_CACHE" .

docker build \
  --build-arg BUILDKIT_INLINE_CACHE=1 \
  --cache-from "$BUILDER_CACHE" \
  -t "$APP_IMAGE" .

docker push "$APP_IMAGE"
docker push "$BUILDER_CACHE" || echo "cache push failed"
```

BuildKit의 inline cache metadata를 builder 이미지에 포함함.

사용자 API와 운영 API는 각각 캐시 태그를 하나씩 가짐.

빌드 번호가 붙는 최종 이미지와 달리 캐시 이미지는 고정 태그를 사용함.

새 CI 에이전트가 작업을 받아도 레지스트리에서 직전 빌드의 레이어를 재사용할 수 있게 됨.

<figure>
  <img src="/media/docker-registry-layer-cache.svg" alt="CI 에이전트 로컬 캐시를 레지스트리 캐시로 옮기고 Gradle 모듈별 Docker 레이어로 나눈 구조" />
  <figcaption>캐시를 에이전트의 로컬 디스크가 아니라 레지스트리에 두고, builder 내부를 모듈별 레이어로 나눔.</figcaption>
</figure>

## 첫 빌드는 오히려 14분 걸림

레지스트리 캐시를 넣은 첫 회차는 14분 08초 걸림.

기존 12분보다 느려짐.

캐시를 처음 채우는 회차였기 때문임.

재사용할 것이 없는데 builder 캐시 이미지까지 만들어 push했음.

캐시는 첫 회차 시간이 아니라 **다음 회차가 다른 에이전트에서도 빨라지는지**로 확인해야 함.

다른 에이전트에서 web 소스 파일 하나를 바꾸고 다시 실행함.

레지스트리 캐시가 실제로 hit함.

전체 시간은 4분 24초까지 줄었음.

그런데 로그를 보니 아직 web 컴파일에만 3분 01초가 걸리고 있었음.

## 소스는 나눠 복사했는데 컴파일은 한 레이어였음

기존 Dockerfile은 모듈 소스를 차례로 복사한 뒤 마지막에 `bootJar`를 한 번 실행함.

```dockerfile
COPY application-core/src ./application-core/src
COPY infrastructure/src ./infrastructure/src
COPY common-web/src ./common-web/src
COPY web/src ./web/src

RUN gradle :web:bootJar --no-daemon
```

web 파일 하나만 바뀌어도 마지막 `COPY` 이후의 `RUN` 레이어는 무효가 됨.

Gradle은 그 레이어 안에서 core, common-web, infrastructure, web을 다시 컴파일함.

Docker 입장에서는 `bootJar` 전체가 하나의 작업이었음.

Gradle의 모듈 캐시와 Docker의 레이어 캐시 경계가 맞지 않았음.

## 의존 방향대로 레이어를 나눔

멀티스테이지 Dockerfile의 stage를 더 늘리지는 않았음.

builder stage 내부의 `COPY + RUN`을 모듈별 레이어로 나눔.

```dockerfile
COPY application-core/src ./application-core/src
RUN gradle :application-core:jar --no-daemon

COPY common-web/src ./common-web/src
RUN gradle :common-web:jar --no-daemon

COPY infrastructure/src ./infrastructure/src
RUN gradle :infrastructure:jar --no-daemon

COPY web/src ./web/src
RUN gradle :web:bootJar --no-daemon
```

순서는 실제 모듈 의존 방향을 따름.

```text
application-core
   ├─ common-web ──────┐
   └─ infrastructure ──┼─ web / ops-web
```

web 소스만 바뀌면 앞의 세 레이어는 그대로 재사용함.

infrastructure가 바뀌면 core와 common-web은 재사용하고 infrastructure 이후만 다시 빌드함.

core가 바뀌면 하위 모듈도 영향을 받으니 뒤 레이어가 모두 무효가 되는 것이 맞음.

소스 코드의 의존 그래프와 Docker 캐시의 무효화 그래프를 맞춘 셈임.

## 4분 24초에서 1분 15초

모듈별 레이어를 처음 적용한 회차는 캐시를 다시 채우느라 약 10분 걸림.

그다음 web 파일 하나만 바꾸고 다시 빌드함.

| 회차 | 조건 | CI 소요 |
|---|---|---:|
| 기존 순차 | 캐시 없음 | 12분 09초 |
| 병렬 실험 | 로컬 캐시 의존 | 10분 47초 |
| 레지스트리 캐시 첫 회차 | 캐시 채움 | 14분 08초 |
| 레지스트리 캐시 hit | web 1파일 변경 | 4분 24초 |
| 모듈별 레이어 첫 회차 | 캐시 다시 채움 | 약 10분 |
| 모듈별 레이어 hit | web 1파일 변경 | **1분 15초** |

같은 web 1파일 변경 조건에서 4분 24초가 1분 15초가 됨.

약 72% 줄었음.

web 컴파일 구간만 보면 3분 01초에서 46초로 줄었음.

약 75% 줄었음.

최초의 캐시 없는 12분 09초와 비교하면 전체 시간은 약 90% 짧아졌음.

다만 이 비교는 cold build와 warm build라 같은 조건의 벤치마크는 아님.

그래서 실제 개선값은 같은 파일 변경 조건인 4분 24초와 1분 15초를 기준으로 보는 편이 정확함.

## 캐시 실패가 배포 실패가 되면 안 됨

캐시는 최적화임.

정확한 이미지를 만들기 위한 필수 조건은 아님.

레지스트리에 캐시 태그가 없는 첫 실행은 cache miss로 정상 빌드함.

레지스트리 장애나 인증 문제로 builder 캐시 생성과 push가 실패해도 경고만 남김.

최종 이미지 빌드와 push가 실패할 때만 배포를 중단함.

```text
builder cache 실패 → 느리게 계속 빌드
최종 image 실패   → 즉시 중단
```

고정된 `builder-cache` 태그를 여러 빌드가 동시에 덮어쓸 가능성도 있음.

이 경우 캐시 hit율이 낮아질 수는 있음.

하지만 최종 이미지는 현재 소스와 각 레이어의 content digest로 다시 판정하므로 산출물이 섞이지는 않음.

성능 최적화의 실패가 배포 정확성까지 건드리지 않게 경계를 둠.

## 시간을 줄인 것은 병렬성이 아니었음

처음에는 두 이미지를 동시에 만들면 된다고 생각함.

실측해 보니 실행 순서보다 캐시의 위치가 더 큰 변수였음.

이번 작업에서 배운 것은 단순했음.

- 평균 시간만 보지 않고 CI 에이전트별 편차를 봐야 함
- cold build와 warm build를 나눠 측정해야 함
- 애플리케이션 의존 그래프와 Docker 레이어 경계를 맞춰야 함
- 캐시는 공유할 수 있어야 CI 스케줄링에 흔들리지 않음
- 캐시 장애는 느린 빌드로 끝나야지 배포 장애가 되면 안 됨

병렬 빌드는 같은 일을 동시에 실행함.

캐시는 그 일을 다시 하지 않게 함.

이번 CI에서는 동시에 하는 것보다 안 하는 쪽이 훨씬 빨랐음.

현재 변경은 개발 환경에서 이미지 배포와 두 API의 정상 응답까지 확인함.

운영 반영 전까지는 캐시 hit율과 고정 태그 경합을 더 관찰할 예정임.
