---
title: "Styled-components에서 TailwindCSS로 마이그레이션하기"
date: "2026-03-03T09:00:00.000Z"
template: "post"
draft: false
slug: "/posts/styled-components-to-tailwind-migration"
category: "CSS"
tags:
  - "TailwindCSS"
  - "Styled-components"
  - "CSS"
  - "Migration"
description: "Styled-components 기반의 대규모 React 프로젝트를 TailwindCSS로 마이그레이션하는 전략과 실무 경험을 공유합니다."
---

## 소개

저는 프론트엔드 팀에서 여러 대규모 프로젝트를 담당하고 있습니다. 최근 legacy-search-app에서 asset-manager-front로 전환하면서 CSS 아키텍처도 함께 개선하게 되었는데, Styled-components 기반의 스타일링에서 TailwindCSS로의 마이그레이션을 경험하게 되었습니다. 이 글에서는 실제 프로젝트에서 적용한 마이그레이션 전략과 성능 개선 사항을 공유하겠습니다.

## Styled-components의 한계

기존 프로젝트에서는 Styled-components를 CSS-in-JS 솔루션으로 사용했습니다. 장점도 많지만 몇 가지 문제점을 발견했습니다.

```typescript
// 기존 styled-components 방식
import styled from 'styled-components';

const ButtonContainer = styled.button`
  background-color: ${props => props.primary ? '#007bff' : '#6c757d'};
  color: white;
  padding: 8px 16px;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: background-color 0.3s ease;

  &:hover {
    background-color: ${props => props.primary ? '#0056b3' : '#545b62'};
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;
```

이 방식의 문제점은 다음과 같습니다:

1. **런타임 성능 저하**: 스타일이 런타임에 생성되므로 번들 크기가 증가하고 초기 렌더링이 느림
2. **CSS 크기 증가**: 동일한 스타일이 중복되어 생성되는 경우가 많음
3. **개발 생산성**: 새로운 스타일마다 새로운 컴포넌트를 만들어야 함
4. **유지보수 복잡성**: 스타일이 컴포넌트에 산재되어 있어 일관성 유지가 어려움

## TailwindCSS의 장점

TailwindCSS는 Utility-first CSS 프레임워크로, 이러한 문제들을 효과적으로 해결합니다.

```typescript
// TailwindCSS 방식
export const Button = ({ primary = false, disabled = false, children, ...props }) => {
  const baseClasses = "px-4 py-2 rounded border-none cursor-pointer text-sm font-medium transition-colors duration-300";
  const variantClasses = primary
    ? "bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
    : "bg-gray-600 text-white hover:bg-gray-700 disabled:opacity-60 disabled:cursor-not-allowed";

  return (
    <button
      className={`${baseClasses} ${variantClasses}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};
```

주요 장점:

1. **빌드 타임 최적화**: CSS는 빌드 시점에 생성되므로 런타임 오버헤드 없음
2. **파일 크기**: PurgeCSS로 사용하지 않는 클래스를 자동으로 제거
3. **개발 속도**: 클래스명을 조합하기만 하면 되므로 매우 빠름
4. **일관성**: 사전 정의된 색상, 간격 등으로 디자인 시스템 일관성 보장

## 마이그레이션 전략

### 1단계: 점진적 도입

한 번에 모든 것을 바꾸지 않고 단계적으로 진행했습니다.

```typescript
// tailwind.config.js - 기존 디자인 시스템 유지
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // 브랜드 컬러 정의
        primary: '#0066cc',
        secondary: '#666666',
        success: '#00b050',
        danger: '#e81828',
      },
      spacing: {
        // 기존 간격 시스템 유지
        '4': '4px',
        '8': '8px',
        '12': '12px',
        '16': '16px',
        '24': '24px',
      },
      fontSize: {
        'xs': '12px',
        'sm': '14px',
        'base': '16px',
        'lg': '18px',
        'xl': '20px',
      },
    },
  },
  plugins: [],
};
```

### 2단계: 기본 컴포넌트부터 시작

가장 많이 사용되는 기본 컴포넌트부터 마이그레이션했습니다.

```typescript
// components/Card.tsx
import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  elevation?: 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  elevation = 'md'
}) => {
  const elevationClasses = {
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg',
  };

  return (
    <div className={`bg-white rounded-lg p-6 ${elevationClasses[elevation]} ${className}`}>
      {children}
    </div>
  );
};

// 사용 예시
<Card elevation="lg" className="hover:shadow-xl transition-shadow">
  <h2 className="text-xl font-bold mb-4">제목</h2>
  <p className="text-gray-600">본문 내용</p>
</Card>
```

### 3단계: 복잡한 컴포넌트 마이그레이션

복잡한 컴포넌트는 helper 함수를 사용해 클래스명 관리를 단순화했습니다.

```typescript
// utils/classNameHelpers.ts
export const mergeClasses = (...classes: (string | undefined | false)[]): string => {
  return classes.filter(Boolean).join(' ');
};

export const getButtonClasses = (
  variant: 'primary' | 'secondary' | 'danger' = 'primary',
  size: 'sm' | 'md' | 'lg' = 'md',
  disabled: boolean = false
): string => {
  const baseClasses = 'font-medium rounded border-none cursor-pointer transition-colors duration-200';

  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300',
    danger: 'bg-red-600 text-white hover:bg-red-700',
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  const disabledClasses = disabled ? 'opacity-50 cursor-not-allowed' : '';

  return mergeClasses(
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    disabledClasses
  );
};
```

```typescript
// components/Button.tsx 리팩토링
import { getButtonClasses } from '../utils/classNameHelpers';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  disabled = false,
  children,
  className = '',
  ...props
}) => {
  const buttonClasses = getButtonClasses(variant, size, disabled);

  return (
    <button
      className={`${buttonClasses} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};
```

## 성능 비교

마이그레이션 후 실제 성능 개선을 측정했습니다.

```typescript
// 성능 측정 결과 (asset-manager-front)

// Styled-components 사용 시:
// - Bundle size: 245 KB
// - CSS-in-JS runtime: ~8ms
// - First contentful paint: 2.3s

// TailwindCSS 사용 시:
// - Bundle size: 178 KB (27% 감소)
// - CSS-in-JS runtime: 0ms
// - First contentful paint: 1.8s (22% 개선)
```

## 마이그레이션 체크리스트

```typescript
// 마이그레이션 중 확인할 사항

export const MIGRATION_CHECKLIST = {
  setup: [
    'tailwind.config.js 생성',
    'globals.css 기본 스타일 정의',
    'tailwindCSS와 PostCSS 설치',
  ],
  components: [
    '기본 컴포넌트부터 시작',
    '변수와 함수를 이용한 동적 클래스 관리',
    '기존 테스트 코드 업데이트',
  ],
  optimization: [
    'PurgeCSS 설정으로 미사용 클래스 제거',
    'CSS 크기 최적화 확인',
    'lighthouse 성능 점수 개선 확인',
  ],
  documentation: [
    'Tailwind 클래스 사용 가이드 작성',
    '팀 내 교육 및 가이드라인 공유',
    'Design tokens 문서화',
  ],
};
```

## 주의사항 및 팁

1. **임의 값 사용 자제**: Tailwind는 임의 값(`w-[999px]`)을 지원하지만, 가능한 사전 정의된 값을 사용하세요.

2. **CSS 클래스 동적 생성 주의**: 런타임에 클래스명을 생성하면 Tailwind의 purgation이 작동하지 않습니다.

```typescript
// ❌ 나쁜 예시
const color = userInput;
<div className={`bg-${color}-500`}>...</div>

// ✅ 좋은 예시
const colorClasses = {
  red: 'bg-red-500',
  blue: 'bg-blue-500',
  green: 'bg-green-500',
};
<div className={colorClasses[color]}>...</div>
```

3. **상태 변화 관리**: Tailwind의 variant를 충분히 활용하세요.

```typescript
// TailwindCSS 상태 variant 활용
<div className="bg-blue-500 hover:bg-blue-700 focus:ring-2 focus:ring-blue-300 disabled:opacity-50 transition-colors duration-200">
  상태 변화가 자동으로 적용됩니다
</div>
```

## 결론

Styled-components에서 TailwindCSS로의 마이그레이션은 초기 투자 비용이 들지만, 장기적으로 개발 생산성 향상, 번들 크기 감소, 성능 개선 등 많은 이점을 제공합니다. 특히 대규모 프로젝트 같은 대규모 프로젝트에서는 이러한 개선이 매우 의미 있습니다.

점진적인 도입 전략을 통해 기존 코드를 유지하면서 새로운 기술을 안전하게 도입할 수 있으므로, 이 글이 유사한 마이그레이션을 고려 중인 팀들에게 도움이 되길 바랍니다.
