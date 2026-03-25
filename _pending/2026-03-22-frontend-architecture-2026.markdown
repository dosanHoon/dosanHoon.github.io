---
title: "2026년 프론트엔드 아키텍처 회고"
date: "2026-03-22T16:00:00.000Z"
template: "post"
draft: false
slug: "/posts/frontend-architecture-2026"
category: "FRONTEND"
tags:
  - "Architecture"
  - "Frontend"
  - "Review"
description: "프론트엔드 개발 여정을 회고합니다. jQuery/PHP 시대부터 현대 React/Next.js 스택으로의 진화, 모노레포 도입, 디자인 시스템 구축까지의 이야기를 담았습니다."
---

## 머리말

프론트엔드 개발을 해온 지 벌써 여러 해가 지났습니다. 이 기간 동안 웹 기술은 급속도로 발전했고, 우리 팀도 함께 성장했습니다. 이 글에서는 그 여정을 되돌아보며 배운 점들을 정리하겠습니다.

## 1. jQuery/PHP 시대 (2015-2018)

### 당시 상황

초기 프로젝트들은 주로 jQuery와 서버 사이드 렌더링(PHP)으로 구성되어 있었습니다.

```html
<!-- 전형적인 PHP 템플릿 -->
<?php foreach($assets as $asset): ?>
  <div class="asset-card" id="asset-<?php echo $asset['id']; ?>">
    <img src="<?php echo $asset['thumbnail']; ?>" />
    <h3><?php echo htmlspecialchars($asset['name']); ?></h3>
  </div>
<?php endforeach; ?>

<script>
  $(document).ready(function() {
    $('.asset-card').click(function() {
      var id = $(this).data('id');
      $.ajax({
        url: '/api/assets/' + id,
        success: function(data) {
          $('.modal').html(data);
        }
      });
    });
  });
</script>
```

### 장점

- 빠른 개발 속도
- 학습 곡선이 낮음
- 직관적인 DOM 조작

### 문제점

```javascript
// 콜백 지옥
$.ajax({
  url: '/api/assets',
  success: function(assets) {
    assets.forEach(function(asset) {
      $.ajax({
        url: '/api/assets/' + asset.id + '/details',
        success: function(details) {
          // 더 깊은 중첩...
          updateUI(asset, details);
        }
      });
    });
  }
});

// 상태 관리 부재
var globalAssets = [];
var currentPage = 1;
var isLoading = false;
// 여러 파일에서 접근 가능 - 버그 유발

// DOM 조작의 복잡성
$('#asset-list').empty();
$('#asset-list').append(
  '<div class="item">' + name + '</div>'
);
```

## 2. React 도입기 (2018-2020)

### 동기

jQuery의 한계를 느끼고 React를 도입했습니다.

```typescript
// React 초기 코드
import React, { useState, useEffect } from 'react';

const AssetList = () => {
  const [assets, setAssets] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    fetch('/api/assets')
      .then(res => res.json())
      .then(data => {
        setAssets(data);
        setIsLoading(false);
      });
  }, []);

  return (
    <div>
      {isLoading ? (
        <p>로딩 중...</p>
      ) : (
        <div className="grid">
          {assets.map(asset => (
            <AssetCard key={asset.id} asset={asset} />
          ))}
        </div>
      )}
    </div>
  );
};
```

### 진화 과정

#### 1단계: 상태 관리 (MobX)

처음에는 MobX를 사용했습니다:

```typescript
import { observable, action, computed } from 'mobx';
import { observer } from 'mobx-react';

class AssetStore {
  @observable assets: Asset[] = [];
  @observable currentPage: number = 1;
  @observable isLoading: boolean = false;

  @action
  setAssets(assets: Asset[]) {
    this.assets = assets;
  }

  @action
  async fetchAssets() {
    this.isLoading = true;
    const response = await fetch(`/api/assets?page=${this.currentPage}`);
    const data = await response.json();
    this.setAssets(data);
    this.isLoading = false;
  }

  @computed
  get assetCount() {
    return this.assets.length;
  }
}

@observer
class AssetList extends React.Component<{ store: AssetStore }> {
  componentDidMount() {
    this.props.store.fetchAssets();
  }

  render() {
    const { assets, isLoading } = this.props.store;
    return (
      <div>
        {isLoading ? <LoadingSpinner /> : <AssetGrid assets={assets} />}
      </div>
    );
  }
}
```

#### 2단계: Redux로 전환

2019년경 Redux로 전환했습니다:

```typescript
// 액션
const FETCH_ASSETS_START = 'FETCH_ASSETS_START';
const FETCH_ASSETS_SUCCESS = 'FETCH_ASSETS_SUCCESS';
const FETCH_ASSETS_ERROR = 'FETCH_ASSETS_ERROR';

// 리듀서
const initialState = {
  assets: [],
  isLoading: false,
  error: null,
};

const assetReducer = (state = initialState, action) => {
  switch (action.type) {
    case FETCH_ASSETS_START:
      return { ...state, isLoading: true };
    case FETCH_ASSETS_SUCCESS:
      return { ...state, assets: action.payload, isLoading: false };
    case FETCH_ASSETS_ERROR:
      return { ...state, error: action.payload, isLoading: false };
    default:
      return state;
  }
};

// 미들웨어
const fetchAssetsMiddleware = store => next => action => {
  if (action.type === 'FETCH_ASSETS') {
    fetch('/api/assets')
      .then(res => res.json())
      .then(data => store.dispatch({ type: FETCH_ASSETS_SUCCESS, payload: data }))
      .catch(err => store.dispatch({ type: FETCH_ASSETS_ERROR, payload: err }));
  }
  return next(action);
};
```

### 배운 점

- 선언적 UI의 강력함
- 상태 관리의 중요성
- 컴포넌트 분할의 필요성

## 3. 모던 스택 (2020-2026)

### Next.js 도입

2020년부터 Next.js를 채택했습니다:

```typescript
// App Router (2023년부터)
// app/assets/page.tsx
import { AssetGrid } from '@/components/AssetGrid';

async function getAssets(page: number) {
  const response = await fetch(`https://api.example.com/assets?page=${page}`, {
    next: { revalidate: 60 } // ISR
  });
  return response.json();
}

export default async function AssetPage() {
  const assets = await getAssets(1);

  return (
    <div>
      <h1>자산 라이브러리</h1>
      <AssetGrid assets={assets} />
    </div>
  );
}
```

### 모노레포 구조

Turborepo를 도입하여 모노레포를 구성했습니다:

```
monorepo/
├── apps/
│   ├── web (메인 사이트)
│   ├── admin (관리자 도구)
│   └── docs (문서)
├── packages/
│   ├── ui (공유 컴포넌트)
│   ├── eslint-config
│   ├── tsconfig
│   ├── types (공유 타입)
│   └── api-client
├── turbo.json
└── package.json
```

### 디자인 시스템 구축

```typescript
// packages/ui/src/Button.tsx
import { cva } from 'class-variance-authority';
import clsx from 'clsx';

const buttonVariants = cva(
  'px-4 py-2 rounded font-semibold transition-colors',
  {
    variants: {
      variant: {
        primary: 'bg-blue-500 text-white hover:bg-blue-600',
        secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300',
        danger: 'bg-red-500 text-white hover:bg-red-600',
      },
      size: {
        sm: 'text-sm px-3 py-1',
        md: 'text-base px-4 py-2',
        lg: 'text-lg px-6 py-3',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={clsx(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
);
```

## 4. 주요 아키텍처 결정사항

### 상태 관리: Redux → React Query → Zustand

```typescript
// React Query (현재)
import { useQuery, useMutation } from '@tanstack/react-query';

export const useAssets = (page: number) => {
  return useQuery({
    queryKey: ['assets', page],
    queryFn: () => fetch(`/api/assets?page=${page}`).then(res => res.json()),
    staleTime: 5 * 60 * 1000, // 5분
  });
};

export const useCreateAsset = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (asset: NewAsset) =>
      fetch('/api/assets', {
        method: 'POST',
        body: JSON.stringify(asset),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
    },
  });
};
```

### 데이터 페칭 패턴

```typescript
// Server Component에서 데이터 페칭
async function AssetList() {
  const assets = await fetchAssets();
  return <AssetGrid assets={assets} />;
}

// Client Component에서 실시간 업데이트
'use client';

import { useAssets } from '@/hooks/useAssets';

export function DynamicAssetList() {
  const { data, isLoading, error } = useAssets();

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorBoundary error={error} />;

  return <AssetGrid assets={data} />;
}
```

### 타입 안정성

```typescript
// packages/types/index.ts
export interface Asset {
  id: string;
  name: string;
  type: 'image' | 'video' | 'model' | 'audio';
  size: number;
  createdAt: ISO8601Date;
  updatedAt: ISO8601Date;
  creatorId: UserId;
  tags: Tag[];
  isPublic: boolean;
}

export type UserId = string & { readonly __brand: 'UserId' };
export type ISO8601Date = string & { readonly __brand: 'ISO8601Date' };
export type Tag = string & { readonly __brand: 'Tag' };

// Branded Types로 런타임 안정성 향상
function createAsset(id: string): Asset {
  return {
    id: id as UserId, // 컴파일러가 타입 체크
    // ...
  };
}
```

## 5. 성능 최적화 여정

### 번들 크기 감소

```typescript
// 동적 임포트
const HeavyComponent = dynamic(() => import('@/components/HeavyComponent'), {
  loading: () => <LoadingSpinner />,
  ssr: false,
});

// Tree shaking 최적화
import { Button } from '@/ui'; // ❌ 전체 라이브러리 포함
import { Button } from '@/ui/button'; // ✅ 필요한 것만 포함
```

### Core Web Vitals 개선

```typescript
// 이미지 최적화
import Image from 'next/image';

<Image
  src="/assets/image.jpg"
  alt="자산"
  width={800}
  height={600}
  priority={false}
  loading="lazy"
/>

// 폰트 최적화
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin', 'korean'],
  display: 'swap',
});
```

## 6. 개발 생산성

### 코드 생성 도구

```typescript
// Plop을 이용한 컴포넌트 생성
// plopfile.js
module.exports = plop => {
  plop.setGenerator('component', {
    description: 'React 컴포넌트 생성',
    prompts: [
      {
        type: 'input',
        name: 'name',
        message: '컴포넌트 이름',
      },
    ],
    actions: [
      {
        type: 'add',
        path: 'src/components/{{name}}/index.tsx',
        templateFile: 'plop-templates/component.hbs',
      },
      {
        type: 'add',
        path: 'src/components/{{name}}/{{name}}.test.tsx',
        templateFile: 'plop-templates/component.test.hbs',
      },
    ],
  });
};
```

### 테스트 전략

```typescript
// Vitest + React Testing Library
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AssetCard } from './AssetCard';

describe('AssetCard', () => {
  it('자산 정보를 표시해야 함', () => {
    const asset = {
      id: '1',
      name: 'Test Asset',
      type: 'image',
      createdAt: new Date(),
    };

    render(<AssetCard asset={asset} />);

    expect(screen.getByText('Test Asset')).toBeInTheDocument();
  });

  it('클릭 시 상세보기를 열어야 함', async () => {
    const onSelect = vi.fn();
    const asset = { id: '1', name: 'Test' };

    render(<AssetCard asset={asset} onSelect={onSelect} />);

    await userEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(onSelect).toHaveBeenCalledWith(asset);
    });
  });
});
```

## 7. 앞으로의 방향

### 다음 목표

1. **AI 통합**: 자동 태깅, 스마트 검색
2. **성능**: Lighthouse 점수 95+ 목표
3. **접근성**: WCAG 2.1 AA 준수
4. **국제화**: 15개 언어 지원
5. **엣지 런타임**: 더 많은 로직을 엣지에서 실행

```typescript
// 예상되는 미래 코드
// Vercel Edge Functions
export default async function handler(req: Request) {
  const geolocation = req.geo;
  const assets = await fetchAssetsByRegion(geolocation.country);

  return new Response(JSON.stringify(assets), {
    headers: {
      'Cache-Control': 'public, s-maxage=60',
    },
  });
}
```

## 8. 배운 교훈

### 기술적 교훈

1. **올바른 도구 선택**: 상황에 맞는 기술을 선택하는 것이 중요
2. **점진적 마이그레이션**: 급격한 변화보다는 단계적 전환
3. **타입 안정성**: TypeScript는 선택이 아닌 필수
4. **성능 모니터링**: 측정 없이는 개선도 없음

### 팀 관리 교훈

1. **코드 리뷰 문화**: 지식 공유와 품질 향상
2. **문서화**: 아키텍처 결정 기록 (ADR)
3. **점진적 개선**: 한 번에 모든 것을 바꾸려 하지 말 것
4. **팀 학습**: 새로운 기술에 대한 지속적 학습

## 결론

지난 10년간 프론트엔드 기술은 매우 빠르게 발전했습니다. jQuery에서 React로, MobX에서 React Query로, 그리고 앞으로도 계속 진화할 것입니다.

중요한 것은:

1. **기초**: 기본 개념을 깊이 있게 이해하기
2. **실용성**: 최신 트렌드보다는 실제 필요에 맞게
3. **지속성**: 기술 선택이 장기적으로 유지 가능한지 확인
4. **협력**: 혼자가 아닌 팀과 함께 성장

프론트엔드 여정은 계속됩니다. 다음 10년이 어떻게 펼쳐질지 기대됩니다.
