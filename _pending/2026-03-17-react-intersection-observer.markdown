---
title: "React Intersection Observer로 무한 스크롤과 지연 로딩 구현"
date: "2026-03-17T13:50:00.000Z"
template: "post"
draft: false
slug: "/posts/react-intersection-observer"
category: "REACT"
tags:
  - "Intersection Observer"
  - "Infinite Scroll"
  - "Performance"
description: "사내 3D 뷰어 프로젝트에서 Intersection Observer를 활용하여 무한 스크롤, 이미지 지연 로딩, 스크롤 기반 애니메이션을 구현한 방법을 설명합니다."
---

## 서론

사용자 경험과 성능은 현대 웹 애플리케이션의 필수 요소입니다. 사내 3D 뷰어 프로젝트에서는 Intersection Observer API를 활용하여 무한 스크롤, 이미지 지연 로딩, 스크롤 기반 애니메이션 등을 효율적으로 구현했습니다.

## Intersection Observer란?

Intersection Observer는 특정 요소가 뷰포트에 보이기 시작하거나 사라질 때를 감지하는 API입니다. 이는 성능이 우수하며 메인 스레드를 차단하지 않습니다.

## 무한 스크롤 구현

### 1. 기본 무한 스크롤 훅

```typescript
import { useEffect, useRef, useCallback, useState } from 'react';

interface UseInfiniteScrollOptions {
  onLoadMore: () => Promise<void>;
  threshold?: number;
  enabled?: boolean;
}

export const useInfiniteScroll = ({
  onLoadMore,
  threshold = 0.1,
  enabled = true
}: UseInfiniteScrollOptions) => {
  const observerTarget = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!enabled || !observerTarget.current) return;

    const observer = new IntersectionObserver(
      async (entries) => {
        // 마지막 요소가 뷰포트에 진입했을 때
        if (entries[0].isIntersecting && !isLoading) {
          setIsLoading(true);
          try {
            await onLoadMore();
          } finally {
            setIsLoading(false);
          }
        }
      },
      { threshold }
    );

    observer.observe(observerTarget.current);

    return () => observer.disconnect();
  }, [onLoadMore, threshold, enabled, isLoading]);

  return { observerTarget, isLoading };
};
```

### 2. 무한 스크롤 구현 예제

```typescript
import { useState, useCallback } from 'react';
import { useInfiniteScroll } from './useInfiniteScroll';

interface Asset {
  id: string;
  name: string;
  thumbnail: string;
  uploadedAt: string;
}

export const AssetGallery: React.FC = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const loadMoreAssets = useCallback(async () => {
    if (!hasMore) return;

    const response = await fetch(`/api/assets?page=${page}&limit=20`);
    const data = await response.json();

    if (data.items.length === 0) {
      setHasMore(false);
      return;
    }

    setAssets(prev => [...prev, ...data.items]);
    setPage(prev => prev + 1);
  }, [page, hasMore]);

  const { observerTarget, isLoading } = useInfiniteScroll({
    onLoadMore: loadMoreAssets,
    enabled: hasMore
  });

  return (
    <div className="gallery">
      <div className="grid grid-cols-4 gap-4">
        {assets.map(asset => (
          <AssetCard key={asset.id} asset={asset} />
        ))}
      </div>

      {/* 로딩 감지 대상 */}
      <div ref={observerTarget} className="py-8 text-center">
        {isLoading && <LoadingSpinner />}
        {!hasMore && <p>모든 자산을 로드했습니다</p>}
      </div>
    </div>
  );
};
```

## 이미지 지연 로딩

### 1. 이미지 지연 로딩 훅

```typescript
import { useEffect, useRef, useState } from 'react';

interface UseImageLazyLoadOptions {
  src: string;
  placeholder?: string;
  threshold?: number;
}

export const useImageLazyLoad = ({
  src,
  placeholder,
  threshold = 0.1
}: UseImageLazyLoadOptions) => {
  const imageRef = useRef<HTMLImageElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [imageSrc, setImageSrc] = useState(placeholder || '');

  useEffect(() => {
    if (!imageRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          // 이미지 로딩 시작
          const img = new Image();
          img.src = src;
          img.onload = () => {
            setImageSrc(src);
            setIsLoaded(true);
          };
          img.onerror = () => {
            console.error(`이미지 로드 실패: ${src}`);
          };

          // 관찰 중지
          observer.unobserve(imageRef.current!);
        }
      },
      { threshold }
    );

    observer.observe(imageRef.current);

    return () => observer.disconnect();
  }, [src, threshold]);

  return { imageRef, imageSrc, isLoaded };
};
```

### 2. LazyImage 컴포넌트

```typescript
import { CSSProperties } from 'react';
import { useImageLazyLoad } from './useImageLazyLoad';

interface LazyImageProps {
  src: string;
  alt: string;
  placeholder?: string;
  className?: string;
  style?: CSSProperties;
  width?: number | string;
  height?: number | string;
}

export const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  placeholder,
  className,
  style,
  width,
  height
}) => {
  // Blur 효과를 위한 간단한 placeholder
  const blurPlaceholder = placeholder || 'data:image/svg+xml,...';

  const { imageRef, imageSrc, isLoaded } = useImageLazyLoad({
    src,
    placeholder: blurPlaceholder,
    threshold: 0.1
  });

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{
        width,
        height,
        ...style
      }}
    >
      <img
        ref={imageRef}
        src={imageSrc}
        alt={alt}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          isLoaded ? 'opacity-100' : 'opacity-50'
        }`}
        loading="lazy"
      />
      {!isLoaded && (
        <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-pulse" />
      )}
    </div>
  );
};
```

### 3. 사용 예제

```typescript
export const AssetCard: React.FC<{ asset: Asset }> = ({ asset }) => {
  return (
    <div className="card">
      <LazyImage
        src={asset.thumbnail}
        alt={asset.name}
        placeholder="data:image/png;base64,..."
        width="100%"
        height={200}
        className="rounded-lg"
      />
      <h3 className="mt-2 font-semibold">{asset.name}</h3>
      <p className="text-sm text-gray-500">{asset.uploadedAt}</p>
    </div>
  );
};
```

## 스크롤 기반 애니메이션

### 1. 스크롤 감지 훅

```typescript
interface UseScrollAnimationOptions {
  threshold?: number | number[];
  rootMargin?: string;
}

export const useScrollAnimation = ({
  threshold = 0.5,
  rootMargin = '0px 0px -100px 0px'
}: UseScrollAnimationOptions) => {
  const elementRef = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!elementRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            // 애니메이션 후 관찰 중지
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold,
        rootMargin
      }
    );

    observer.observe(elementRef.current);

    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  return { elementRef, isVisible };
};
```

### 2. 애니메이션 컴포넌트

```typescript
interface ScrollAnimationProps {
  children: React.ReactNode;
  animationType?: 'fadeIn' | 'slideUp' | 'slideIn' | 'scaleIn';
  duration?: number;
}

export const ScrollAnimation: React.FC<ScrollAnimationProps> = ({
  children,
  animationType = 'fadeIn',
  duration = 600
}) => {
  const { elementRef, isVisible } = useScrollAnimation({
    threshold: 0.3
  });

  const animationClasses = {
    fadeIn: 'opacity-0 group-[.visible]:opacity-100',
    slideUp: 'translate-y-10 group-[.visible]:translate-y-0',
    slideIn: '-translate-x-10 group-[.visible]:translate-x-0',
    scaleIn: 'scale-90 group-[.visible]:scale-100'
  };

  return (
    <div
      ref={elementRef}
      className={`group transition-all ${animationClasses[animationType]}`}
      style={{ transitionDuration: `${duration}ms` }}
      data-visible={isVisible}
    >
      {children}
    </div>
  );
};
```

### 3. 사용 예제

```typescript
export const AssetSection: React.FC = () => {
  return (
    <div className="space-y-8">
      <ScrollAnimation animationType="fadeIn">
        <h2 className="text-3xl font-bold">새로운 자산</h2>
      </ScrollAnimation>

      <ScrollAnimation animationType="slideUp" duration={800}>
        <p className="text-gray-600">최근 업로드된 자산들입니다</p>
      </ScrollAnimation>

      <div className="grid grid-cols-4 gap-4">
        {assets.map((asset, index) => (
          <ScrollAnimation
            key={asset.id}
            animationType="scaleIn"
            duration={600 + index * 100}
          >
            <AssetCard asset={asset} />
          </ScrollAnimation>
        ))}
      </div>
    </div>
  );
};
```

## 고급 사용 사례

### 1. 동적 로딩 감시기

```typescript
export const useIntersectionObserver = <T extends Element>(
  callback: (entry: IntersectionObserverEntry) => void,
  options?: IntersectionObserverInit
) => {
  const elementRef = useRef<T>(null);

  useEffect(() => {
    if (!elementRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(callback);
      },
      {
        threshold: 0.5,
        ...options
      }
    );

    observer.observe(elementRef.current);

    return () => observer.disconnect();
  }, [callback, options]);

  return elementRef;
};
```

### 2. 다중 요소 감시

```typescript
export const useMultipleIntersection = (
  selectors: string[],
  callback: (element: Element, isVisible: boolean) => void
) => {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          callback(entry.target, entry.isIntersecting);
        });
      },
      { threshold: 0.5 }
    );

    selectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(el => {
        observer.observe(el);
      });
    });

    return () => observer.disconnect();
  }, [selectors, callback]);
};
```

### 3. 성능 최적화 예제

```typescript
// 콜백 메모이제이션으로 불필요한 재생성 방지
const animationCallback = useCallback((entry: IntersectionObserverEntry) => {
  if (entry.isIntersecting) {
    entry.target.classList.add('animate-in');
  } else {
    entry.target.classList.remove('animate-in');
  }
}, []);

const ref = useIntersectionObserver(animationCallback, {
  threshold: 0.5,
  rootMargin: '0px'
});
```

## 성능 고려사항

### 1. Throttling 적용

```typescript
const createThrottledCallback = (
  callback: Function,
  delay: number = 100
) => {
  let lastCall = 0;
  return (...args: any[]) => {
    const now = Date.now();
    if (now - lastCall >= delay) {
      callback(...args);
      lastCall = now;
    }
  };
};
```

### 2. 메모리 누수 방지

```typescript
useEffect(() => {
  const observer = new IntersectionObserver(callback);

  // 모든 요소 관찰
  elements.forEach(el => observer.observe(el));

  return () => {
    // 정리 작업 필수
    elements.forEach(el => observer.unobserve(el));
    observer.disconnect();
  };
}, [elements, callback]);
```

## 브라우저 호환성

```typescript
// 폴백 처리
export const hasIntersectionObserver = () => {
  return typeof IntersectionObserver !== 'undefined';
};

export const SafeLazyImage: React.FC<LazyImageProps> = (props) => {
  if (!hasIntersectionObserver()) {
    // 폴백: 일반 이미지 로딩
    return <img src={props.src} alt={props.alt} />;
  }

  return <LazyImage {...props} />;
};
```

## 결론

Intersection Observer API를 활용하면:

1. **무한 스크롤**: 사용자가 아래로 스크롤할 때 자동으로 데이터 로드
2. **이미지 지연 로딩**: 화면에 보이는 이미지만 로드하여 성능 향상
3. **스크롤 애니메이션**: 요소가 화면에 들어올 때 애니메이션 트리거
4. **성능 개선**: 메인 스레드 차단 없이 효율적인 감시
5. **사용자 경험 향상**: 부드러운 로딩과 애니메이션

이러한 기술들을 적절히 조합하면 고성능의 현대적인 웹 애플리케이션을 만들 수 있습니다.
