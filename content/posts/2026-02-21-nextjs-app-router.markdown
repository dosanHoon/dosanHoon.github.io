---
title: "Next.js App Router로 마이그레이션하기"
date: "2026-02-21T09:30:00.000Z"
template: "post"
draft: false
slug: "/posts/nextjs-app-router-migration"
category: "NEXT.JS"
tags:
  - "Next.js"
  - "React"
  - "App Router"
description: "Pages Router에서 App Router로의 마이그레이션 경험. 레이아웃 시스템, 서버 컴포넌트, 패러럴 라우트까지 실제 프로젝트 사례를 통해 알아봅니다."
---

사내 자산 관리 서비스 프로젝트에서 Next.js 15 기반으로 App Router를 도입하면서 얻은 실무 경험을 공유하겠습니다. Pages Router에서 App Router로의 전환은 단순한 파일 구조 변경을 넘어서 애플리케이션 아키텍처를 근본적으로 개선하는 기회였습니다.

## Pages Router에서의 문제점

기존 Pages Router 방식에서는 여러 문제점을 마주했습니다. 특히 레이아웃을 공유하는 복잡한 중첩 구조를 다룰 때, 각 페이지에서 같은 레이아웃 컴포넌트를 반복적으로 import하고 감싸야 했습니다. 또한 API 라우트와 페이지 라우트가 분리되어 있어서 관련 로직을 함께 관리하기 어려웠습니다.

```typescript
// pages/products/index.tsx - Pages Router 방식
import Layout from '@/components/Layout';
import Header from '@/components/Header';

export default function ProductsPage() {
  return (
    <Layout>
      <Header title="상품 목록" />
      {/* 페이지 내용 */}
    </Layout>
  );
}
```

## App Router의 레이아웃 시스템

App Router에서 가장 큰 변화는 레이아웃 시스템입니다. 계층적인 layout.tsx 파일을 통해 각 디렉토리 수준에서 레이아웃을 정의할 수 있게 되었습니다.

```typescript
// app/layout.tsx - 루트 레이아웃
import type { ReactNode } from 'react';

export const metadata = {
  title: '자산 관리 서비스',
  description: '게임 자산을 관리하는 웹 애플리케이션',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <Provider>
          {children}
        </Provider>
      </body>
    </html>
  );
}
```

```typescript
// app/products/layout.tsx - 제품 섹션 레이아웃
import Header from '@/components/Header';

export default function ProductsLayout({ children }: { children: React.ReactNode }) {
  return (
    <section className="products-section">
      <Header title="상품 목록" />
      <div className="products-content">
        {children}
      </div>
    </section>
  );
}
```

이제 `app/products/page.tsx`는 레이아웃을 신경 쓰지 않고 순수 콘텐츠만 정의하면 됩니다.

## 서버 컴포넌트의 활용

App Router의 가장 혁신적인 기능은 기본적으로 모든 컴포넌트가 서버 컴포넌트라는 점입니다. 이를 통해 서버 사이드 로직을 컴포넌트 내에서 직접 처리할 수 있습니다.

```typescript
// app/products/[id]/page.tsx - 서버 컴포넌트
import { Metadata } from 'next';
import ProductDetail from '@/components/ProductDetail';
import { getProduct } from '@/api/products';

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const product = await getProduct(params.id);

  return {
    title: product.name,
    description: product.description,
  };
}

export default async function ProductPage({ params }: { params: { id: string } }) {
  const product = await getProduct(params.id);

  return <ProductDetail product={product} />;
}
```

이 방식의 장점은 데이터베이스 쿼리가 클라이언트에 노출되지 않으며, 빌드 시점에 정적 생성(Static Generation)이 가능하다는 점입니다.

## 클라이언트 컴포넌트와 상호작용

서버 컴포넌트만으로는 부족하므로, 클라이언트 상호작용이 필요한 부분은 'use client' 지시문으로 표시합니다.

```typescript
// app/products/search-filter.tsx - 클라이언트 컴포넌트
'use client';

import { useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function SearchFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');

  const handleSearch = useCallback((value: string) => {
    setQuery(value);

    if (value.trim()) {
      router.push(`/products?q=${encodeURIComponent(value)}`);
    } else {
      router.push('/products');
    }
  }, [router]);

  return (
    <input
      type="text"
      value={query}
      onChange={(e) => handleSearch(e.target.value)}
      placeholder="상품 검색..."
      className="search-input"
    />
  );
}
```

## 패러럴 라우트를 활용한 복잡한 레이아웃

우리 프로젝트에서 대시보드 레이아웃은 여러 부분이 독립적으로 동작해야 했습니다. 패러럴 라우트를 사용하면 같은 URL에서 여러 세그먼트를 독립적으로 관리할 수 있습니다.

```typescript
// app/dashboard/@sidebar/page.tsx
export default function Sidebar() {
  return (
    <aside className="sidebar">
      {/* 사이드바 내용 */}
    </aside>
  );
}
```

```typescript
// app/dashboard/@main/page.tsx
export default function MainContent() {
  return (
    <main className="main-content">
      {/* 메인 콘텐츠 */}
    </main>
  );
}
```

```typescript
// app/dashboard/layout.tsx
export default function DashboardLayout({
  sidebar,
  main,
}: {
  sidebar: React.ReactNode;
  main: React.ReactNode;
}) {
  return (
    <div className="dashboard">
      {sidebar}
      {main}
    </div>
  );
}
```

## 동적 라우트와 generateStaticParams

대량의 개별 상품 페이지를 만들 때 `generateStaticParams`를 사용하여 빌드 시점에 정적 페이지를 사전 생성할 수 있습니다.

```typescript
// app/products/[id]/page.tsx
export async function generateStaticParams() {
  const products = await getAllProducts();

  return products.map((product) => ({
    id: String(product.id),
  }));
}

export default async function ProductPage({ params }: { params: { id: string } }) {
  const product = await getProduct(params.id);

  if (!product) {
    return notFound();
  }

  return <ProductDetail product={product} />;
}
```

## 마이그레이션 전략

실제 마이그레이션은 한 번에 모든 것을 전환하기보다는 단계적으로 진행했습니다.

1. **레이아웃 먼저**: 공통 레이아웃을 먼저 App Router로 변환
2. **페이지 단위**: 독립적인 페이지부터 차례대로 전환
3. **API 라우트**: 기존 API 라우트를 app/api 디렉토리로 이동
4. **테스트**: 각 단계마다 철저한 테스트 진행

이 접근방식 덕분에 기존 기능을 유지하면서 안전하게 마이그레이션을 완료할 수 있었습니다.

## 성능 개선 효과

App Router 도입 후 우리 애플리케이션의 성능 지표가 눈에 띄게 개선되었습니다. 서버 컴포넌트로 인한 번들 크기 감소, 정적 생성으로 인한 더 빠른 초기 로딩, 그리고 클라이언트 사이드 자바스크립트 감소로 인한 상호작용성(Interactivity) 개선을 확인할 수 있었습니다.

Next.js App Router는 단순한 라우팅 시스템이 아니라, 모던 웹 애플리케이션 개발의 새로운 표준을 제시합니다. React Server Components의 패러다임을 받아들인다면, 더욱 효율적이고 성능이 우수한 애플리케이션을 만들 수 있을 것입니다.
