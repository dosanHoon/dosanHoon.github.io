---
title: "dnd-kit으로 드래그 앤 드롭 구현하기"
date: "2026-03-05T09:00:00.000Z"
template: "post"
draft: false
slug: "/posts/dnd-kit-drag-drop-implementation"
category: "REACT"
tags:
  - "dnd-kit"
  - "Drag and Drop"
  - "React"
  - "UI Interaction"
description: "dnd-kit 라이브러리를 이용한 고급 드래그 앤 드롭 기능 구현 방법과 실제 프로젝트 사례를 공유합니다."
---

## 소개

사내 자산 관리 프로젝트에서는 사용자가 에셋을 자유롭게 정렬하고 관리할 수 있어야 합니다. 이를 위해 dnd-kit 라이브러리를 도입했습니다. dnd-kit은 React용 강력한 드래그 앤 드롭 솔루션으로, 접근성과 성능을 모두 제공합니다. 이 글에서는 실제 프로젝트에서 구현한 방법을 상세히 설명하겠습니다.

## dnd-kit이란?

dnd-kit은 React를 위한 현대적인 드래그 앤 드롭 라이브러리입니다. 주요 특징:

- **접근성**: 키보드 네비게이션 지원
- **성능**: React 렌더링 최소화
- **유연성**: 다양한 드래그 앤 드롭 패턴 지원
- **확장성**: 커스텀 센서와 전략 지원

## 기본 설치 및 설정

```bash
# 필요한 패키지 설치
npm install @dnd-kit/core @dnd-kit/utilities @dnd-kit/sortable @dnd-kit/modifiers

# 또는 pnpm 사용
pnpm add @dnd-kit/core @dnd-kit/utilities @dnd-kit/sortable @dnd-kit/modifiers
```

## 기본 드래그 앤 드롭 구현

### 1. DnDContext 설정

```typescript
// contexts/DndContext.tsx - dnd-kit 컨텍스트 설정

import React from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

interface DndProviderProps {
  children: React.ReactNode;
}

export const DndProvider: React.FC<DndProviderProps> = ({ children }) => {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      distance: 8, // 8px 이상 드래그할 때만 활성화
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
    >
      {children}
    </DndContext>
  );
};
```

### 2. Sortable List 컴포넌트

```typescript
// components/SortableList/SortableList.tsx

import React, { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { SortableItem } from './SortableItem';

interface Asset {
  id: string;
  name: string;
  thumbnail: string;
  size: number;
}

interface SortableListProps {
  items: Asset[];
  onItemsChange: (items: Asset[]) => void;
}

export const SortableList: React.FC<SortableListProps> = ({
  items,
  onItemsChange,
}) => {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      distance: 8,
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newItems = arrayMove(items, oldIndex, newIndex);
        onItemsChange(newItems);
      }
    }
  };

  const activeItem = items.find((item) => item.id === activeId);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={items.map((item) => item.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-2">
          {items.map((item) => (
            <SortableItem key={item.id} item={item} />
          ))}
        </div>
      </SortableContext>

      <DragOverlay>
        {activeItem && <SortableItem item={activeItem} isDragging />}
      </DragOverlay>
    </DndContext>
  );
};
```

### 3. Sortable Item 컴포넌트

```typescript
// components/SortableList/SortableItem.tsx

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Asset {
  id: string;
  name: string;
  thumbnail: string;
  size: number;
}

interface SortableItemProps {
  item: Asset;
  isDragging?: boolean;
}

export const SortableItem: React.FC<SortableItemProps> = ({
  item,
  isDragging = false,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        flex items-center gap-4 p-4 bg-white rounded-lg border
        ${isSortableDragging ? 'border-blue-500 shadow-lg' : 'border-gray-200'}
        ${isDragging ? 'opacity-50' : ''}
        cursor-grab active:cursor-grabbing
      `}
      {...attributes}
      {...listeners}
    >
      <div className="flex-shrink-0">
        <img
          src={item.thumbnail}
          alt={item.name}
          className="w-16 h-16 rounded object-cover"
        />
      </div>

      <div className="flex-1">
        <h3 className="font-semibold text-gray-900">{item.name}</h3>
        <p className="text-sm text-gray-500">
          {(item.size / 1024 / 1024).toFixed(2)} MB
        </p>
      </div>

      <div className="flex-shrink-0">
        <svg
          className="w-6 h-6 text-gray-400"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M8 5a2 2 0 11 0 4 2 2 0 010-4zM12 5a2 2 0 110 4 2 2 0 010-4zM8 13a2 2 0 110 4 2 2 0 010-4zm4 0a2 2 0 110 4 2 2 0 010-4z" />
        </svg>
      </div>
    </div>
  );
};
```

## 고급 기능: Grid 레이아웃 드래그 앤 드롭

```typescript
// components/AssetGrid/AssetGrid.tsx - 그리드 기반 드래그 앤 드롭

import React, { useState } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  gridTemplateColumnsValue,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { GridItem } from './GridItem';

interface GridAsset {
  id: string;
  url: string;
  title: string;
}

interface AssetGridProps {
  assets: GridAsset[];
  columns?: number;
  onAssetsChange: (assets: GridAsset[]) => void;
}

export const AssetGrid: React.FC<AssetGridProps> = ({
  assets,
  columns = 4,
  onAssetsChange,
}) => {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      distance: 8,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      const oldIndex = assets.findIndex((asset) => asset.id === active.id);
      const newIndex = assets.findIndex((asset) => asset.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newAssets = arrayMove(assets, oldIndex, newIndex);
        onAssetsChange(newAssets);
      }
    }
  };

  const activeAsset = assets.find((asset) => asset.id === activeId);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={(event) => setActiveId(event.active.id as string)}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={assets.map((asset) => asset.id)}
        strategy={rectSortingStrategy}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${columns}, 1fr)`,
            gap: '16px',
          }}
        >
          {assets.map((asset) => (
            <GridItem key={asset.id} asset={asset} />
          ))}
        </div>
      </SortableContext>

      <DragOverlay>
        {activeAsset && (
          <div className="rounded-lg shadow-xl">
            <img
              src={activeAsset.url}
              alt={activeAsset.title}
              className="w-48 h-48 rounded-lg object-cover"
            />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
};
```

```typescript
// components/AssetGrid/GridItem.tsx

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface GridAsset {
  id: string;
  url: string;
  title: string;
}

interface GridItemProps {
  asset: GridAsset;
}

export const GridItem: React.FC<GridItemProps> = ({ asset }) => {
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } =
    useSortable({ id: asset.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative group cursor-grab active:cursor-grabbing"
      {...attributes}
      {...listeners}
    >
      <img
        src={asset.url}
        alt={asset.title}
        className="w-full aspect-square rounded-lg object-cover shadow-md group-hover:shadow-lg transition-shadow"
      />
      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 rounded-lg transition-all flex items-center justify-center">
        <div className="text-white opacity-0 group-hover:opacity-100 transition-opacity text-center">
          <p className="font-semibold">{asset.title}</p>
        </div>
      </div>
    </div>
  );
};
```

## Collision Detection 전략

```typescript
// utils/collisionDetectionStrategies.ts

import {
  closestCenter,
  closestCorners,
  pointerWithin,
  rectIntersection,
  getFirstCollision,
  CollisionDetection,
} from '@dnd-kit/core';

// 1. closestCenter - 가장 가까운 중심점
const closeStrategy: CollisionDetection = closestCenter;

// 2. closestCorners - 가장 가까운 모서리
const cornersStrategy: CollisionDetection = closestCorners;

// 3. pointerWithin - 포인터 범위 내
const pointerStrategy: CollisionDetection = pointerWithin;

// 4. rectIntersection - 직사각형 교집합
const rectStrategy: CollisionDetection = rectIntersection;

// 커스텀 Collision Detection
export const customCollisionDetection: CollisionDetection = (args) => {
  // 먼저 교집합 확인
  const pointerIntersections = pointerWithin(args);

  if (pointerIntersections.length > 0) {
    return pointerIntersections;
  }

  // 교집합이 없으면 가장 가까운 것 찾기
  return closestCenter(args);
};
```

## 실무 팁

### 1. 성능 최적화

```typescript
// 드래그 중 재렌더링 최소화
const SortableListOptimized = memo(({ items, onItemsChange }: Props) => {
  const [activeId, setActiveId] = useState<string | null>(null);

  // activeId 변경 시에만 재렌더링
  const activeSensorId = activeId;

  return (
    // ...컴포넌트 코드
  );
});
```

### 2. 접근성 개선

```typescript
// 키보드 네비게이션 지원
const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
  switch (event.key) {
    case 'ArrowUp':
      moveUp();
      break;
    case 'ArrowDown':
      moveDown();
      break;
    case 'Enter':
      toggleDragMode();
      break;
    case 'Escape':
      cancelDrag();
      break;
  }
};
```

### 3. 실시간 저장

```typescript
// hooks/useSortableWithAutoSave.ts

import { useCallback, useRef } from 'react';

export const useSortableWithAutoSave = (
  items: any[],
  onSave: (items: any[]) => Promise<void>
) => {
  const saveTimeoutRef = useRef<NodeJS.Timeout>();

  const handleItemsChange = useCallback(
    async (newItems: any[]) => {
      // 기존 타이머 취소
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // 500ms 후 저장 (debounce)
      saveTimeoutRef.current = setTimeout(() => {
        onSave(newItems);
      }, 500);
    },
    [onSave]
  );

  return handleItemsChange;
};
```

## 실제 사용 예시

```typescript
// pages/assets.tsx - asset-manager-front 예시

import { useCallback, useState, useEffect } from 'react';
import { SortableList } from '@/components/SortableList';
import { useSortableWithAutoSave } from '@/hooks/useSortableWithAutoSave';
import { assetAPI } from '@/api/assetAPI';

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // 초기 데이터 로드
  useEffect(() => {
    const loadAssets = async () => {
      try {
        setIsLoading(true);
        const data = await assetAPI.getAssets();
        setAssets(data);
      } catch (error) {
        console.error('Failed to load assets:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadAssets();
  }, []);

  // 자동 저장 훅
  const handleItemsChange = useSortableWithAutoSave(
    assets,
    async (newAssets) => {
      try {
        await assetAPI.updateAssetOrder(newAssets);
        console.log('Assets saved successfully');
      } catch (error) {
        console.error('Failed to save assets:', error);
      }
    }
  );

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">에셋 라이브러리</h1>

      {isLoading ? (
        <div className="text-center py-8">로드 중...</div>
      ) : (
        <SortableList items={assets} onItemsChange={handleItemsChange} />
      )}
    </div>
  );
}
```

## 결론

dnd-kit은 React 프로젝트에서 강력하고 유연한 드래그 앤 드롭 기능을 구현하기 위한 훌륭한 선택지입니다. 접근성과 성능을 모두 고려한 설계로, 대규모 프로젝트에서도 안정적으로 사용할 수 있습니다. 대규모 프로젝트 같은 복잡한 에셋 관리 프로젝트에서도 매우 효과적으로 작동합니다.
