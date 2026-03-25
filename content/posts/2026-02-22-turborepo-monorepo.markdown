---
title: "Turborepo로 모노레포 구축하기"
date: "2026-02-22T10:15:00.000Z"
template: "post"
draft: false
slug: "/posts/turborepo-monorepo-guide"
category: "DEVOPS"
tags:
  - "Turborepo"
  - "Monorepo"
  - "pnpm"
description: "Turborepo를 사용한 모노레포 구축 경험. 워크스페이스 설정, 태스크 파이프라인, 캐싱 전략, 그리고 공유 패키지 관리까지 실무에서의 최적화 기법을 공유합니다."
---

사내 대규모 프로젝트들을 관리하기 위해 Turborepo 기반의 모노레포 구조로 전환한 경험을 공유하겠습니다. 여러 개의 독립적인 애플리케이션과 공유 라이브러리를 효율적으로 관리하는 것은 팀의 생산성과 코드 품질에 직접적인 영향을 미칩니다.

## 모노레포의 필요성

우리 프로젝트는 여러 개의 클라이언트 애플리케이션과 함께 공유되는 UI 컴포넌트, API 클라이언트, 유틸리티 함수들이 있었습니다. 이전에는 각 프로젝트가 독립적인 저장소였어서 코드 중복이 많았고, 공유 코드 업데이트 시 모든 프로젝트를 수동으로 업데이트해야 했습니다.

## Turborepo 초기 설정

Turborepo를 사용한 모노레포의 기본 구조는 다음과 같습니다.

```
monorepo/
├── apps/
│   ├── asset-library-front/
│   ├── viewer-app/
│   └── legacy-search-app/
├── packages/
│   ├── ui/
│   ├── api/
│   ├── utils/
│   └── types/
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

먼저 `pnpm-workspace.yaml`을 설정하여 모노레포의 워크스페이스를 정의합니다.

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

그리고 루트 `package.json`에서 기본 설정을 합니다.

```json
{
  "name": "@company/monorepo",
  "version": "1.0.0",
  "private": true,
  "packageManager": "pnpm@9.0.0",
  "scripts": {
    "build": "turbo build",
    "dev": "turbo dev",
    "lint": "turbo lint",
    "format": "turbo format",
    "test": "turbo test"
  },
  "devDependencies": {
    "turbo": "^2.0.0"
  }
}
```

## Turbo 태스크 파이프라인 정의

Turborepo의 가장 강력한 기능 중 하나는 태스크 간의 의존성을 정의하고 최적화하는 것입니다. `turbo.json`에서 이를 설정합니다.

```json
{
  "version": "1",
  "extends": ["//"],
  "globalDependencies": [
    "**/.env.local",
    "**/tsconfig.json"
  ],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", "build/**"],
      "cache": true
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "cache": true,
      "outputs": [".eslintcache"]
    },
    "test": {
      "cache": true,
      "outputs": ["coverage/**"]
    },
    "type-check": {
      "cache": true,
      "outputs": []
    }
  }
}
```

`dependsOn: ["^build"]`는 해당 패키지가 의존하는 다른 패키지들이 먼저 빌드되어야 함을 의미합니다.

## 공유 패키지 구조

공유 라이브러리들의 구조를 일관되게 유지하는 것이 중요합니다.

```typescript
// packages/ui/package.json
{
  "name": "@company/ui",
  "version": "1.0.0",
  "type": "module",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    },
    "./button": {
      "types": "./dist/button.d.ts",
      "import": "./dist/button.js"
    }
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsc && tsc-alias",
    "lint": "eslint src --ext .ts,.tsx",
    "test": "vitest"
  }
}
```

```typescript
// packages/ui/src/index.ts
export { Button } from './button';
export { Input } from './input';
export { Dialog } from './dialog';
export type { ButtonProps } from './button';
```

## 애플리케이션에서 공유 패키지 사용

앱에서 공유 패키지를 사용할 때는 npm 패키지를 사용하는 것처럼 import합니다.

```typescript
// apps/asset-library-front/package.json
{
  "name": "asset-library-front",
  "dependencies": {
    "@company/ui": "*",
    "@company/api": "*",
    "@company/types": "*",
    "@company/utils": "*"
  }
}
```

```typescript
// apps/asset-library-front/src/pages/products.tsx
import { Button, Input, Dialog } from '@company/ui';
import { useGetProducts } from '@company/api';
import { formatPrice } from '@company/utils';

export default function ProductsPage() {
  const { data: products } = useGetProducts();

  return (
    <Dialog>
      <Input placeholder="검색..." />
      <Button>검색</Button>
      {products?.map(product => (
        <div key={product.id}>
          <h3>{product.name}</h3>
          <p>{formatPrice(product.price)}</p>
        </div>
      ))}
    </Dialog>
  );
}
```

## 개발 시 Hot Reload 설정

모노레포에서 개발할 때는 공유 패키지 변경 시 자동으로 반영되도록 설정해야 합니다.

```typescript
// tsconfig.json (루트)
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@company/*": ["packages/*/src"]
    },
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "strict": true,
    "esModuleInterop": true,
    "moduleResolution": "node"
  }
}
```

각 패키지의 `tsconfig.json`에서 부모 설정을 extends합니다.

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist"
  },
  "include": ["src"]
}
```

## 캐싱 전략 최적화

Turborepo의 캐싱은 빌드 속도를 극적으로 향상시킵니다. 캐시 무효화를 명확히 정의하는 것이 중요합니다.

```json
{
  "globalDependencies": [
    "package-lock.json",
    ".npmrc",
    ".env.production",
    "Dockerfile"
  ],
  "pipeline": {
    "build": {
      "dependsOn": ["^build", "^type-check"],
      "outputs": ["dist/**"],
      "cache": true,
      "inputs": [
        "src/**",
        "tsconfig.json",
        "package.json"
      ]
    }
  }
}
```

inputs을 명시하면 변경되지 않은 파일이 있을 경우 캐시를 사용합니다.

## 릴리스 관리

Changeset을 사용하여 모노레포 패키지의 버전 관리와 릴리스를 자동화할 수 있습니다.

```bash
pnpm add -DW @changesets/cli
pnpm changeset init
```

```markdown
# .changeset/major-update-2026.md
---
"@company/ui": major
"@company/api": minor
---

UI 컴포넌트 API 변경 및 새로운 기능 추가
```

## 성능 측정

Turborepo의 내장 분석 도구로 빌드 성능을 추적할 수 있습니다.

```bash
turbo build --filter=asset-library-front --summarize
```

## 실무 팁

모노레포 운영에서 얻은 실무 팁들을 정리하면:

1. **명확한 경계 설정**: 각 패키지의 책임을 명확히 하여 순환 의존성을 방지합니다.
2. **의존성 버전 통일**: 루트 `pnpm-workspace.yaml`의 `overrides`로 중복 설치를 방지합니다.
3. **린트 규칙 공유**: 모든 패키지가 동일한 ESLint/Prettier 설정을 사용하도록 합니다.
4. **문서화**: 각 패키지의 README와 변경 사항을 명확히 기록합니다.

Turborepo를 통한 모노레포 구조는 초기 설정에 시간이 걸리지만, 장기적으로 팀의 생산성과 코드 품질을 크게 향상시킵니다. 특히 대규모 팀이 함께 작업할 때 그 효과가 극대화됩니다.
