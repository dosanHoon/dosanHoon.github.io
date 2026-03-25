---
title: "Next.js Middleware로 인증과 라우팅 제어하기"
date: "2026-03-19T10:45:00.000Z"
template: "post"
draft: false
slug: "/posts/nextjs-middleware"
category: "NEXT.JS"
tags:
  - "Next.js"
  - "Middleware"
  - "Authentication"
description: "사내 프로젝트에서 Next.js Middleware를 활용하여 인증 토큰 검증, 조건부 라우팅, 요청 헤더 조작을 구현한 방법을 설명합니다."
---

## 소개

Next.js 12.2 이상에서 제공하는 Middleware는 서버리스 엣지 런타임에서 실행되어 요청을 조작할 수 있는 강력한 기능입니다. 사내 프로젝트에서는 이를 활용하여 인증과 라우팅을 효과적으로 제어합니다.

## Middleware 기본 설정

프로젝트 루트에 `middleware.ts` 또는 `middleware.js` 생성:

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  console.log('Middleware executed:', request.nextUrl.pathname);

  return NextResponse.next();
}

// Middleware 실행 경로 설정
export const config = {
  matcher: [
    /*
     * 다음 경로를 제외한 모든 요청에 대해 Middleware 실행
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
```

## 인증 토큰 검증

### 1. JWT 토큰 검증 Middleware

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);

interface JWTPayload {
  sub: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const verified = await jwtVerify<JWTPayload>(token, JWT_SECRET);
    return verified.payload;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 공개 경로는 Middleware 스킵
  const publicPaths = ['/login', '/register', '/forgot-password'];
  if (publicPaths.includes(pathname)) {
    return NextResponse.next();
  }

  // 쿠키에서 토큰 추출
  const token = request.cookies.get('accessToken')?.value;

  if (!token) {
    // 토큰이 없으면 로그인 페이지로 리다이렉트
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 토큰 검증
  const payload = await verifyToken(token);

  if (!payload) {
    // 토큰이 만료되었거나 유효하지 않음
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('accessToken');
    response.cookies.delete('refreshToken');
    return response;
  }

  // 요청 헤더에 사용자 정보 추가
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-user-id', payload.sub);
  requestHeaders.set('x-user-email', payload.email);
  requestHeaders.set('x-user-role', payload.role);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|login|register).*)',
  ],
};
```

## 역할 기반 접근 제어 (RBAC)

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);

interface JWTPayload {
  sub: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer';
  iat: number;
  exp: number;
}

// 경로별 필요한 역할 정의
const roleBasedRoutes: Record<string, string[]> = {
  '/dashboard/admin': ['admin'],
  '/dashboard/editor': ['admin', 'editor'],
  '/dashboard/viewer': ['admin', 'editor', 'viewer'],
};

async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const verified = await jwtVerify<JWTPayload>(token, JWT_SECRET);
    return verified.payload;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 공개 경로 처리
  const publicPaths = ['/login', '/register'];
  if (publicPaths.includes(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get('accessToken')?.value;

  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const payload = await verifyToken(token);

  if (!payload) {
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('accessToken');
    return response;
  }

  // 역할 기반 접근 제어
  const requiredRoles = roleBasedRoutes[pathname];
  if (requiredRoles && !requiredRoles.includes(payload.role)) {
    // 접근 권한이 없으면 403 Forbidden
    return NextResponse.json(
      { error: 'Access Denied' },
      { status: 403 }
    );
  }

  // 요청 헤더에 사용자 정보 추가
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-user-id', payload.sub);
  requestHeaders.set('x-user-role', payload.role);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|login|register).*)',],
};
```

## 다국어 지원 라우팅

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const SUPPORTED_LOCALES = ['en', 'ko', 'ja'];
const DEFAULT_LOCALE = 'ko';

function getLocaleFromRequest(request: NextRequest): string {
  // 1. URL 매개변수 확인
  const locale = request.nextUrl.searchParams.get('locale');
  if (locale && SUPPORTED_LOCALES.includes(locale)) {
    return locale;
  }

  // 2. 쿠키 확인
  const cookieLocale = request.cookies.get('NEXT_LOCALE')?.value;
  if (cookieLocale && SUPPORTED_LOCALES.includes(cookieLocale)) {
    return cookieLocale;
  }

  // 3. Accept-Language 헤더 확인
  const acceptLanguage = request.headers.get('accept-language');
  if (acceptLanguage) {
    const preferred = acceptLanguage
      .split(',')[0]
      .split('-')[0]
      .toLowerCase();
    if (SUPPORTED_LOCALES.includes(preferred)) {
      return preferred;
    }
  }

  return DEFAULT_LOCALE;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 이미 로케일이 포함된 경로는 스킵
  if (SUPPORTED_LOCALES.some(locale => pathname.startsWith(`/${locale}`))) {
    return NextResponse.next();
  }

  const locale = getLocaleFromRequest(request);

  // 로케일이 포함된 URL로 리라이트
  request.nextUrl.pathname = `/${locale}${pathname}`;

  // 로케일을 쿠키에 저장
  const response = NextResponse.rewrite(request.nextUrl);
  response.cookies.set('NEXT_LOCALE', locale, {
    maxAge: 31536000, // 1년
  });

  return response;
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
```

## 요청 리레이트

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Rate limiting을 위한 간단한 메모리 저장소 (프로덕션에서는 Redis 사용)
const requestCounts = new Map<string, { count: number; resetTime: number }>();

function getRateLimit(identifier: string, limit: number, windowMs: number) {
  const now = Date.now();
  const record = requestCounts.get(identifier);

  if (!record || now > record.resetTime) {
    requestCounts.set(identifier, {
      count: 1,
      resetTime: now + windowMs,
    });
    return { allowed: true, remaining: limit - 1 };
  }

  record.count++;
  const allowed = record.count <= limit;
  const remaining = Math.max(0, limit - record.count);

  return { allowed, remaining };
}

export async function middleware(request: NextRequest) {
  // API 요청에 대한 Rate limiting
  if (request.nextUrl.pathname.startsWith('/api')) {
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const identifier = `api-${ip}`;

    const { allowed, remaining } = getRateLimit(
      identifier,
      100, // 100 요청
      60 * 1000 // 1분 윈도우
    );

    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many requests' },
        {
          status: 429,
          headers: {
            'Retry-After': '60',
          },
        }
      );
    }

    // 응답 헤더에 Rate limit 정보 추가
    const response = NextResponse.next();
    response.headers.set('X-RateLimit-Limit', '100');
    response.headers.set('X-RateLimit-Remaining', remaining.toString());

    return response;
  }

  return NextResponse.next();
}
```

## 요청 헤더 및 쿠키 조작

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // 요청 헤더 추가
  response.headers.set('X-Custom-Header', 'CustomValue');
  response.headers.set(
    'X-Requested-At',
    new Date().toISOString()
  );

  // 쿠키 조작
  const token = request.cookies.get('accessToken')?.value;

  if (token) {
    // 기존 쿠키 갱신
    response.cookies.set('accessToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24시간
    });
  }

  // 새로운 쿠키 추가
  response.cookies.set('middleware-timestamp', Date.now().toString());

  return response;
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
```

## CORS 처리

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(',') || [
  'http://localhost:3000',
];

export async function middleware(request: NextRequest) {
  const origin = request.headers.get('origin');

  if (request.method === 'OPTIONS') {
    // Preflight 요청 처리
    if (origin && ALLOWED_ORIGINS.includes(origin)) {
      return new NextResponse(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    return new NextResponse(null, { status: 403 });
  }

  // 일반 요청에 CORS 헤더 추가
  const response = NextResponse.next();

  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }

  return response;
}

export const config = {
  matcher: '/api/:path*',
};
```

## A/B 테스팅

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // A/B 테스트 대상 경로
  if (pathname === '/checkout') {
    // 사용자의 일관된 변형 선택 (쿠키 기반)
    let variant = request.cookies.get('ab-test-variant')?.value;

    if (!variant) {
      // 새로운 사용자라면 무작위로 A 또는 B 할당
      variant = Math.random() < 0.5 ? 'a' : 'b';

      const response = NextResponse.next();
      response.cookies.set('ab-test-variant', variant, {
        maxAge: 60 * 60 * 24 * 30, // 30일
      });

      // 변형에 따라 다른 페이지 제공
      if (variant === 'b') {
        request.nextUrl.pathname = '/checkout-v2';
        return NextResponse.rewrite(request.nextUrl);
      }

      return response;
    }

    // 기존 사용자라면 저장된 변형 사용
    if (variant === 'b') {
      request.nextUrl.pathname = '/checkout-v2';
      return NextResponse.rewrite(request.nextUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/checkout'],
};
```

## 보안 헤더 추가

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // 보안 헤더 추가
  response.headers.set(
    'X-Content-Type-Options',
    'nosniff'
  );
  response.headers.set(
    'X-Frame-Options',
    'DENY'
  );
  response.headers.set(
    'X-XSS-Protection',
    '1; mode=block'
  );
  response.headers.set(
    'Referrer-Policy',
    'strict-origin-when-cross-origin'
  );
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()'
  );

  // Content Security Policy
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
    );
  }

  return response;
}
```

## 실전 예제: 완전한 인증 Middleware

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);
const PUBLIC_PATHS = ['/login', '/register', '/forgot-password', '/public'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 공개 경로 처리
  if (PUBLIC_PATHS.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  const token = request.cookies.get('accessToken')?.value;

  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const verified = await jwtVerify(token, JWT_SECRET);
    const user = verified.payload as any;

    // 요청 헤더에 사용자 정보 추가
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', user.sub);
    requestHeaders.set('x-user-role', user.role);

    // 응답 보안 헤더 추가
    const response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });

    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');

    return response;
  } catch (error) {
    console.error('Token verification failed:', error);

    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('accessToken');
    response.cookies.delete('refreshToken');

    return response;
  }
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|login|register|public).*)',
  ],
};
```

## 결론

Next.js Middleware의 주요 활용 방안:

1. **인증**: 토큰 검증 및 만료 처리
2. **권한 관리**: 역할 기반 접근 제어
3. **라우팅**: 조건부 리다이렉트 및 리라이트
4. **다국어 지원**: 자동 로케일 감지 및 라우팅
5. **보안**: 보안 헤더 추가 및 CORS 처리
6. **성능**: Rate limiting 및 캐싱 제어
7. **A/B 테스팅**: 사용자별 일관된 변형 제공

Middleware를 효과적으로 활용하면 애플리케이션 보안과 성능을 크게 향상시킬 수 있습니다.
