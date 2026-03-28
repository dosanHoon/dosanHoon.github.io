---
title: "NextAuth.js 인증 시스템 구현 가이드"
date: "2026-02-26T11:30:00.000Z"
template: "post"
draft: false
slug: "/posts/nextauth-authentication"
category: "NEXT.JS"
tags:
  - "NextAuth"
  - "Authentication"
  - "OAuth"
description: "NextAuth.js를 이용한 보안 인증 시스템 구축. OAuth 제공자 설정, JWT 세션 관리, 미들웨어 보호까지 실무에서의 완벽한 구현 가이드입니다."
---

사내 여러 프로젝트에서 NextAuth.js를 활용하여 안전하고 확장 가능한 인증 시스템을 구축한 경험을 공유하겠습니다. NextAuth.js는 Next.js 애플리케이션에서 인증을 구현하는 가장 강력한 솔루션입니다.

## NextAuth.js 설정

먼저 필요한 패키지를 설치합니다.

```bash
npm install next-auth
npm install --save-dev @types/next-auth
```

기본 인증 구성을 설정합니다.

```typescript
// auth.ts (또는 app/api/auth/[...nextauth]/route.ts)
import NextAuth, { type NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import GithubProvider from 'next-auth/providers/github';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { prisma } from '@/lib/prisma';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    GithubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
    }),
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user) {
          return null;
        }

        const isPasswordValid = await verifyPassword(
          credentials.password,
          user.password!
        );

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role || 'user';
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as any).role = token.role;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      // 로그인 후 리다이렉트
      if (url.startsWith('/')) return `${baseUrl}${url}`;
      else if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30일
    updateAge: 24 * 60 * 60, // 1일마다 갱신
  },
  jwt: {
    secret: process.env.NEXTAUTH_SECRET!,
    maxAge: 30 * 24 * 60 * 60,
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  events: {
    async signIn({ user }) {
      console.log(`User signed in: ${user.email}`);
    },
    async signOut() {
      console.log('User signed out');
    },
  },
};

export const handler = NextAuth(authOptions);
```

## API 라우트 설정

NextAuth의 API 라우트를 설정합니다.

```typescript
// app/api/auth/[...nextauth]/route.ts
import { handler } from '@/auth';

export const GET = handler;
export const POST = handler;
```

## 환경 변수 설정

```bash
# .env.local
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# GitHub OAuth
GITHUB_ID=your-github-id
GITHUB_SECRET=your-github-secret
```

## 클라이언트에서 세션 사용

```typescript
// components/auth-context.tsx
'use client';

import { SessionProvider } from 'next-auth/react';
import { ReactNode } from 'react';

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      {children}
    </SessionProvider>
  );
}
```

```typescript
// app/layout.tsx
import { AuthProvider } from '@/components/auth-context';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html>
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
```

## 로그인/로그아웃 컴포넌트

```typescript
// components/auth-button.tsx
'use client';

import { signIn, signOut, useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

export function AuthButton() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return <Button disabled>로딩 중...</Button>;
  }

  if (!session?.user) {
    return (
      <Button onClick={() => signIn('google')}>
        Google로 로그인
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative w-10 h-10 rounded-full">
          <Avatar>
            <AvatarImage
              src={session.user.image || ''}
              alt={session.user.name || ''}
            />
            <AvatarFallback>
              {session.user.name?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem disabled>
          <span className="text-sm text-muted-foreground">
            {session.user.email}
          </span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => signOut()}>
          로그아웃
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

## 미들웨어를 통한 라우트 보호

```typescript
// middleware.ts
import { withAuth } from 'next-auth/middleware';
import { NextRequest } from 'next/server';

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*', '/api/protected/:path*'],
};

export default withAuth(
  function middleware(req: NextRequest & { nextauth: any }) {
    const token = req.nextauth.token;

    // 역할 기반 접근 제어
    if (req.nextUrl.pathname.startsWith('/admin')) {
      if (token?.role !== 'admin') {
        return new Response('Unauthorized', { status: 401 });
      }
    }

    return null;
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);
```

## 보호된 API 라우트

```typescript
// app/api/protected/user/profile/route.ts
import { authOptions } from '@/auth';
import { getServerSession } from 'next-auth/next';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const userProfile = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
      },
    });

    return Response.json(userProfile);
  } catch (error) {
    return Response.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();

  try {
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name: body.name,
        image: body.image,
      },
    });

    return Response.json(updatedUser);
  } catch (error) {
    return Response.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}
```

## 서버 컴포넌트에서 세션 사용

```typescript
// app/dashboard/page.tsx
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/auth';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/auth/signin');
  }

  return (
    <div>
      <h1>대시보드</h1>
      <p>환영합니다, {session.user.name}!</p>
    </div>
  );
}
```

## 커스텀 로그인 페이지

```typescript
// app/auth/signin/page.tsx
'use client';

import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState } from 'react';

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const result = await signIn('credentials', {
      email,
      password,
      redirect: true,
      callbackUrl: '/dashboard',
    });

    if (result?.error) {
      setError('이메일 또는 비밀번호가 잘못되었습니다.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6">로그인</h1>

        {error && (
          <div className="bg-destructive/10 text-destructive p-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="email"
            placeholder="이메일"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            type="password"
            placeholder="비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <Button type="submit" className="w-full">
            로그인
          </Button>
        </form>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              또는
            </span>
          </div>
        </div>

        <Button
          onClick={() => signIn('google')}
          variant="outline"
          className="w-full mb-2"
        >
          Google로 계속
        </Button>
        <Button
          onClick={() => signIn('github')}
          variant="outline"
          className="w-full"
        >
          GitHub로 계속
        </Button>
      </div>
    </div>
  );
}
```

## 역할 기반 접근 제어 (RBAC)

```typescript
// lib/auth-utils.ts
import { Session } from 'next-auth';

export function hasRole(session: Session | null, role: string): boolean {
  return (session?.user as any)?.role === role;
}

export function hasPermission(session: Session | null, permission: string): boolean {
  const userRole = (session?.user as any)?.role;
  const permissions: Record<string, string[]> = {
    admin: ['read', 'write', 'delete', 'manage_users'],
    editor: ['read', 'write'],
    viewer: ['read'],
  };
  return permissions[userRole]?.includes(permission) ?? false;
}
```

```typescript
// components/protected-component.tsx
'use client';

import { useSession } from 'next-auth/react';
import { hasRole } from '@/lib/auth-utils';

export function AdminPanel() {
  const { data: session } = useSession();

  if (!hasRole(session, 'admin')) {
    return <div>접근 권한이 없습니다.</div>;
  }

  return <div>관리자 패널</div>;
}
```

## 성과

NextAuth.js 도입을 통해:

- 안전한 인증 시스템 구축 (OWASP 표준 준수)
- OAuth 통합으로 사용자 가입 절차 단순화
- 세션 관리 자동화
- 미들웨어를 통한 라우트 보호 구현

NextAuth.js는 복잡한 인증 로직을 추상화하여, 개발자가 비즈니스 로직에 집중할 수 있도록 해줍니다. 보안이 매우 중요한 애플리케이션에서 특히 강력한 선택입니다.
