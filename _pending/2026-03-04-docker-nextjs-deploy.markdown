---
title: "Docker로 Next.js 앱 배포하기"
date: "2026-03-04T09:00:00.000Z"
template: "post"
draft: false
slug: "/posts/docker-nextjs-deployment-guide"
category: "DEVOPS"
tags:
  - "Docker"
  - "Next.js"
  - "Nginx"
  - "Deployment"
description: "Docker 컨테이너를 이용한 Next.js 애플리케이션의 안정적인 배포 방법과 Nginx를 통한 역방향 프록시 설정을 다룹니다."
---

## 소개

프론트엔드 팀에서 다양한 규모의 Next.js 프로젝트를 관리하고 있습니다. monorepo-template 같은 모노레포 프로젝트를 Docker를 이용해 효율적으로 배포하는 방법을 공유하겠습니다. 이 글에서는 Dockerfile 작성부터 docker-compose 설정, Nginx 역방향 프록시까지 실무에서 사용하는 완전한 배포 파이프라인을 다룹니다.

## Docker를 사용하는 이유

Next.js 애플리케이션을 Docker 컨테이너로 배포하면 여러 이점이 있습니다:

- **환경 일관성**: 개발 환경과 프로덕션 환경을 동일하게 유지
- **확장성**: 여러 인스턴스를 쉽게 배포 가능
- **격리성**: 애플리케이션 간의 의존성 충돌 방지
- **빠른 배포**: 사전 준비된 이미지로 빠른 롤아웃 가능

## 기본 Dockerfile 작성

### 멀티 스테이지 빌드

```dockerfile
# Dockerfile - 멀티 스테이지 빌드로 최적화된 이미지 생성

# 1단계: 빌드 환경
FROM node:18-alpine AS builder

WORKDIR /app

# 패키지 매니저 설치
RUN npm install -g pnpm@8.6.0

# 의존성 파일 복사
COPY package.json pnpm-lock.yaml ./

# 의존성 설치
RUN pnpm install --frozen-lockfile

# 소스 코드 복사
COPY . .

# Next.js 빌드
RUN pnpm run build

# 2단계: 런타임 환경
FROM node:18-alpine AS runner

WORKDIR /app

ENV NODE_ENV production

# 필요한 사용자 생성 (보안)
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# pnpm 설치
RUN npm install -g pnpm@8.6.0

# 빌드 결과물 복사
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# 사용자 전환
USER nextjs

# 포트 노출
EXPOSE 3000

# 헬스 체크 추가
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node healthcheck.js

# 앱 실행
CMD ["node", "server.js"]
```

### Next.js 설정 최적화

```typescript
// next.config.js - Docker 배포를 위한 최적화 설정

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // 독립 실행 가능한 빌드 결과
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
  swcMinify: true,

  // 환경 변수
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://api.example.com',
  },

  // 헤더 보안 설정
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
```

## Docker Compose 설정

### 로컬 개발 환경

```yaml
# docker-compose.dev.yml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - NEXT_PUBLIC_API_URL=http://localhost:3001
    volumes:
      - .:/app
      - /app/node_modules
    depends_on:
      - api
    networks:
      - local-network

  api:
    image: myapi:latest
    ports:
      - "3001:3001"
    environment:
      - DATABASE_URL=postgresql://user:password@db:5432/mydb
    depends_on:
      - db
    networks:
      - local-network

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=mydb
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - local-network

volumes:
  postgres_data:

networks:
  local-network:
    driver: bridge
```

### 프로덕션 환경

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  app:
    image: company/asset-manager-front:latest
    container_name: nextjs-app-prod
    restart: always
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_API_URL=https://api.example.com
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 3s
      retries: 3
      start_period: 40s
    networks:
      - production-network
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  nginx:
    image: nginx:alpine
    container_name: nginx-reverse-proxy
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
      - ./html:/usr/share/nginx/html:ro
    depends_on:
      - app
    networks:
      - production-network
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

networks:
  production-network:
    driver: bridge
```

## Nginx 역방향 프록시 설정

```nginx
# nginx.conf - Nginx 역방향 프록시 설정

user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
    use epoll;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;

    # 성능 최적화
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;

    # Gzip 압축
    gzip on;
    gzip_disable "msie6";
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript
               application/json application/javascript application/xml+rss
               application/rss+xml font/truetype font/opentype
               application/vnd.ms-fontobject image/svg+xml;

    # 업스트림 정의
    upstream nextjs {
        server app:3000;
    }

    # HTTP를 HTTPS로 리다이렉트
    server {
        listen 80;
        server_name _;

        location /.well-known/acme-challenge/ {
            root /usr/share/nginx/html;
        }

        location / {
            return 301 https://$host$request_uri;
        }
    }

    # HTTPS 서버 설정
    server {
        listen 443 ssl http2;
        server_name example.com;

        # SSL 인증서
        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;

        # SSL 보안 설정
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;
        ssl_prefer_server_ciphers on;

        # 캐시 헤더
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            proxy_pass http://nextjs;
            proxy_cache_valid 30d;
            add_header Cache-Control "public, immutable";
        }

        # API 요청은 캐시하지 않음
        location /api {
            proxy_pass http://nextjs;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
            proxy_no_cache 1;
        }

        # 일반 페이지
        location / {
            proxy_pass http://nextjs;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_redirect off;

            # 타임아웃 설정
            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
        }
    }
}
```

## SSL/TLS 인증서 설정

```bash
#!/bin/bash
# setup-ssl.sh - SSL 인증서 자동 설정

# Let's Encrypt를 사용한 무료 SSL 인증서 발급
docker run -it --rm --name certbot \
  -v ./ssl:/etc/letsencrypt \
  -v ./html:/var/www/certbot \
  certbot/certbot certonly --webroot \
  --webroot-path /var/www/certbot \
  --email admin@example.com \
  -d example.com \
  -d www.example.com

# 인증서 자동 갱신 설정
docker run -d \
  --name certbot-renew \
  -v ./ssl:/etc/letsencrypt \
  -v ./html:/var/www/certbot \
  --entrypoint /bin/sh certbot/certbot \
  -c "while true; do certbot renew --webroot --webroot-path /var/www/certbot -q; sleep 12h; done"
```

## 배포 스크립트

```bash
#!/bin/bash
# deploy.sh - 자동 배포 스크립트

set -e

# 환경 변수 로드
export $(cat .env.prod | xargs)

echo "🚀 배포 시작..."

# 기존 컨테이너 중지
echo "⏹️  기존 컨테이너 중지..."
docker-compose -f docker-compose.prod.yml down || true

# 이미지 빌드
echo "🔨 이미지 빌드..."
docker build -t company/asset-manager-front:latest .

# 컨테이너 시작
echo "🟢 새 컨테이너 시작..."
docker-compose -f docker-compose.prod.yml up -d

# 헬스 체크
echo "✅ 헬스 체크..."
sleep 10
if curl -f http://localhost:3000/api/health; then
    echo "✨ 배포 완료!"
else
    echo "❌ 배포 실패!"
    exit 1
fi
```

## 모니터링 및 로깅

```typescript
// api/health.ts - 헬스 체크 엔드포인트

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      environment: process.env.NODE_ENV,
    };

    return NextResponse.json(health, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { status: 'error', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
```

## 실무 팁

1. **이미지 크기 최적화**: `node_modules` 캐싱을 활용해 빌드 시간 단축

2. **보안**: 비루트 사용자로 실행하고, 불필요한 패키지 제거

3. **로깅**: JSON 포맷으로 로깅해 중앙 로깅 시스템과 통합

4. **자동 갱신**: Let's Encrypt 인증서 갱신 스크립트 자동화

## 결론

Docker를 이용한 Next.js 배포는 초기 설정에 시간이 걸리지만, 일단 구축되면 안정적이고 확장 가능한 배포 환경을 제공합니다. 특히 Nginx를 통한 역방향 프록시와 SSL/TLS 설정을 함께 사용하면 프로덕션 수준의 안정적인 환경을 구축할 수 있습니다.
