---
title: "pnpm Workspace로 효율적인 패키지 관리"
date: "2026-03-09T09:00:00.000Z"
template: "post"
draft: false
slug: "/posts/pnpm-workspace-monorepo-guide"
category: "DEVOPS"
tags:
  - "pnpm"
  - "Workspace"
  - "Monorepo"
  - "Package Management"
description: "pnpm Workspace를 이용한 모노레포 구조 구축 및 효율적인 패키지 관리 방법을 설명합니다."
---

## 소개

사내 프로젝트는 pnpm workspace를 기반으로 한 모노레포 프로젝트입니다. 여러 패키지를 효율적으로 관리하고 공유할 수 있는 워크스페이스 구조를 갖추고 있습니다. pnpm은 npm과 yarn의 단점을 보완한 고성능 패키지 관리자로, 특히 모노레포 환경에서 탁월합니다. 이 글에서는 pnpm workspace를 설정하고 활용하는 방법을 상세히 소개하겠습니다.

## pnpm이란?

pnpm은 "performant npm"의 약자로, 다음과 같은 특징이 있습니다:

- **디스크 공간 절약**: 심볼릭 링크를 사용해 중복 저장 방지
- **빠른 설치**: 병렬 처리로 빠른 의존성 설치
- **엄격한 의존성**: 명시적으로 선언한 의존성만 접근 가능
- **Workspace 지원**: 모노레포 환경에 최적화

## pnpm 설치

```bash
# pnpm 설치 (npm을 통해)
npm install -g pnpm

# 또는 Homebrew (macOS)
brew install pnpm

# 버전 확인
pnpm --version
```

## Workspace 구조 설계

### 프로젝트 레이아웃

```
asset-manager-front/
├── pnpm-workspace.yaml          # Workspace 설정
├── package.json                 # Root package.json
├── tsconfig.json               # TypeScript 공통 설정
├── .npmrc                       # npm 설정
├── packages/
│   ├── core/                   # 핵심 라이브러리
│   │   ├── package.json
│   │   └── src/
│   ├── ui/                     # UI 컴포넌트 라이브러리
│   │   ├── package.json
│   │   └── src/
│   ├── utils/                  # 유틸리티 함수
│   │   ├── package.json
│   │   └── src/
│   ├── hooks/                  # React 커스텀 훅
│   │   ├── package.json
│   │   └── src/
│   └── app/                    # 메인 애플리케이션
│       ├── package.json
│       └── src/
└── tools/
    ├── scripts/                # 공통 스크립트
    └── eslint-config/          # ESLint 설정
```

## pnpm-workspace.yaml 설정

```yaml
# pnpm-workspace.yaml

packages:
  # 패키지 디렉토리 지정
  - 'packages/**'
  - 'tools/**'

# 특정 디렉토리 제외 (선택사항)
exclude:
  - '**/node_modules/**'
  - '**/dist/**'
  - '**/build/**'
```

## Root Package.json 설정

```json
{
  "name": "asset-manager-front-monorepo",
  "version": "1.0.0",
  "private": true,
  "description": "사내 Asset Manager Frontend - Monorepo",
  "scripts": {
    "install": "pnpm install",
    "dev": "pnpm -r --parallel run dev",
    "build": "pnpm -r --filter=./packages run build",
    "test": "pnpm -r --parallel run test",
    "lint": "pnpm -r --parallel run lint",
    "format": "prettier --write \"packages/**/*.{ts,tsx,json,md}\"",
    "type-check": "pnpm -r --parallel run type-check",
    "clean": "pnpm -r exec rm -rf dist node_modules .turbo",
    "changeset": "changeset",
    "publish": "pnpm publish-packages"
  },
  "devDependencies": {
    "@changesets/cli": "^2.26.0",
    "prettier": "^3.0.0",
    "turbo": "^1.10.0"
  },
  "engines": {
    "node": ">=18.0.0",
    "pnpm": ">=8.0.0"
  },
  "packageManager": "pnpm@8.6.0"
}
```

## 개별 패키지 설정

### Core 라이브러리

```json
{
  "name": "@company/core",
  "version": "1.0.0",
  "description": "Core utilities and types",
  "private": false,
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.js",
      "types": "./dist/index.d.ts"
    },
    "./types": {
      "types": "./dist/types.d.ts"
    }
  },
  "files": ["dist"],
  "scripts": {
    "dev": "tsc --watch",
    "build": "tsc && tsc --declaration --emitDeclarationOnly",
    "test": "vitest",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {},
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0",
    "vitest": "^1.0.0"
  }
}
```

### UI 컴포넌트 라이브러리

```json
{
  "name": "@company/ui",
  "version": "1.0.0",
  "description": "Reusable UI components",
  "private": false,
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "files": ["dist"],
  "scripts": {
    "dev": "vite --config vite.config.ts",
    "build": "vite build --config vite.config.ts",
    "preview": "vite preview"
  },
  "dependencies": {
    "@company/core": "workspace:*",
    "react": "^18.0.0",
    "react-dom": "^18.0.0"
  },
  "devDependencies": {
    "@types/react": "^18.0.0",
    "@types/react-dom": "^18.0.0",
    "@vitejs/plugin-react": "^4.0.0",
    "typescript": "^5.0.0",
    "vite": "^5.0.0"
  },
  "peerDependencies": {
    "react": "^18.0.0",
    "react-dom": "^18.0.0"
  }
}
```

### 메인 앱

```json
{
  "name": "asset-manager-front",
  "version": "1.0.0",
  "description": "사내 Asset Manager Frontend",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint . --ext .ts,.tsx",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "@company/core": "workspace:*",
    "@company/ui": "workspace:*",
    "@company/hooks": "workspace:*",
    "@company/utils": "workspace:*",
    "next": "^14.0.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^18.0.0",
    "typescript": "^5.0.0"
  }
}
```

## Workspace Protocol 사용

```typescript
// packages/ui/src/Button.tsx - @company/core 패키지 사용

import { cn } from '@company/core/utils';
import type { ComponentProps } from 'react';

interface ButtonProps extends ComponentProps<'button'> {
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  className,
  ...props
}) => {
  return (
    <button
      className={cn(
        'font-medium rounded transition-colors',
        {
          'bg-blue-600 text-white hover:bg-blue-700': variant === 'primary',
          'bg-gray-200 text-gray-900 hover:bg-gray-300': variant === 'secondary',
        },
        {
          'px-2 py-1 text-sm': size === 'sm',
          'px-4 py-2': size === 'md',
          'px-6 py-3 text-lg': size === 'lg',
        },
        className
      )}
      {...props}
    />
  );
};
```

workspace protocol (`workspace:*`)을 사용하면 로컬 패키지를 마치 npm 패키지처럼 참조할 수 있습니다.

## 효율적인 의존성 관리

### 공통 의존성 설정

```json
{
  "name": "root",
  "private": true,
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^18.0.0",
    "@types/react-dom": "^18.0.0",
    "typescript": "^5.0.0",
    "eslint": "^8.0.0",
    "prettier": "^3.0.0"
  }
}
```

이렇게 설정하면 모든 워크스페이스 패키지가 동일한 버전의 공통 의존성을 공유합니다.

```bash
# 공통 의존성 설치
pnpm install -w -D typescript

# 특정 워크스페이스에만 설치
pnpm add -w --filter=@company/ui react-markdown
```

## pnpm 명령어

```bash
# 모든 패키지 설치
pnpm install

# 특정 워크스페이스에만 명령 실행
pnpm --filter=@company/ui run build

# 여러 워크스페이스에 명령 실행
pnpm -r run build

# 병렬로 모든 명령 실행
pnpm -r --parallel run dev

# 특정 패키지와 그 의존성만 빌드
pnpm --filter=asset-manager-front... run build

# 의존성 제거
pnpm remove -r lodash

# 의존성 업데이트
pnpm update -r --latest
```

## Turbo와 함께 사용

```typescript
// turbo.json - 빌드 최적화

{
  "extends": ["//"],
  "globalDependencies": ["**/.env"],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**"],
      "cache": true
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "outputs": ["reports/**"]
    },
    "test": {
      "outputs": ["coverage/**"]
    },
    "type-check": {
      "cache": false
    }
  }
}
```

## 패키지 간 의존성 확인

```typescript
// scripts/dependency-check.ts

import fs from 'fs';
import path from 'path';

interface PackageJson {
  name: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

const packagesPath = path.join(__dirname, '../packages');
const packages: Record<string, PackageJson> = {};

// 모든 패키지 로드
fs.readdirSync(packagesPath).forEach((dir) => {
  const pkgJsonPath = path.join(packagesPath, dir, 'package.json');
  if (fs.existsSync(pkgJsonPath)) {
    const content = fs.readFileSync(pkgJsonPath, 'utf-8');
    packages[dir] = JSON.parse(content);
  }
});

// 순환 의존성 확인
const checkCircularDeps = (pkg: string, visited = new Set<string>()): boolean => {
  if (visited.has(pkg)) return true;
  visited.add(pkg);

  const deps = packages[pkg].dependencies || {};
  for (const dep of Object.keys(deps)) {
    const depName = dep.replace('@company/', '');
    if (checkCircularDeps(depName, new Set(visited))) {
      console.warn(`❌ 순환 의존성 발견: ${pkg} -> ${depName}`);
      return true;
    }
  }

  return false;
};

Object.keys(packages).forEach((pkg) => {
  checkCircularDeps(pkg);
});

console.log('✓ 의존성 검사 완료');
```

## 모노레포 모범 사례

### 1. 명확한 패키지 경계

```typescript
// packages/core/index.ts - 공개 API만 export

export { cn, getAssetUrl } from './utils';
export type { Asset, AssetMetadata } from './types';

// ❌ 나쁜 예: 내부 구현 export
// export { internalHelper } from './internal/helper';
```

### 2. 패키지 간 의존성 제한

```
✅ 허용되는 의존성 구조:
app → hooks, ui, utils, core
hooks → utils, core
ui → core
utils → core
core → (외부 의존성만)

❌ 피해야 할 구조:
core → ui (하위 레벨이 상위 레벨에 의존)
utils → hooks (상위 레벨 의존)
```

### 3. 버전 관리

```bash
# changesets를 사용한 버전 관리
pnpm changeset
pnpm changeset version
pnpm changeset publish
```

## 성능 최적화

### .npmrc 설정

```ini
# .npmrc

# pnpm 설정
strict-peer-dependencies=false
shamefully-hoist=false
prefer-workspace-packages=true

# npm 레지스트리
registry=https://registry.npmjs.org/

# 내부 레지스트리 (선택사항)
@internal:registry=https://npm.internal.company.com/
```

### node_modules 최적화

```bash
# 링크 분석
pnpm list --depth=0

# 중복 의존성 확인
pnpm audit

# Symlink 상태 확인
pnpm store status
```

## 마이그레이션 팁

### 기존 npm 프로젝트에서 전환

```bash
# 1. pnpm 설치
npm install -g pnpm

# 2. pnpm-workspace.yaml 생성
# (위의 구조 참고)

# 3. node_modules 제거 (중요!)
rm -rf node_modules package-lock.json

# 4. pnpm 설치
pnpm install

# 5. 의존성 검증
pnpm audit
```

## 결론

pnpm workspace는 모노레포 구조에서 효율적인 패키지 관리를 제공합니다. 디스크 공간 절약, 빠른 설치, 명확한 의존성 관리로 개발 생산성을 크게 향상시킵니다. 대규모 프로젝트 같은 대규모 모노레포 프로젝트에서 필수적인 도구입니다.
