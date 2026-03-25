---
title: "모노레포에서 ESLint 설정 공유하기"
date: "2026-03-13T10:30:00.000Z"
template: "post"
draft: false
slug: "/posts/eslint-monorepo"
category: "DEVOPS"
tags:
  - "ESLint"
  - "Monorepo"
  - "Code Quality"
description: "여러 프로젝트를 관리하는 모노레포 환경에서 ESLint 설정을 효과적으로 공유하고 관리하는 방법을 설명합니다."
---

## 서론

프론트엔드 팀에서는 여러 프로젝트를 하나의 저장소(모노레포)로 관리하고 있습니다. 이 환경에서 가장 큰 도전 중 하나는 모든 프로젝트에서 일관된 코드 품질을 유지하는 것입니다. 이 글에서는 우리가 `@company/eslint-config` 패키지를 통해 ESLint 설정을 어떻게 공유하고 관리하는지 공유하겠습니다.

## 문제 상황

모노레포 초기 단계에서는 각 프로젝트마다 별도의 ESLint 설정 파일(`.eslintrc`)을 관리했습니다. 이로 인해:

- 여러 개의 `.eslintrc` 파일을 동기화하기 어려움
- 규칙 변경 시 모든 프로젝트를 수동으로 업데이트해야 함
- 팀원들 간의 코드 스타일 불일치
- 설정 관리의 복잡도 증가

## 솔루션: 공유 ESLint 설정 패키지

### 1. 패키지 구조 설계

먼저 공유 설정을 위한 패키지를 생성했습니다:

```
packages/
  ├── eslint-config/
  │   ├── package.json
  │   ├── index.js
  │   ├── rules/
  │   │   ├── base.js
  │   │   ├── react.js
  │   │   └── typescript.js
  │   └── README.md
```

### 2. 기본 설정 작성

`packages/eslint-config/index.js`:

```javascript
module.exports = {
  extends: ['eslint:recommended'],
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module'
  },
  env: {
    browser: true,
    es2021: true,
    node: true
  },
  rules: {
    'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'prefer-const': 'error',
    'no-var': 'error'
  }
};
```

### 3. React 규칙 확장

`packages/eslint-config/rules/react.js`:

```javascript
module.exports = {
  extends: ['plugin:react/recommended', 'plugin:react-hooks/recommended'],
  parserOptions: {
    ecmaFeatures: {
      jsx: true
    }
  },
  settings: {
    react: {
      version: 'detect'
    }
  },
  rules: {
    'react/prop-types': 'off',
    'react/jsx-uses-react': 'off',
    'react/react-in-jsx-scope': 'off',
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn'
  }
};
```

### 4. TypeScript 규칙 확장

`packages/eslint-config/rules/typescript.js`:

```javascript
module.exports = {
  extends: [
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking'
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    sourceType: 'module'
  },
  rules: {
    '@typescript-eslint/explicit-function-return-types': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/naming-convention': [
      'error',
      {
        selector: 'variable',
        format: ['camelCase', 'UPPER_CASE'],
        leadingUnderscore: 'allow'
      }
    ]
  }
};
```

## 프로젝트에서 사용하기

각 프로젝트의 `.eslintrc.js`:

```javascript
module.exports = {
  extends: ['@company/eslint-config/rules/base'],

  // React 프로젝트인 경우
  extends: [
    '@company/eslint-config/rules/base',
    '@company/eslint-config/rules/react'
  ],

  // TypeScript 프로젝트인 경우
  extends: [
    '@company/eslint-config/rules/base',
    '@company/eslint-config/rules/typescript'
  ]
};
```

## 성능 최적화

대규모 모노레포에서 ESLint 검사 속도는 중요합니다. 다음과 같이 최적화했습니다:

### 1. 캐싱 설정

```bash
eslint --cache --cache-location .eslintcache src/
```

### 2. 병렬 처리

`package.json`:

```json
{
  "scripts": {
    "lint": "eslint --max-warnings 0 src/",
    "lint:parallel": "eslint --cache --format=json src/ | eslint-formatter-pretty"
  }
}
```

### 3. 선택적 규칙 적용

환경별로 다른 설정을 적용합니다:

```javascript
module.exports = {
  extends: ['@company/eslint-config'],
  rules: {
    // 개발 환경에서는 console 허용
    'no-console': process.env.NODE_ENV === 'development' ? 'off' : 'warn',
    // 프로덕션 빌드 전에는 검사
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'warn'
  }
};
```

## CI/CD 통합

GitHub Actions에서의 린트 검사:

```yaml
name: Lint Check
on: [pull_request]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm run lint
```

## 규칙 커스터마이제이션

프로젝트별 특수 규칙이 필요한 경우, 기본 설정을 확장합니다:

```javascript
module.exports = {
  extends: ['@company/eslint-config'],

  // 프로젝트 특화 규칙
  rules: {
    'prefer-const': 'off',  // 이 프로젝트에서는 let 사용 허용
    '@typescript-eslint/no-explicit-any': 'off'
  },

  // 특정 파일에만 규칙 적용
  overrides: [
    {
      files: ['*.test.ts'],
      rules: {
        'no-console': 'off'
      }
    }
  ]
};
```

## 패키지 배포 및 관리

### 1. npm 레지스트리에 발행

```bash
cd packages/eslint-config
npm version patch
npm publish
```

### 2. 모노레포 내 다른 패키지에서 사용

`package.json`:

```json
{
  "devDependencies": {
    "@company/eslint-config": "workspace:*"
  }
}
```

### 3. 버전 관리

공유 설정 변경 시 semver를 따릅니다:
- **patch**: 버그 수정
- **minor**: 새로운 선택적 규칙 추가
- **major**: 기존 규칙 변경 또는 제거

## 실제 효과

이 접근 방식을 적용한 결과:

1. **설정 관리 효율성**: 한 곳에서만 ESLint 설정 관리
2. **빠른 온보딩**: 새 프로젝트는 설정 2-3줄로 시작
3. **일관된 코드 스타일**: 모든 프로젝트에서 동일한 규칙 적용
4. **성능**: 캐싱으로 검사 시간 60% 단축
5. **유지보수성**: 규칙 변경 시 모든 프로젝트에 자동 반영

## 마치며

모노레포 환경에서 ESLint 설정을 패키지로 관리하면 코드 품질을 효과적으로 유지할 수 있습니다. 처음에는 설정이 복잡해 보이지만, 장기적으로는 개발 생산성과 코드 품질 모두를 크게 향상시킵니다.
