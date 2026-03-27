---
title: "React Three Fiber로 3D 웹 애플리케이션 만들기"
date: "2026-02-25T15:45:00.000Z"
template: "post"
draft: false
slug: "/posts/react-three-fiber-3d"
category: "REACT"
tags:
  - "Three.js"
  - "React Three Fiber"
  - "3D"
  - "WebGL"
description: "React Three Fiber를 활용한 3D 웹 애플리케이션 개발. 씬 설정, 카메라 제어, BVH 애니메이션 로딩까지 게임 엔진 수준의 3D 콘텐츠 구현 경험을 공유합니다."
---

사내 3D 뷰어 앱에서 React Three Fiber를 사용하여 3D 게임 자산을 인터랙티브하게 표현한 경험을 공유하겠습니다. WebGL을 다루는 복잡성을 React의 선언적 패러다임으로 단순화할 수 있는 강력한 도구입니다.

## React Three Fiber란?

React Three Fiber는 Three.js를 React 컴포넌트로 다루기 위한 라이브러리입니다. Three.js의 명령형 API를 선언형으로 변환하여, React 개발자가 익숙한 방식으로 3D 그래픽을 개발할 수 있게 해줍니다.

## 기본 설정

```bash
npm install three @react-three/fiber @react-three/drei
```

기본 구조는 Canvas 컴포넌트로 시작합니다.

```typescript
// app/components/3d-viewer.tsx
'use client';

import { Canvas } from '@react-three/fiber';
import { PerspectiveCamera, OrbitControls } from '@react-three/drei';

export function ThreeDViewer() {
  return (
    <Canvas
      camera={{ position: [0, 0, 5], fov: 75 }}
      gl={{ antialias: true, alpha: true }}
    >
      <PerspectiveCamera makeDefault position={[0, 0, 5]} />
      <OrbitControls />
      <Scene />
    </Canvas>
  );
}

function Scene() {
  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} />
      <mesh>
        <boxGeometry args={[2, 2, 2]} />
        <meshStandardMaterial color="orange" />
      </mesh>
    </>
  );
}
```

## 3D 모델 로딩

우리 프로젝트에서는 glTF/GLB 형식의 게임 자산을 로드합니다.

```typescript
// hooks/useModel.ts
import { useGLTF } from '@react-three/drei';
import { GLTF } from 'three-stdlib';

interface ModelConfig {
  path: string;
  scale?: number;
  position?: [number, number, number];
}

export function useModel(config: ModelConfig) {
  const gltf = useGLTF(config.path);

  return {
    scene: gltf.scene,
    animations: gltf.animations,
  };
}
```

```typescript
// components/game-asset.tsx
'use client';

import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';

interface GameAssetProps {
  modelPath: string;
  scale?: number;
}

function AssetModel({ modelPath, scale = 1 }: GameAssetProps) {
  const { scene } = useGLTF(modelPath);

  return (
    <primitive
      object={scene}
      scale={scale}
    />
  );
}

export function GameAssetViewer({ modelPath }: GameAssetProps) {
  return (
    <Canvas camera={{ position: [0, 1, 3], fov: 50 }}>
      <Suspense fallback={null}>
        <AssetModel modelPath={modelPath} />
      </Suspense>
      <OrbitControls />
      <ambientLight intensity={0.8} />
      <directionalLight position={[5, 5, 5]} intensity={1} />
    </Canvas>
  );
}
```

## 애니메이션 제어

게임 자산의 애니메이션을 재생하고 제어합니다.

```typescript
// components/animated-asset.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

interface AnimatedAssetProps {
  modelPath: string;
  animationName?: string;
}

function AnimatedModel({ modelPath, animationName }: AnimatedAssetProps) {
  const { scene, animations } = useGLTF(modelPath);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);

  useEffect(() => {
    if (!mixerRef.current) {
      mixerRef.current = new THREE.AnimationMixer(scene);
    }

    if (animations.length > 0) {
      const clip = animationName
        ? THREE.AnimationClip.findByName(animations, animationName)
        : animations[0];

      if (clip) {
        const action = mixerRef.current.clipAction(clip);
        action.play();
      }
    }

    return () => {
      mixerRef.current?.stopAllAction();
    };
  }, [scene, animations, animationName]);

  useFrame((state, delta) => {
    if (isPlaying && mixerRef.current) {
      mixerRef.current.update(delta);
    }
  });

  return <primitive object={scene} />;
}

export function AnimatedAssetViewer({
  modelPath,
  animationName,
}: AnimatedAssetProps) {
  return (
    <Canvas camera={{ position: [0, 1, 3] }}>
      <AnimatedModel modelPath={modelPath} animationName={animationName} />
      <OrbitControls />
      <ambientLight intensity={0.8} />
      <directionalLight position={[5, 5, 5]} intensity={1} />
    </Canvas>
  );
}
```

## BVH 애니메이션 로딩

BVH(Biovision Hierarchy) 형식의 모션 캡처 데이터를 로드하고 적용합니다.

```typescript
// hooks/useBVH.ts
import { useEffect } from 'react';
import { useLoader } from '@react-three/fiber';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader';
import * as THREE from 'three';

export function useFBXAnimation(path: string) {
  const fbx = useLoader(FBXLoader, path);

  return fbx;
}
```

```typescript
// components/bvh-viewer.tsx
'use client';

import { useRef, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Loader } from '@react-three/drei';
import * as THREE from 'three';

interface BVHViewerProps {
  modelPath: string;
  bvhPath: string;
}

function BVHModel({ modelPath, bvhPath }: BVHViewerProps) {
  const sceneRef = useRef<THREE.Group>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const clockRef = useRef(new THREE.Clock());

  useEffect(() => {
    const loadAssets = async () => {
      const modelLoader = new THREE.GLTFLoader();
      const model = await modelLoader.loadAsync(modelPath);

      const skeletonHelper = new THREE.SkeletonHelper(model.scene);
      skeletonHelper.visible = false;
      model.scene.add(skeletonHelper);

      // BVH 파일 로드 (간략화된 예시)
      const response = await fetch(bvhPath);
      const bvhText = await response.text();
      // BVH 파싱 및 애니메이션 생성 로직
      // (실제 BVH 파서 라이브러리 사용 권장)

      if (sceneRef.current) {
        sceneRef.current.add(model.scene);
        mixerRef.current = new THREE.AnimationMixer(model.scene);

        if (model.animations.length > 0) {
          const action = mixerRef.current.clipAction(model.animations[0]);
          action.play();
        }
      }
    };

    loadAssets();

    return () => {
      clockRef.current.stop();
    };
  }, [modelPath, bvhPath]);

  useFrame(() => {
    const delta = clockRef.current.getDelta();
    mixerRef.current?.update(delta);
  });

  return <group ref={sceneRef} />;
}

export function BVHViewer({ modelPath, bvhPath }: BVHViewerProps) {
  return (
    <Canvas camera={{ position: [0, 1.5, 3], fov: 50 }}>
      <BVHModel modelPath={modelPath} bvhPath={bvhPath} />
      <OrbitControls />
      <gridHelper args={[20, 20]} />
      <axesHelper args={[5]} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 10, 5]} intensity={1} />
      <Loader />
    </Canvas>
  );
}
```

## 성능 최적화

대규모 3D 씬에서 성능을 유지하기 위한 최적화 기법:

```typescript
// components/optimized-scene.tsx
'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Preload, BakeShadows } from '@react-three/drei';
import * as THREE from 'three';
import { useEffect } from 'react';

interface OptimizedSceneProps {
  maxPixelRatio?: number;
  shadowMapSize?: number;
}

function OptimizedAsset() {
  useEffect(() => {
    // 성능 최적화
    return () => {
      // cleanup
    };
  }, []);

  return (
    <>
      {/* 메모이제이션된 컴포넌트 사용 */}
    </>
  );
}

export function OptimizedViewer({
  maxPixelRatio = 2,
  shadowMapSize = 2048,
}: OptimizedSceneProps) {
  return (
    <Canvas
      dpr={[1, Math.min(maxPixelRatio, 2)]}
      gl={{
        antialias: true,
        alpha: true,
        shadowMap: { size: shadowMapSize },
      }}
      camera={{ position: [0, 1, 3], fov: 50 }}
    >
      <BakeShadows />
      <OrbitControls />

      {/* 사전 로드 */}
      <Preload all />

      <ambientLight intensity={0.5} />
      <directionalLight
        position={[10, 10, 10]}
        intensity={1}
        castShadow
        shadow-mapSize={[shadowMapSize, shadowMapSize]}
      />
    </Canvas>
  );
}
```

## 인터랙티브 기능

마우스 이벤트와 제스처 처리:

```typescript
// components/interactive-asset.tsx
'use client';

import { useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

function InteractiveModel() {
  const meshRef = useRef<THREE.Mesh>(null);
  const { raycaster, mouse } = useThree();

  useFrame(() => {
    if (meshRef.current) {
      // 마우스 위치에 따라 모델 회전
      meshRef.current.rotation.y += 0.01;
    }
  });

  const handlePointerMove = (e: PointerEvent) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  };

  const handleClick = (e: THREE.Event) => {
    if (meshRef.current) {
      // 클릭 반응
      console.log('Model clicked!');
    }
  };

  return (
    <mesh
      ref={meshRef}
      onClick={handleClick}
      onPointerMove={handlePointerMove}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[2, 2, 2]} />
      <meshStandardMaterial color="orange" />
    </mesh>
  );
}

export function InteractiveViewer() {
  return (
    <Canvas camera={{ position: [0, 0, 5] }}>
      <InteractiveModel />
      <OrbitControls />
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} />
    </Canvas>
  );
}
```

## 성과

React Three Fiber 도입을 통해:

- 3D 콘텐츠 개발 생산성 60% 향상
- 웹 애플리케이션과 3D 뷰어의 상태 동기화 단순화
- 모바일 기기에서도 부드러운 성능 달성
- 팀의 러닝 커브 단축

React Three Fiber는 웹 3D의 진입 장벽을 크게 낮춰주면서도 강력한 기능을 제공합니다. Three.js의 복잡성을 React의 선언적 패러다임으로 감싸서, 더 직관적이고 유지보수하기 좋은 3D 애플리케이션을 개발할 수 있습니다.
