---
title: "Orval로 API 코드 자동 생성하기"
date: "2026-03-01T10:45:00.000Z"
template: "post"
draft: false
slug: "/posts/orval-api-codegen"
category: "DEVOPS"
tags:
  - "Orval"
  - "OpenAPI"
  - "Code Generation"
description: "Orval을 활용한 자동 API 클라이언트 생성. OpenAPI 스펙에서 TypeScript 클라이언트와 React Query 훅 자동 생성까지 API 개발 생산성을 극대화합니다."
---

사내 자산 관리 서비스 프로젝트에서 Orval을 사용하여 OpenAPI 명세로부터 타입 안전한 API 클라이언트를 자동 생성한 경험을 공유하겠습니다. Orval은 OpenAPI/Swagger 스펙을 기반으로 클라이언트 코드를 자동으로 생성하여 개발 시간을 크게 단축합니다.

## Orval 설치 및 설정

```bash
npm install --save-dev @orval/cli @orval/react-query
```

기본 설정 파일을 생성합니다.

```typescript
// orval.config.ts
import { defineConfig } from '@orval/core';

export default defineConfig({
  api: {
    input: {
      target: './openapi.yaml', // 또는 URL: 'https://api.example.com/openapi.json'
      validation: true,
    },
    output: {
      mode: 'tags-split', // 엔드포인트 태그별로 파일 분리
      target: './src/api/generated',
      schemas: './src/api/generated/models',
      client: 'react-query',
      mock: false,
      prettier: true,
      override: {
        mutator: {
          path: './src/api/instance.ts',
          name: 'apiInstance',
        },
      },
    },
  },
});
```

## OpenAPI 스펙 정의

백엔드에서 OpenAPI 스펙을 정의합니다.

```yaml
# openapi.yaml
openapi: 3.0.0
info:
  title: Asset Management API
  version: 1.0.0

servers:
  - url: http://localhost:3000/api

paths:
  /products:
    get:
      operationId: listProducts
      tags:
        - products
      summary: Get all products
      parameters:
        - name: page
          in: query
          schema:
            type: integer
            default: 1
        - name: limit
          in: query
          schema:
            type: integer
            default: 10
      responses:
        '200':
          description: Product list
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    type: array
                    items:
                      $ref: '#/components/schemas/Product'
                  total:
                    type: integer

    post:
      operationId: createProduct
      tags:
        - products
      summary: Create a new product
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateProductRequest'
      responses:
        '201':
          description: Product created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Product'

  /products/{id}:
    get:
      operationId: getProduct
      tags:
        - products
      summary: Get product by ID
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Product details
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Product'

    put:
      operationId: updateProduct
      tags:
        - products
      summary: Update product
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/UpdateProductRequest'
      responses:
        '200':
          description: Product updated
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Product'

    delete:
      operationId: deleteProduct
      tags:
        - products
      summary: Delete product
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      responses:
        '204':
          description: Product deleted

components:
  schemas:
    Product:
      type: object
      required:
        - id
        - name
        - price
      properties:
        id:
          type: string
          format: uuid
        name:
          type: string
        description:
          type: string
        price:
          type: number
          format: double
        category:
          type: string
        tags:
          type: array
          items:
            type: string
        createdAt:
          type: string
          format: date-time
        updatedAt:
          type: string
          format: date-time

    CreateProductRequest:
      type: object
      required:
        - name
        - price
      properties:
        name:
          type: string
        description:
          type: string
        price:
          type: number
        category:
          type: string
        tags:
          type: array
          items:
            type: string

    UpdateProductRequest:
      type: object
      properties:
        name:
          type: string
        description:
          type: string
        price:
          type: number
        category:
          type: string
        tags:
          type: array
          items:
            type: string
```

## API 인스턴스 설정

Orval이 사용할 API 클라이언트를 설정합니다.

```typescript
// src/api/instance.ts
import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/stores/authStore';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api',
  timeout: 30000,
});

// 요청 인터셉터: 인증 토큰 추가
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 응답 인터셉터: 에러 처리
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // 토큰 만료 시 로그아웃
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);

export const apiInstance = async (
  config: AxiosRequestConfig
): Promise<any> => {
  return apiClient(config).then((response) => response.data);
};
```

## 코드 생성

Orval을 실행하여 코드를 자동 생성합니다.

```bash
# package.json에 스크립트 추가
{
  "scripts": {
    "api:generate": "orval"
  }
}

# 실행
npm run api:generate
```

생성된 파일 구조:

```
src/api/generated/
├── models/
│   ├── product.ts
│   ├── createProductRequest.ts
│   └── updateProductRequest.ts
├── products/
│   ├── products.ts (list/create)
│   ├── products.responses.ts
│   └── products.schemas.ts
└── index.ts (모든 내보내기)
```

## 생성된 API 클라이언트 사용

```typescript
// 생성된 코드 예시
// src/api/generated/products/products.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiInstance } from '../instance';
import type { Product, CreateProductRequest, UpdateProductRequest } from '../models';

export const useListProducts = (params: { page?: number; limit?: number }) => {
  return useQuery({
    queryKey: ['products', params],
    queryFn: async () => {
      const response = await apiInstance({
        url: '/products',
        method: 'GET',
        params,
      });
      return response;
    },
  });
};

export const useGetProduct = (id: string) => {
  return useQuery({
    queryKey: ['products', id],
    queryFn: async () => {
      const response = await apiInstance({
        url: `/products/${id}`,
        method: 'GET',
      });
      return response;
    },
  });
};

export const useCreateProduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateProductRequest) => {
      return apiInstance({
        url: '/products',
        method: 'POST',
        data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
};

export const useUpdateProduct = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateProductRequest) => {
      return apiInstance({
        url: `/products/${id}`,
        method: 'PUT',
        data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['products', id] });
    },
  });
};

export const useDeleteProduct = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      return apiInstance({
        url: `/products/${id}`,
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
};
```

## 컴포넌트에서 사용

```typescript
// components/product-list.tsx
'use client';

import { useListProducts } from '@/api/generated/products/products';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

export function ProductList() {
  const [page, setPage] = useState(1);
  const { data, isLoading, error } = useListProducts({ page, limit: 10 });

  if (isLoading) return <div>로딩 중...</div>;
  if (error) return <div>에러: {(error as Error).message}</div>;
  if (!data?.data) return <div>상품이 없습니다.</div>;

  return (
    <div>
      <div className="grid gap-4">
        {data.data.map((product) => (
          <div key={product.id} className="border p-4 rounded">
            <h3>{product.name}</h3>
            <p>{product.description}</p>
            <p className="font-bold">${product.price}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

```typescript
// components/create-product-form.tsx
'use client';

import { useCreateProduct } from '@/api/generated/products/products';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';

const schema = z.object({
  name: z.string().min(1, '상품명은 필수입니다'),
  description: z.string(),
  price: z.number().positive('가격은 양수여야 합니다'),
  category: z.string(),
  tags: z.array(z.string()),
});

type FormData = z.infer<typeof schema>;

export function CreateProductForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const { mutate, isPending } = useCreateProduct();

  const onSubmit = (data: FormData) => {
    mutate(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <FormField
        {...register('name')}
        label="상품명"
        error={errors.name?.message}
      />
      <FormField
        {...register('description')}
        label="설명"
        error={errors.description?.message}
      />
      <FormField
        {...register('price', { valueAsNumber: true })}
        type="number"
        label="가격"
        error={errors.price?.message}
      />
      <Button type="submit" disabled={isPending}>
        {isPending ? '생성 중...' : '상품 생성'}
      </Button>
    </form>
  );
}
```

## 커스텀 생성 설정

특정 요구사항에 맞게 생성 로직을 커스터마이징합니다.

```typescript
// orval.config.ts
export default defineConfig({
  api: {
    input: './openapi.yaml',
    output: {
      target: './src/api/generated',
      client: 'react-query',
      override: {
        operations: {
          // 특정 작업에 대해 Custom Hook 생성
          useListProducts: {
            mutationFn: 'useQuery', // useQuery 사용
            queryOptions: {
              staleTime: 5 * 60 * 1000, // 5분
            },
          },
          useCreateProduct: {
            mutationFn: 'useMutation',
            mutationOptions: {
              onSuccess: 'invalidateQueries',
            },
          },
        },
      },
    },
  },
});
```

## 성과

Orval 도입을 통해:

- 수동 API 클라이언트 작성 시간 90% 감소
- API 명세와 클라이언트 코드의 일관성 보장
- 타입 안정성 극대화
- API 변경 시 자동 반영

Orval은 API 기반 프로젝트의 개발 생산성을 극적으로 향상시킵니다. OpenAPI 스펙이 신뢰할 수 있는 단일 소스가 되어, 백엔드와 프론트엔드 개발자 간의 계약을 명확히 합니다.
