---
title: "Storybook으로 컴포넌트 문서화하기"
date: "2026-03-10T09:00:00.000Z"
template: "post"
draft: false
slug: "/posts/storybook-component-documentation"
category: "REACT"
tags:
  - "Storybook"
  - "Component Documentation"
  - "UI Testing"
  - "Design System"
description: "Storybook을 이용한 React 컴포넌트의 효과적인 문서화, 테스트, 그리고 디자인 시스템 구축 방법을 소개합니다."
---

## 소개

사내 Storybook 앱은 디자인 시스템의 중심입니다. Storybook은 React 컴포넌트를 격리된 환경에서 개발하고 문서화할 수 있는 강력한 도구입니다. 컴포넌트 개발의 효율성을 높이고, 팀 간 커뮤니케이션을 개선하며, 자동 테스트도 함께 수행할 수 있습니다. 이 글에서는 실제 프로젝트에서 구축한 Storybook 환경을 소개하겠습니다.

## Storybook 설치 및 초기화

```bash
# Storybook 설치
npx storybook@latest init

# 또는 기존 프로젝트에 추가
npm install --save-dev @storybook/react @storybook/addon-links @storybook/addon-essentials

# pnpm 사용
pnpm add -D @storybook/react @storybook/addon-essentials
```

## Storybook 설정

```typescript
// .storybook/main.ts

import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  framework: '@storybook/react-vite',
  stories: [
    '../packages/ui/src/**/*.stories.@(js|jsx|mjs|ts|tsx)',
    '../packages/components/src/**/*.stories.@(js|jsx|mjs|ts|tsx)',
  ],
  addons: [
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
    '@storybook/addon-a11y',
    '@storybook/addon-controls',
    '@storybook/addon-viewport',
  ],
  docs: {
    autodocs: 'tag',
  },
  typescript: {
    reactDocgenTypescriptOptions: {
      shouldExtractLiteralValuesAsTypes: true,
    },
  },
};

export default config;
```

```typescript
// .storybook/preview.ts

import type { Preview } from '@storybook/react';
import '../styles/globals.css';

const preview: Preview = {
  parameters: {
    // 기본 매개변수
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    // 뷰포트 설정
    viewport: {
      viewports: {
        mobile: {
          name: 'Mobile',
          styles: { width: '375px', height: '667px' },
        },
        tablet: {
          name: 'Tablet',
          styles: { width: '768px', height: '1024px' },
        },
        desktop: {
          name: 'Desktop',
          styles: { width: '1920px', height: '1080px' },
        },
      },
    },
  },
  decorators: [
    (Story) => (
      <div style={{ padding: '20px' }}>
        <Story />
      </div>
    ),
  ],
};

export default preview;
```

## 기본 Story 작성

```typescript
// packages/ui/src/Button/Button.stories.tsx

import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';

// Meta 정보 (컴포넌트 메타데이터)
const meta = {
  title: 'Components/Button',
  component: Button,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: '클릭 가능한 버튼 컴포넌트입니다.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'danger'],
      description: '버튼 스타일',
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: '버튼 크기',
    },
    disabled: {
      control: 'boolean',
      description: '비활성화 여부',
    },
    onClick: {
      action: 'clicked',
      description: '클릭 이벤트 핸들러',
    },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

// 기본 버튼
export const Primary: Story = {
  args: {
    variant: 'primary',
    children: 'Primary Button',
  },
};

// Secondary 버튼
export const Secondary: Story = {
  args: {
    variant: 'secondary',
    children: 'Secondary Button',
  },
};

// Danger 버튼
export const Danger: Story = {
  args: {
    variant: 'danger',
    children: 'Delete',
  },
};

// 다양한 크기
export const Small: Story = {
  args: {
    size: 'sm',
    children: 'Small Button',
  },
};

export const Large: Story = {
  args: {
    size: 'lg',
    children: 'Large Button',
  },
};

// 비활성화 상태
export const Disabled: Story = {
  args: {
    disabled: true,
    children: 'Disabled Button',
  },
};

// 로딩 상태
export const Loading: Story = {
  args: {
    children: 'Loading...',
    disabled: true,
  },
  render: (args) => (
    <Button {...args}>
      <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span className="animate-spin">⏳</span>
        Loading...
      </span>
    </Button>
  ),
};
```

## 고급 Story 작성

### 상호작용 (Interactions)

```typescript
// packages/ui/src/Modal/Modal.stories.tsx

import type { Meta, StoryObj } from '@storybook/react';
import { userEvent, within, expect } from '@storybook/test';
import { Modal } from './Modal';

const meta = {
  title: 'Components/Modal',
  component: Modal,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Modal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: '확인',
    description: '정말 삭제하시겠습니까?',
    isOpen: true,
    onConfirm: () => {},
    onCancel: () => {},
  },
};

// 상호작용 테스트
export const WithInteraction: Story = {
  args: {
    ...Default.args,
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    // 확인 버튼 클릭
    const confirmButton = canvas.getByRole('button', { name: /확인/i });
    expect(confirmButton).toBeInTheDocument();

    await userEvent.click(confirmButton);
    expect(args.onConfirm).toHaveBeenCalled();
  },
};
```

### Controls (동적 변경)

```typescript
// packages/ui/src/Card/Card.stories.tsx

import type { Meta, StoryObj } from '@storybook/react';
import { Card } from './Card';

const meta = {
  title: 'Components/Card',
  component: Card,
  argTypes: {
    elevation: {
      control: {
        type: 'select',
        options: ['sm', 'md', 'lg'],
      },
    },
    children: {
      control: 'text',
    },
  },
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

// Controls로 동적 변경 가능
export const Default: Story = {
  args: {
    elevation: 'md',
    children: '카드 컨텐츠',
  },
};

// 커스텀 Controls
export const WithCustomControls: Story = {
  args: {
    elevation: 'lg',
    children: '고급 카드',
  },
  argTypes: {
    elevation: {
      control: {
        type: 'radio',
        options: ['sm', 'md', 'lg'],
      },
    },
  },
};
```

## 컴포넌트 조합 문서화

```typescript
// packages/ui/src/Form/Form.stories.tsx

import type { Meta, StoryObj } from '@storybook/react';
import { Form } from './Form';
import { Input } from '../Input';
import { Button } from '../Button';

const meta = {
  title: 'Components/Form',
  component: Form,
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof Form>;

export default meta;
type Story = StoryObj<typeof meta>;

export const LoginForm: Story = {
  render: () => (
    <Form>
      <div style={{ maxWidth: '400px', margin: '0 auto' }}>
        <Input
          label="이메일"
          type="email"
          placeholder="your@email.com"
        />
        <Input
          label="비밀번호"
          type="password"
          placeholder="••••••••"
        />
        <Button variant="primary" style={{ width: '100%' }}>
          로그인
        </Button>
      </div>
    </Form>
  ),
};

export const SignupForm: Story = {
  render: () => (
    <Form>
      <div style={{ maxWidth: '400px', margin: '0 auto' }}>
        <Input label="이름" placeholder="홍길동" />
        <Input label="이메일" type="email" placeholder="your@email.com" />
        <Input label="비밀번호" type="password" placeholder="••••••••" />
        <Input label="비밀번호 확인" type="password" placeholder="••••••••" />
        <Button variant="primary" style={{ width: '100%' }}>
          가입하기
        </Button>
      </div>
    </Form>
  ),
};
```

## 접근성 (A11y) 테스팅

```typescript
// packages/ui/src/Button/Button.stories.tsx (A11y 추가)

import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';

const meta = {
  title: 'Components/Button',
  component: Button,
  parameters: {
    a11y: {
      config: {
        rules: [
          {
            id: 'color-contrast',
            enabled: true,
          },
        ],
      },
    },
  },
} satisfies Meta<typeof Button>;

export default meta;

export const AccessibleButton: Story = {
  args: {
    children: 'Click me',
    'aria-label': '클릭 가능한 버튼',
  },
};

// 접근성 문제 있는 버튼
export const InaccessibleButton: Story = {
  args: {
    children: 'Click me',
    style: {
      backgroundColor: '#f0f0f0',
      color: '#f1f1f1', // 대비도 부족
    },
  },
};
```

## 디자인 토큰 문서화

```typescript
// .storybook/stories/DesignTokens.stories.tsx

import type { Meta } from '@storybook/react';

const meta = {
  title: 'Design System/Design Tokens',
  parameters: {
    layout: 'centered',
  },
} satisfies Meta;

export default meta;

export const Colors = () => {
  const colors = {
    primary: '#0066cc',
    secondary: '#666666',
    success: '#00b050',
    danger: '#e81828',
    warning: '#ffb81c',
    background: '#ffffff',
    border: '#cccccc',
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
      {Object.entries(colors).map(([name, value]) => (
        <div key={name}>
          <div
            style={{
              width: '100%',
              height: '80px',
              backgroundColor: value,
              border: '1px solid #ccc',
              borderRadius: '4px',
            }}
          />
          <p style={{ marginTop: '8px', fontSize: '14px', fontWeight: 'bold' }}>
            {name}
          </p>
          <code style={{ fontSize: '12px', color: '#666' }}>{value}</code>
        </div>
      ))}
    </div>
  );
};

export const Typography = () => {
  const typography = {
    'Heading 1': { fontSize: '32px', fontWeight: 700 },
    'Heading 2': { fontSize: '24px', fontWeight: 700 },
    'Heading 3': { fontSize: '20px', fontWeight: 600 },
    'Body': { fontSize: '16px', fontWeight: 400 },
    'Small': { fontSize: '14px', fontWeight: 400 },
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {Object.entries(typography).map(([name, style]) => (
        <div key={name}>
          <p style={style}>{name}</p>
          <code style={{ fontSize: '12px', color: '#666' }}>
            {JSON.stringify(style, null, 2)}
          </code>
        </div>
      ))}
    </div>
  );
};

export const Spacing = () => {
  const spacings = {
    'xs': '4px',
    'sm': '8px',
    'md': '16px',
    'lg': '24px',
    'xl': '32px',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {Object.entries(spacings).map(([name, value]) => (
        <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: value,
              height: value,
              backgroundColor: '#0066cc',
              borderRadius: '2px',
            }}
          />
          <span>{name}: {value}</span>
        </div>
      ))}
    </div>
  );
};
```

## Storybook 배포

```bash
# 정적 빌드
npm run build-storybook

# GitHub Pages에 배포
npm run build-storybook
netlify deploy --prod --dir=storybook-static

# Docker로 배포
docker build -t design-system-storybook .
docker run -p 6006:6006 design-system-storybook
```

```dockerfile
# Dockerfile

FROM node:18-alpine AS builder

WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install

COPY . .
RUN pnpm run build-storybook

FROM node:18-alpine
RUN npm install -g http-server
COPY --from=builder /app/storybook-static /app
WORKDIR /app

EXPOSE 6006
CMD ["http-server", "-p", "6006", "-a", "0.0.0.0"]
```

## 자동 문서화

```typescript
// 컴포넌트에 JSDoc 추가

interface ButtonProps {
  /**
   * 버튼의 시각적 스타일
   * @default "primary"
   */
  variant?: 'primary' | 'secondary' | 'danger';

  /**
   * 버튼의 크기
   * @default "md"
   */
  size?: 'sm' | 'md' | 'lg';

  /**
   * 클릭 이벤트 핸들러
   */
  onClick?: () => void;

  /**
   * 버튼 텍스트
   */
  children: React.ReactNode;

  /**
   * 비활성화 상태
   * @default false
   */
  disabled?: boolean;
}

/**
 * 클릭 가능한 기본 버튼 컴포넌트입니다.
 * 다양한 크기와 스타일을 지원합니다.
 *
 * @example
 * ```tsx
 * <Button variant="primary" size="md">
 *   Click me
 * </Button>
 * ```
 */
export const Button: React.FC<ButtonProps> = ({ ... }) => {
  // ...
};
```

## 모범 사례

```typescript
// ✅ 좋은 Story 작성

export const Variants: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '8px' }}>
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="danger">Danger</Button>
    </div>
  ),
};

// 각 상태를 명확하게 보여주기
export const States = {
  render: () => (
    <div style={{ display: 'flex', gap: '16px' }}>
      <div>
        <p>Default</p>
        <Button>Default</Button>
      </div>
      <div>
        <p>Hover</p>
        <Button className="hover">Hover</Button>
      </div>
      <div>
        <p>Active</p>
        <Button className="active">Active</Button>
      </div>
      <div>
        <p>Disabled</p>
        <Button disabled>Disabled</Button>
      </div>
    </div>
  ),
};
```

## 결론

Storybook은 React 컴포넌트 개발과 문서화의 표준 도구입니다. 컴포넌트의 모든 상태와 변형을 시각적으로 확인하고, 자동으로 문서화하며, 접근성을 검증할 수 있습니다. design-system-storybook 같은 디자인 시스템 구축에 필수적이며, 팀 간 커뮤니케이션을 크게 향상시킵니다.
