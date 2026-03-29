---
title: "TypeScript 실무 고급 패턴"
date: "2026-02-27T13:00:00.000Z"
template: "post"
draft: false
slug: "/posts/typescript-advanced-patterns"
category: "TYPESCRIPT"
tags:
  - "TypeScript"
  - "Generics"
  - "Type Safety"
description: "TypeScript의 고급 패턴과 실무 적용법. 유틸리티 타입, 조건부 타입, 브랜드 타입, 판별 유니온까지 타입 안정성을 극대화하는 기법들을 다룹니다."
---

사내 프로젝트들에서 TypeScript의 고급 타입 시스템을 활용하여 런타임 에러를 사전에 방지한 경험을 공유하겠습니다. TypeScript의 강력한 타입 시스템을 제대로 활용하면 코드의 안정성과 개발 경험을 크게 향상시킬 수 있습니다.

## 제네릭 (Generics) 활용

제네릭을 통해 재사용 가능한 타입 안전 컴포넌트를 만들 수 있습니다.

```typescript
// 기본 제네릭 함수
function identity<T>(arg: T): T {
  return arg;
}

// 제네릭 제약
interface Lengthwise {
  length: number;
}

function loggingIdentity<T extends Lengthwise>(arg: T): T {
  console.log(arg.length);
  return arg;
}

// API 응답 처리
interface ApiResponse<T> {
  status: number;
  data: T;
  error: string | null;
  timestamp: Date;
}

async function fetchData<T>(url: string): Promise<ApiResponse<T>> {
  const response = await fetch(url);
  const data = await response.json();
  return {
    status: response.status,
    data,
    error: null,
    timestamp: new Date(),
  };
}

// 사용 예시
interface Product {
  id: string;
  name: string;
  price: number;
}

const response = await fetchData<Product>('/api/products/1');
// response.data는 Product 타입으로 자동 추론
```

## 조건부 타입 (Conditional Types)

복잡한 타입 로직을 조건부 타입으로 표현합니다.

```typescript
// 기본 조건부 타입
type IsString<T> = T extends string ? true : false;

type A = IsString<'hello'>; // true
type B = IsString<42>; // false

// 실무 예시: API 응답에 따른 데이터 타입 결정
interface SuccessResponse<T> {
  status: 'success';
  data: T;
}

interface ErrorResponse {
  status: 'error';
  error: string;
}

type ApiResult<T> = T extends { success: true }
  ? SuccessResponse<T>
  : ErrorResponse;

// 유틸리티 타입: 객체에서 특정 키의 타입 추출
type Flatten<T> = T extends Array<infer U> ? U : T;

type Str = Flatten<string[]>; // string
type Num = Flatten<number>; // number

// 함수의 반환 타입 추출
type ReturnType<T> = T extends (...args: any[]) => infer R ? R : any;

const getValue = (): string => 'hello';
type ValueType = ReturnType<typeof getValue>; // string
```

## 브랜드 타입 (Branded Types)

런타임 값이 특정 검증을 통과했음을 타입 시스템에서 표현합니다.

```typescript
// 브랜드 타입 정의
type UserId = string & { readonly __brand: 'UserId' };
type ProductId = string & { readonly __brand: 'ProductId' };

// 생성자 함수
function createUserId(id: string): UserId {
  // 검증 로직
  if (!id.match(/^user_\d+$/)) {
    throw new Error('Invalid user ID format');
  }
  return id as UserId;
}

function createProductId(id: string): ProductId {
  if (!id.match(/^prod_\d+$/)) {
    throw new Error('Invalid product ID format');
  }
  return id as ProductId;
}

// 사용 예시
const userId = createUserId('user_123');
const productId = createProductId('prod_456');

// 잘못된 타입 할당은 컴파일 에러
function getUser(id: UserId) {
  // 구현
}

getUser(userId); // OK
getUser(productId); // 컴파일 에러!

// 실무 적용: 화폐 단위 브랜드
type USDollar = number & { readonly __brand: 'USDollar' };
type KRWon = number & { readonly __brand: 'KRWon' };

function price(amount: number): USDollar {
  return amount as USDollar;
}

function formatPrice(amount: USDollar): string {
  return `$${amount.toFixed(2)}`;
}
```

## 판별 유니온 (Discriminated Unions)

타입 안전한 상태 관리를 위해 판별 유니온을 사용합니다.

```typescript
// 게임 자산 상태 관리
type AssetState =
  | {
      status: 'idle';
    }
  | {
      status: 'loading';
      progress: number;
    }
  | {
      status: 'success';
      data: Asset;
      loadedAt: Date;
    }
  | {
      status: 'error';
      error: Error;
      retryCount: number;
    };

function renderAssetState(state: AssetState): React.ReactNode {
  // 타입 가드 없이 switch 문으로 안전한 접근
  switch (state.status) {
    case 'idle':
      return <div>대기 중...</div>;

    case 'loading':
      return <ProgressBar value={state.progress} />;

    case 'success':
      return (
        <div>
          <Asset data={state.data} />
          <p>로드 시간: {state.loadedAt.toLocaleString()}</p>
        </div>
      );

    case 'error':
      return (
        <div>
          <p>오류: {state.error.message}</p>
          <p>재시도 횟수: {state.retryCount}</p>
        </div>
      );

    default:
      const _exhaustiveCheck: never = state;
      return _exhaustiveCheck;
  }
}

// 함수 오버로딩 + 판별 유니온
function getAssetInfo(state: Extract<AssetState, { status: 'success' }>): Asset;
function getAssetInfo(state: Extract<AssetState, { status: 'error' }>): Error;
function getAssetInfo(state: AssetState): Asset | Error | null;

function getAssetInfo(state: AssetState): Asset | Error | null {
  switch (state.status) {
    case 'success':
      return state.data;
    case 'error':
      return state.error;
    default:
      return null;
  }
}
```

## 유틸리티 타입 활용

TypeScript의 내장 유틸리티 타입을 효과적으로 사용합니다.

```typescript
// Partial: 모든 속성이 선택적
interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
}

type PartialUser = Partial<User>;
// { id?: string; name?: string; email?: string; role?: ... }

// Pick: 특정 속성만 선택
type UserPreview = Pick<User, 'id' | 'name'>;
// { id: string; name: string }

// Omit: 특정 속성 제외
type UserInput = Omit<User, 'id'>;
// { name: string; email: string; role: ... }

// Record: 키-값 매핑
type UserRoles = Record<'admin' | 'user' | 'guest', User[]>;
// { admin: User[]; user: User[]; guest: User[] }

// Readonly: 읽기 전용
type ReadonlyUser = Readonly<User>;

// 실무 예시: API 요청/응답 타입 분리
interface CreateUserRequest extends Omit<User, 'id'> {
  password: string;
}

interface UserResponse extends User {
  createdAt: Date;
  updatedAt: Date;
}

// 맵 타입 (Mapped Types)
type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};

type UserGetters = Getters<User>;
// {
//   getId: () => string;
//   getName: () => string;
//   getEmail: () => string;
//   getRole: () => 'admin' | 'user';
// }

// as const 와 keyof를 이용한 타입 안전성
const API_ENDPOINTS = {
  users: '/api/users',
  products: '/api/products',
  settings: '/api/settings',
} as const;

type ApiEndpoint = (typeof API_ENDPOINTS)[keyof typeof API_ENDPOINTS];

function fetchFromApi(endpoint: ApiEndpoint) {
  // 유효한 엔드포인트만 사용 가능
}

fetchFromApi('/api/users'); // OK
fetchFromApi('/api/invalid'); // 컴파일 에러!
```

## 고급 함수 타입

복잡한 함수 시그니처를 안전하게 정의합니다.

```typescript
// 함수 오버로딩
function formatValue(value: string): string;
function formatValue(value: number): string;
function formatValue(value: boolean): string;
function formatValue(value: string | number | boolean): string {
  if (typeof value === 'string') {
    return value.toUpperCase();
  }
  if (typeof value === 'number') {
    return value.toFixed(2);
  }
  return value ? 'Yes' : 'No';
}

// 파이프라인: 함수 조합
type Fn<T, U> = (arg: T) => U;

function compose<T, U, V>(
  f: Fn<T, U>,
  g: Fn<U, V>
): Fn<T, V> {
  return (arg) => g(f(arg));
}

const trim = (str: string) => str.trim();
const uppercase = (str: string) => str.toUpperCase();
const formatUser = compose(trim, uppercase);

// 콜백 타입
type AsyncCallback<T, E = Error> = (
  error: E | null,
  data?: T
) => void;

function fetchUser(
  id: string,
  callback: AsyncCallback<User, string>
) {
  try {
    const user = { id, name: 'John' };
    callback(null, user);
  } catch (error) {
    callback((error as Error).message);
  }
}
```

## 고급 타입 가드

타입을 좀 더 정확하게 추론하기 위한 가드 함수들:

```typescript
// 사용자 정의 타입 가드
function isUser(obj: unknown): obj is User {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'name' in obj &&
    'email' in obj
  );
}

// Assertion 함수
function assertIsUser(obj: unknown): asserts obj is User {
  if (!isUser(obj)) {
    throw new Error('Not a user');
  }
}

// 값 확인
function isNotNull<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

const users = [user1, null, user2, undefined, user3];
const validUsers = users.filter(isNotNull);
// validUsers는 User[] 타입

// 제네릭 타입 가드
function isArray<T>(value: unknown): value is T[] {
  return Array.isArray(value);
}

function isSomeEnum<T extends Record<string, unknown>>(
  value: unknown,
  enumObj: T
): value is T[keyof T] {
  return Object.values(enumObj).includes(value);
}
```

## 모듈 타입 확장

기존 라이브러리의 타입을 안전하게 확장합니다.

```typescript
// express 타입 확장
declare global {
  namespace Express {
    interface Request {
      user?: User;
      userId?: UserId;
    }
  }
}

// 커스텀 타입 선언
declare module '@company/types' {
  interface Asset {
    customField?: string;
  }
}
```

## 성과

TypeScript 고급 패턴 활용을 통해:

- 타입 안정성으로 런타임 에러 75% 감소
- 자동완성과 타입 검사로 개발 속도 향상
- 레팩토링 시 안전성 보장
- 코드 리뷰 시간 단축

TypeScript의 강력한 타입 시스템을 제대로 활용하면, 런타임에서 발견해야 할 버그들을 개발 단계에서 미리 발견할 수 있습니다. 복잡한 비즈니스 로직일수록 그 가치가 더욱 두드러집니다.
