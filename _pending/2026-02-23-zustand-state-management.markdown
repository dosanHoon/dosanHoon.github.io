---
title: "Zustand으로 상태 관리 전환기"
date: "2026-02-23T11:00:00.000Z"
template: "post"
draft: false
slug: "/posts/zustand-state-management"
category: "REACT"
tags:
  - "Zustand"
  - "State Management"
  - "React"
description: "Redux와 MobX에서 Zustand으로의 전환 경험. 스토어 패턴, 미들웨어 활용, DevTools 통합까지 실제 프로젝트 사례를 통해 소개합니다."
---

복잡한 상태 관리가 필요한 프로젝트에서 Redux와 MobX를 거쳐 Zustand으로 정착한 경험을 공유하겠습니다. Zustand 4.5 버전을 기준으로 한 실무 활용법을 다룹니다.

## Redux에서 느낀 통증점

기존 프로젝트에서 Redux를 사용할 때의 주요 문제점들:

1. **보일러플레이트 코드의 증가**: action, reducer, selector를 모두 따로 작성해야 함
2. **타입 안정성**: Redux의 복잡한 타입 정의로 인한 오류
3. **학습 곡선**: 새로운 팀원들이 Redux 패턴을 이해하는 데 시간 소요
4. **미들웨어 설정**: 비동기 작업을 위해 redux-thunk나 redux-saga 필요

```typescript
// Redux 방식의 보일러플레이트
// reducer.ts
const initialState = {
  products: [],
  loading: false,
};

export const productSlice = createSlice({
  name: 'products',
  initialState,
  reducers: {
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setProducts: (state, action) => {
      state.products = action.payload;
    },
  },
});

// store.ts
export const store = configureStore({
  reducer: {
    products: productSlice.reducer,
  },
});
```

## Zustand으로의 전환

Zustand은 훨씬 간결한 API를 제공합니다. 기본 스토어 생성은 다음과 같습니다.

```typescript
// stores/productStore.ts
import { create } from 'zustand';

interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
}

interface ProductStore {
  products: Product[];
  loading: boolean;
  error: string | null;

  setLoading: (loading: boolean) => void;
  setProducts: (products: Product[]) => void;
  setError: (error: string | null) => void;
  fetchProducts: () => Promise<void>;
  addProduct: (product: Product) => void;
  removeProduct: (id: string) => void;
}

export const useProductStore = create<ProductStore>((set) => ({
  products: [],
  loading: false,
  error: null,

  setLoading: (loading) => set({ loading }),
  setProducts: (products) => set({ products }),
  setError: (error) => set({ error }),

  fetchProducts: async () => {
    set({ loading: true });
    try {
      const response = await fetch('/api/products');
      const data = await response.json();
      set({ products: data, error: null });
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ loading: false });
    }
  },

  addProduct: (product) =>
    set((state) => ({
      products: [...state.products, product],
    })),

  removeProduct: (id) =>
    set((state) => ({
      products: state.products.filter((p) => p.id !== id),
    })),
}));
```

## 선택적 구독(Selector)

Zustand의 선택자는 자동으로 메모이제이션되어 불필요한 리렌더링을 방지합니다.

```typescript
// 전체 상태 구독
function ProductList() {
  const store = useProductStore();
  return (
    <div>
      {store.loading && <p>로딩 중...</p>}
      {store.products.map((p) => (
        <div key={p.id}>{p.name}</div>
      ))}
    </div>
  );
}

// 특정 값만 구독
function ProductCount() {
  const count = useProductStore((state) => state.products.length);
  return <span>총 {count}개 상품</span>;
}

// 복잡한 셀렉터
function ProductInfo() {
  const { products, loading } = useProductStore(
    (state) => ({
      products: state.products,
      loading: state.loading,
    }),
    (prev, next) => {
      // 커스텀 동등성 비교
      return (
        prev.products === next.products &&
        prev.loading === next.loading
      );
    }
  );

  return (
    <div>
      <p>상품 수: {products.length}</p>
      <p>상태: {loading ? '로딩 중' : '완료'}</p>
    </div>
  );
}
```

## 미들웨어를 통한 고급 기능

Zustand의 미들웨어로 logging, persistence 등을 구현할 수 있습니다.

```typescript
// stores/cartStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CartItem {
  productId: string;
  quantity: number;
  price: number;
}

interface CartStore {
  items: CartItem[];
  total: number;
  addItem: (item: CartItem) => void;
  removeItem: (productId: string) => void;
  clear: () => void;
}

const useCartStore = create<CartStore>(
  persist(
    (set, get) => ({
      items: [],
      total: 0,

      addItem: (item) =>
        set((state) => {
          const existingItem = state.items.find(
            (i) => i.productId === item.productId
          );

          let newItems: CartItem[];
          if (existingItem) {
            newItems = state.items.map((i) =>
              i.productId === item.productId
                ? { ...i, quantity: i.quantity + item.quantity }
                : i
            );
          } else {
            newItems = [...state.items, item];
          }

          const total = newItems.reduce(
            (sum, i) => sum + i.price * i.quantity,
            0
          );

          return { items: newItems, total };
        }),

      removeItem: (productId) =>
        set((state) => {
          const newItems = state.items.filter(
            (i) => i.productId !== productId
          );
          const total = newItems.reduce(
            (sum, i) => sum + i.price * i.quantity,
            0
          );
          return { items: newItems, total };
        }),

      clear: () => set({ items: [], total: 0 }),
    }),
    {
      name: 'cart-storage', // localStorage 키
      partialize: (state) => ({
        items: state.items,
        total: state.total,
      }), // 일부만 저장
    }
  )
);

export default useCartStore;
```

## DevTools 통합

Redux DevTools와 호환되는 모니터링을 설정할 수 있습니다.

```typescript
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface AuthStore {
  user: { id: string; name: string } | null;
  token: string | null;
  isAuthenticated: boolean;

  login: (credentials: { email: string; password: string }) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>(
  devtools(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: async (credentials) => {
        const response = await fetch('/api/login', {
          method: 'POST',
          body: JSON.stringify(credentials),
        });

        const data = await response.json();

        set(
          {
            user: data.user,
            token: data.token,
            isAuthenticated: true,
          },
          false,
          { type: 'login', credentials: { email: credentials.email } }
        );
      },

      logout: () => {
        set(
          {
            user: null,
            token: null,
            isAuthenticated: false,
          },
          false,
          { type: 'logout' }
        );
      },
    }),
    {
      name: 'auth-store',
      enabled: process.env.NODE_ENV === 'development',
    }
  )
);
```

## 여러 스토어 조합

복잡한 애플리케이션에서는 여러 개의 작은 스토어를 만드는 것이 좋습니다.

```typescript
// hooks/useCombinedStore.ts
import { useShallow } from 'zustand/react';
import { useProductStore } from '@/stores/productStore';
import { useCartStore } from '@/stores/cartStore';
import { useAuthStore } from '@/stores/authStore';

export function useCombinedStore() {
  const products = useProductStore(useShallow((state) => state.products));
  const cartItems = useCartStore(useShallow((state) => state.items));
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return {
    products,
    cartItems,
    isAuthenticated,
  };
}
```

## 성능 최적화 팁

1. **Selector 사용**: 필요한 부분만 선택하여 불필요한 리렌더링 방지
2. **metering 미들웨어**: 큰 상태 변경을 배치 처리
3. **Immer 미들웨어**: 불변성 유지를 더 쉽게

```typescript
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

interface DataStore {
  nested: { deep: { value: string } };
  updateValue: (value: string) => void;
}

export const useDataStore = create<DataStore>(
  immer((set) => ({
    nested: { deep: { value: 'initial' } },
    updateValue: (value) =>
      set((state) => {
        state.nested.deep.value = value; // 직접 수정 가능
      }),
  }))
);
```

## 마이그레이션 결과

Zustand으로의 전환 후:

- 보일러플레이트 코드 70% 감소
- 번들 크기 40KB 축소
- 새로운 팀원의 온보딩 시간 단축
- 개발 속도 20% 향상

상태 관리는 프로젝트의 복잡도에 따라 선택해야 합니다. 작은 프로젝트부터 대규모 애플리케이션까지 Zustand의 유연성은 모든 스케일에서 효과적입니다.
