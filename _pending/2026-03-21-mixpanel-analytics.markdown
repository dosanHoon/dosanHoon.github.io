---
title: "Mixpanel로 사용자 행동 분석 구현하기"
date: "2026-03-21T11:30:00.000Z"
template: "post"
draft: false
slug: "/posts/mixpanel-analytics"
category: "JAVASCRIPT"
tags:
  - "Mixpanel"
  - "Analytics"
  - "User Tracking"
description: "사내 3D 뷰어 프로젝트에서 Mixpanel을 활용하여 사용자 행동 추적, 이벤트 기록, 퍼널 분석, A/B 테스팅을 구현한 방법을 설명합니다."
---

## 소개

데이터 기반의 제품 개선을 위해서는 사용자 행동을 정확히 파악하는 것이 중요합니다. 사내 3D 뷰어 프로젝트에서는 Mixpanel을 활용하여 사용자 행동을 추적하고 분석합니다.

## Mixpanel 설치 및 초기화

```bash
npm install mixpanel-browser
```

### 초기화 설정

`lib/analytics.ts`:

```typescript
import mixpanel from 'mixpanel-browser';

const MIXPANEL_TOKEN = process.env.REACT_APP_MIXPANEL_TOKEN!;

export class Analytics {
  static initialized = false;

  static init() {
    if (this.initialized) return;

    mixpanel.init(MIXPANEL_TOKEN, {
      debug: process.env.NODE_ENV === 'development',
      track_pageview: false, // 수동 페이지 추적
      persistence: 'localStorage',
      batch_size: 50, // 배치 크기
      batch_interval: 30000, // 30초마다 전송
    });

    this.initialized = true;
  }

  static identify(userId: string, properties?: Record<string, any>) {
    mixpanel.identify(userId);

    if (properties) {
      mixpanel.people.set(properties);
    }
  }

  static reset() {
    mixpanel.reset();
  }
}

// 앱 초기화 시 한 번만 실행
Analytics.init();
```

## 기본 이벤트 추적

### 1. 단순 이벤트 추적

```typescript
export class EventTracker {
  // 페이지 뷰 추적
  static trackPageView(
    pageName: string,
    properties?: Record<string, any>
  ) {
    mixpanel.track('Page View', {
      page_name: pageName,
      timestamp: new Date().toISOString(),
      ...properties,
    });
  }

  // 클릭 이벤트
  static trackClick(
    elementName: string,
    properties?: Record<string, any>
  ) {
    mixpanel.track('Element Clicked', {
      element_name: elementName,
      timestamp: new Date().toISOString(),
      ...properties,
    });
  }

  // 검색 이벤트
  static trackSearch(
    query: string,
    resultsCount: number,
    filters?: Record<string, any>
  ) {
    mixpanel.track('Search', {
      query,
      results_count: resultsCount,
      filters,
      timestamp: new Date().toISOString(),
    });
  }

  // 다운로드 이벤트
  static trackDownload(
    assetId: string,
    assetName: string,
    assetType: string
  ) {
    mixpanel.track('Asset Downloaded', {
      asset_id: assetId,
      asset_name: assetName,
      asset_type: assetType,
      timestamp: new Date().toISOString(),
    });
  }

  // 업로드 이벤트
  static trackUpload(
    fileName: string,
    fileSize: number,
    fileType: string
  ) {
    mixpanel.track('Asset Uploaded', {
      file_name: fileName,
      file_size: fileSize,
      file_type: fileType,
      timestamp: new Date().toISOString(),
    });
  }

  // 에러 추적
  static trackError(
    errorType: string,
    errorMessage: string,
    stackTrace?: string
  ) {
    mixpanel.track('Error Occurred', {
      error_type: errorType,
      error_message: errorMessage,
      stack_trace: stackTrace,
      timestamp: new Date().toISOString(),
    });
  }
}
```

### 2. React 컴포넌트에서 사용

```typescript
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { EventTracker } from './analytics';

export const PageTracker: React.FC = () => {
  const location = useLocation();

  useEffect(() => {
    // 페이지 변경 시 추적
    EventTracker.trackPageView(location.pathname, {
      url: location.pathname,
    });
  }, [location.pathname]);

  return null;
};

// 클릭 이벤트 추적
export const TrackableButton: React.FC<{
  onClick?: () => void;
  trackingName: string;
  children: React.ReactNode;
}> = ({ onClick, trackingName, children }) => {
  const handleClick = () => {
    EventTracker.trackClick(trackingName);
    onClick?.();
  };

  return <button onClick={handleClick}>{children}</button>;
};
```

## 사용자 프로필 관리

```typescript
interface UserProfile {
  email: string;
  name: string;
  plan: 'free' | 'pro' | 'enterprise';
  sign_up_date: string;
  organization?: string;
}

export class UserAnalytics {
  static setUserProfile(userId: string, profile: UserProfile) {
    // 사용자 식별
    Analytics.identify(userId, {
      $email: profile.email,
      $name: profile.name,
      $created: profile.sign_up_date,
      plan: profile.plan,
      organization: profile.organization,
    });
  }

  static updateUserProfile(updates: Record<string, any>) {
    mixpanel.people.set(updates);
  }

  static trackSubscription(
    plan: string,
    price: number,
    currency: string,
    billingCycle: string
  ) {
    mixpanel.track('Subscription', {
      plan,
      price,
      currency,
      billing_cycle: billingCycle,
      timestamp: new Date().toISOString(),
    });

    // 사용자 프로필 업데이트
    mixpanel.people.set({
      plan,
      subscription_price: price,
      subscription_date: new Date().toISOString(),
    });
  }

  static trackChurn(reason?: string) {
    mixpanel.track('Churn', {
      reason: reason || 'unknown',
      timestamp: new Date().toISOString(),
    });

    mixpanel.people.set({
      $ignore: true, // 더 이상 추적하지 않음
    });
  }
}
```

## 퍼널 분석

```typescript
interface FunnelStep {
  name: string;
  properties?: Record<string, any>;
}

export class FunnelTracker {
  static trackFunnelStep(step: FunnelStep) {
    mixpanel.track(`Funnel - ${step.name}`, {
      funnel_step: step.name,
      timestamp: new Date().toISOString(),
      ...step.properties,
    });
  }

  // 자산 업로드 퍼널
  static trackUploadFunnel(step: 'started' | 'file_selected' | 'info_entered' | 'completed') {
    const stepMap = {
      started: 'Upload Started',
      file_selected: 'File Selected',
      info_entered: 'Asset Info Entered',
      completed: 'Upload Completed',
    };

    this.trackFunnelStep({
      name: stepMap[step],
      properties: {
        funnel_type: 'asset_upload',
      },
    });
  }

  // 결제 퍼널
  static trackCheckoutFunnel(
    step: 'cart_viewed' | 'checkout_started' | 'payment_info_entered' | 'order_completed'
  ) {
    const stepMap = {
      cart_viewed: 'Cart Viewed',
      checkout_started: 'Checkout Started',
      payment_info_entered: 'Payment Info Entered',
      order_completed: 'Order Completed',
    };

    this.trackFunnelStep({
      name: stepMap[step],
      properties: {
        funnel_type: 'checkout',
      },
    });
  }

  // 공유 퍼널
  static trackShareFunnel(
    step: 'share_button_clicked' | 'link_generated' | 'shared',
    assetId?: string
  ) {
    const stepMap = {
      share_button_clicked: 'Share Button Clicked',
      link_generated: 'Link Generated',
      shared: 'Asset Shared',
    };

    this.trackFunnelStep({
      name: stepMap[step],
      properties: {
        funnel_type: 'sharing',
        asset_id: assetId,
      },
    });
  }
}
```

## 세션 분석

```typescript
export class SessionAnalytics {
  private static sessionStartTime: number = Date.now();
  private static sessionProperties: Record<string, any> = {};

  static startSession(properties?: Record<string, any>) {
    this.sessionStartTime = Date.now();
    this.sessionProperties = {
      device_type: this.getDeviceType(),
      browser: this.getBrowserInfo(),
      ...properties,
    };
  }

  static trackSessionEvent(
    eventName: string,
    properties?: Record<string, any>
  ) {
    const sessionDuration = Date.now() - this.sessionStartTime;

    mixpanel.track(eventName, {
      session_duration_ms: sessionDuration,
      ...this.sessionProperties,
      ...properties,
    });
  }

  static endSession() {
    const sessionDuration = Date.now() - this.sessionStartTime;

    mixpanel.track('Session Ended', {
      session_duration_ms: sessionDuration,
      session_duration_seconds: Math.floor(sessionDuration / 1000),
      ...this.sessionProperties,
    });
  }

  private static getDeviceType(): string {
    const ua = navigator.userAgent;
    if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)) {
      return 'Mobile';
    }
    return 'Desktop';
  }

  private static getBrowserInfo(): string {
    const ua = navigator.userAgent;
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Safari')) return 'Safari';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Edge')) return 'Edge';
    return 'Other';
  }
}
```

## A/B 테스팅

```typescript
export class ABTesting {
  static async assignVariant(
    experimentId: string,
    variants: string[]
  ): Promise<string> {
    // 사용자의 일관된 변형 결정 (해시 기반)
    const userId = mixpanel.get_distinct_id();
    const combined = `${experimentId}-${userId}`;

    // 간단한 해시 함수
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      hash = ((hash << 5) - hash) + combined.charCodeAt(i);
      hash = hash & hash; // 32비트 정수 변환
    }

    const variantIndex = Math.abs(hash) % variants.length;
    return variants[variantIndex];
  }

  static trackExperiment(
    experimentId: string,
    variant: string,
    properties?: Record<string, any>
  ) {
    mixpanel.track('Experiment Assigned', {
      experiment_id: experimentId,
      variant,
      timestamp: new Date().toISOString(),
      ...properties,
    });

    // 사용자 프로필에도 기록
    mixpanel.people.set({
      [`experiment_${experimentId}`]: variant,
    });
  }

  static trackExperimentConversion(
    experimentId: string,
    variant: string,
    conversionType: string,
    value?: number
  ) {
    mixpanel.track('Experiment Conversion', {
      experiment_id: experimentId,
      variant,
      conversion_type: conversionType,
      conversion_value: value,
      timestamp: new Date().toISOString(),
    });
  }
}
```

### A/B 테스팅 구현

```typescript
import { useEffect, useState } from 'react';

export const CheckoutABTest: React.FC = () => {
  const [variant, setVariant] = useState<string | null>(null);

  useEffect(() => {
    const assignVariant = async () => {
      const assignedVariant = await ABTesting.assignVariant(
        'checkout-redesign',
        ['control', 'treatment']
      );

      setVariant(assignedVariant);
      ABTesting.trackExperiment('checkout-redesign', assignedVariant);
    };

    assignVariant();
  }, []);

  if (!variant) return <div>로딩 중...</div>;

  return (
    <div>
      {variant === 'control' ? (
        <OldCheckout />
      ) : (
        <NewCheckout />
      )}
    </div>
  );
};

const OldCheckout: React.FC = () => (
  <div>
    <h2>결제하기</h2>
    {/* 기존 디자인 */}
  </div>
);

const NewCheckout: React.FC = () => (
  <div className="new-checkout">
    <h2>결제 완료</h2>
    {/* 새로운 디자인 */}
  </div>
);
```

## 커스텀 이벤트

```typescript
export class CustomEvents {
  static trackAssetInteraction(
    assetId: string,
    action: 'viewed' | 'liked' | 'commented' | 'shared',
    duration?: number
  ) {
    mixpanel.track('Asset Interaction', {
      asset_id: assetId,
      action,
      duration,
      timestamp: new Date().toISOString(),
    });
  }

  static trackCollaborationEvent(
    collaborationId: string,
    action: 'created' | 'joined' | 'shared' | 'completed',
    participantCount?: number
  ) {
    mixpanel.track('Collaboration Event', {
      collaboration_id: collaborationId,
      action,
      participant_count: participantCount,
      timestamp: new Date().toISOString(),
    });
  }

  static trackPerformanceMetric(
    metricName: string,
    value: number,
    unit: string
  ) {
    mixpanel.track('Performance Metric', {
      metric_name: metricName,
      value,
      unit,
      timestamp: new Date().toISOString(),
    });
  }

  static trackFeatureUsage(
    featureName: string,
    usageType: 'enabled' | 'disabled' | 'customized',
    configuration?: Record<string, any>
  ) {
    mixpanel.track('Feature Usage', {
      feature_name: featureName,
      usage_type: usageType,
      configuration,
      timestamp: new Date().toISOString(),
    });
  }
}
```

## 고급 기능

### 1. Super Properties (전역 속성)

```typescript
export class GlobalProperties {
  static setSuperProperties(properties: Record<string, any>) {
    mixpanel.register(properties);
  }

  static setSuperPropertiesPersistent(properties: Record<string, any>) {
    // 장기간 유지할 속성
    mixpanel.register_once(properties);
  }

  static clearSuperProperties() {
    mixpanel.unregister('property_name');
  }

  static initializeSessionProperties() {
    mixpanel.register({
      app_version: process.env.REACT_APP_VERSION,
      environment: process.env.NODE_ENV,
      session_start_time: new Date().toISOString(),
    });
  }
}
```

### 2. 그룹 분석

```typescript
export class GroupAnalytics {
  static setUserGroup(
    groupId: string,
    groupName: string,
    properties?: Record<string, any>
  ) {
    // 사용자를 그룹에 추가
    mixpanel.set_group('organization', groupId);

    // 그룹 프로필 설정
    mixpanel.get_group('organization', groupId).set({
      $name: groupName,
      ...properties,
    });
  }

  static trackGroupEvent(
    groupId: string,
    eventName: string,
    properties?: Record<string, any>
  ) {
    mixpanel.track(eventName, {
      group_id: groupId,
      ...properties,
    });
  }
}
```

### 3. Revenue 추적

```typescript
export class RevenueTracking {
  static trackPurchase(
    transactionId: string,
    amount: number,
    currency: string,
    items: Array<{ name: string; price: number; quantity: number }>
  ) {
    mixpanel.track('Purchase', {
      transaction_id: transactionId,
      amount,
      currency,
      items,
      timestamp: new Date().toISOString(),
    });

    // 사용자의 생명 시간 가치 업데이트
    mixpanel.people.append({
      $transactions: {
        $append: {
          transaction_id: transactionId,
          amount,
          timestamp: new Date().toISOString(),
        },
      },
    });
  }

  static trackRefund(transactionId: string, amount: number) {
    mixpanel.track('Refund', {
      transaction_id: transactionId,
      refund_amount: amount,
      timestamp: new Date().toISOString(),
    });
  }
}
```

## 데이터 수집 모범 사례

```typescript
// 🚫 피해야 할 방법
mixpanel.track('Event');
mixpanel.track('event', { data: userData }); // 민감한 정보

// ✅권장 방법
mixpanel.track('Asset Downloaded', {
  asset_id: assetId,
  asset_type: assetType,
  file_size: Math.round(fileSize / 1024), // KB 단위
});

// ✅ 일관된 네이밍
EventTracker.trackDownload(
  assetId,
  assetName,
  assetType
);

// ✅ 타임스탐프 포함
mixpanel.track('User Action', {
  timestamp: new Date().toISOString(),
});
```

## 결론

Mixpanel을 효과적으로 사용하면:

1. **사용자 행동 이해**: 사용자가 어떻게 상품을 사용하는지 파악
2. **퍼널 분석**: 전환 경로에서의 이탈 지점 식별
3. **A/B 테스팅**: 데이터 기반의 의사결정
4. **세션 분석**: 사용자 세션의 특성 파악
5. **수익 추적**: 수익화 메트릭 모니터링

이러한 데이터를 바탕으로 더 나은 사용자 경험을 제공할 수 있습니다.
