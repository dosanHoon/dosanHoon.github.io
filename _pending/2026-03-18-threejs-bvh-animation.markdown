---
title: "Three.js로 모션캡처 BVH 애니메이션 시각화"
date: "2026-03-18T15:20:00.000Z"
template: "post"
draft: false
slug: "/posts/threejs-bvh-animation"
category: "JAVASCRIPT"
tags:
  - "Three.js"
  - "BVH"
  - "Animation"
  - "Motion Capture"
description: "사내 3D 뷰어 프로젝트에서 Three.js를 사용하여 BVH 파일의 모션캡처 데이터를 파싱하고, 스켈레톤을 렌더링하며, 애니메이션을 재생하는 방법을 설명합니다."
---

## 소개

사내 3D 뷰어 프로젝트에서는 모션캡처 데이터(BVH 파일)를 웹에서 시각화하는 기능을 구현했습니다. 이 글에서는 BVH 파일 파싱, Three.js 스켈레톤 렌더링, 애니메이션 재생, GIF 내보내기까지의 전체 과정을 설명합니다.

## BVH 파일 형식 이해

BVH(Biovision Hierarchy)는 모션캡처 데이터 저장을 위한 표준 형식입니다.

```
HIERARCHY
ROOT Hips
{
  OFFSET 0.000000 0.000000 0.000000
  CHANNELS 6 Xposition Yposition Zposition Xrotation Yrotation Zrotation
  JOINT Chest
  {
    OFFSET 0.000000 5.000000 0.000000
    CHANNELS 3 Xrotation Yrotation Zrotation
    JOINT LeftShoulder
    {
      OFFSET -5.000000 8.000000 0.000000
      CHANNELS 3 Xrotation Yrotation Zrotation
      End Site
      {
        OFFSET -10.000000 0.000000 0.000000
      }
    }
  }
}

MOTION
Frames: 100
Frame Time: 0.033333
23.5000 12.3000 8.7000 -5.2000 2.1000 1.5000 ...
...
```

## BVH 파서 구현

```typescript
interface BVHBone {
  name: string;
  offset: [number, number, number];
  channels: string[];
  children: BVHBone[];
  index?: number;
}

interface BVHData {
  hierarchy: BVHBone;
  motion: {
    frameTime: number;
    frames: number[][];
  };
}

export class BVHParser {
  static parse(content: string): BVHData {
    const lines = content.split('\n').filter(line => line.trim());
    let lineIndex = 0;

    // HIERARCHY 섹션 파싱
    const hierarchy = this.parseHierarchy(lines, lineIndex);
    lineIndex = this.findLineIndex(lines, 'MOTION');

    // MOTION 섹션 파싱
    const motion = this.parseMotion(lines, lineIndex);

    return { hierarchy, motion };
  }

  private static parseHierarchy(
    lines: string[],
    startIndex: number,
    parent?: BVHBone
  ): BVHBone {
    let index = startIndex;

    // ROOT 또는 JOINT 찾기
    const headerMatch = lines[index].match(/^(ROOT|JOINT)\s+(\w+)/);
    if (!headerMatch) throw new Error('Invalid BVH format');

    const [, type, name] = headerMatch;
    const bone: BVHBone = {
      name,
      offset: [0, 0, 0],
      channels: [],
      children: []
    };

    index++;

    // { 찾기
    if (!lines[index].includes('{')) {
      throw new Error('Expected {');
    }
    index++;

    // OFFSET 파싱
    const offsetMatch = lines[index].match(/^OFFSET\s+([\d\-\.]+)\s+([\d\-\.]+)\s+([\d\-\.]+)/);
    if (offsetMatch) {
      bone.offset = [
        parseFloat(offsetMatch[1]),
        parseFloat(offsetMatch[2]),
        parseFloat(offsetMatch[3])
      ];
      index++;
    }

    // CHANNELS 파싱
    const channelsMatch = lines[index].match(/^CHANNELS\s+(\d+)(.*)/);
    if (channelsMatch) {
      const channelCount = parseInt(channelsMatch[1]);
      bone.channels = channelsMatch[2].trim().split(/\s+/);
      index++;
    }

    // 자식 노드 파싱
    while (index < lines.length && !lines[index].includes('}')) {
      if (lines[index].match(/^(JOINT|End\s+Site)/)) {
        if (lines[index].includes('End Site')) {
          // End Site 처리
          index++; // {
          index++; // OFFSET
          index++; // }
        } else {
          // 자식 JOINT 파싱 (재귀)
          const childResult = this.parseHierarchy(lines, index, bone);
          bone.children.push(childResult);
          // 인덱스 업데이트는 별도 로직 필요
          index = this.findClosingBrace(lines, index) + 1;
        }
      } else {
        index++;
      }
    }

    return bone;
  }

  private static parseMotion(
    lines: string[],
    startIndex: number
  ) {
    let index = startIndex;

    // "Frames:" 라인 찾기
    while (index < lines.length && !lines[index].startsWith('Frames:')) {
      index++;
    }
    const frameCount = parseInt(lines[index].split(':')[1].trim());
    index++;

    // "Frame Time:" 라인
    const frameTimeMatch = lines[index].match(/Frame\s+Time:\s+([\d\.]+)/);
    const frameTime = frameTimeMatch ? parseFloat(frameTimeMatch[1]) : 0.033333;
    index++;

    // 모션 데이터 파싱
    const frames: number[][] = [];
    while (index < lines.length && frames.length < frameCount) {
      const frameLine = lines[index].trim();
      if (frameLine && !frameLine.startsWith('Frames')) {
        frames.push(frameLine.split(/\s+/).map(Number));
      }
      index++;
    }

    return { frameTime, frames };
  }

  private static findLineIndex(lines: string[], keyword: string): number {
    return lines.findIndex(line => line.startsWith(keyword));
  }

  private static findClosingBrace(lines: string[], startIndex: number): number {
    let braceCount = 1;
    for (let i = startIndex + 1; i < lines.length; i++) {
      if (lines[i].includes('{')) braceCount++;
      if (lines[i].includes('}')) braceCount--;
      if (braceCount === 0) return i;
    }
    return -1;
  }
}
```

## Three.js 스켈레톤 렌더링

```typescript
import * as THREE from 'three';

export class BVHAnimator {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  bones: Map<string, THREE.Bone> = new Map();
  skeleton: THREE.Skeleton | null = null;
  mixer: THREE.AnimationMixer | null = null;
  currentFrame = 0;
  isPlaying = false;

  constructor(container: HTMLElement) {
    // 장면 설정
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xffffff);

    // 카메라 설정
    this.camera = new THREE.PerspectiveCamera(
      75,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 100, 200);
    this.camera.lookAt(0, 0, 0);

    // 렌더러 설정
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.shadowMap.enabled = true;
    container.appendChild(this.renderer.domElement);

    // 조명
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(100, 200, 100);
    light.castShadow = true;
    this.scene.add(light);

    const ambientLight = new THREE.AmbientLight(0x404040);
    this.scene.add(ambientLight);

    // 바닥
    const groundGeometry = new THREE.PlaneGeometry(500, 500);
    const groundMaterial = new THREE.MeshLambertMaterial({ color: 0xcccccc });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    this.animate();
  }

  createSkeletonFromBVH(bvhData: BVHData) {
    // 본 생성
    const rootBone = this.createBone(bvhData.hierarchy);
    this.scene.add(rootBone);

    // 스켈레톤 생성
    const boneArray = Array.from(this.bones.values());
    this.skeleton = new THREE.Skeleton(boneArray);

    // 본 헬퍼 (시각화)
    const skeletonHelper = new THREE.SkeletonHelper(rootBone);
    this.scene.add(skeletonHelper);
  }

  private createBone(bvhBone: BVHBone, parent?: THREE.Bone): THREE.Bone {
    const bone = new THREE.Bone();
    bone.name = bvhBone.name;
    bone.position.set(
      bvhBone.offset[0],
      bvhBone.offset[1],
      bvhBone.offset[2]
    );

    this.bones.set(bvhBone.name, bone);

    // 자식 본 생성
    for (const childBvhBone of bvhBone.children) {
      const childBone = this.createBone(childBvhBone, bone);
      bone.add(childBone);
    }

    return bone;
  }

  updatePose(bvhData: BVHData, frameIndex: number) {
    if (frameIndex >= bvhData.motion.frames.length) {
      frameIndex = bvhData.motion.frames.length - 1;
    }

    const frameData = bvhData.motion.frames[frameIndex];
    let dataIndex = 0;

    this.updateBonePose(
      bvhData.hierarchy,
      frameData,
      dataIndex
    );
  }

  private updateBonePose(
    bvhBone: BVHBone,
    frameData: number[],
    dataIndex: number
  ): number {
    const bone = this.bones.get(bvhBone.name);
    if (!bone) return dataIndex;

    // 위치 업데이트 (ROOT만)
    if (bvhBone.name === 'Hips') {
      bone.position.x = frameData[dataIndex++];
      bone.position.y = frameData[dataIndex++];
      bone.position.z = frameData[dataIndex++];
    }

    // 회전 업데이트
    const euler = new THREE.Euler();
    for (const channel of bvhBone.channels) {
      if (channel.startsWith('X')) {
        euler.x = THREE.MathUtils.degToRad(frameData[dataIndex++]);
      } else if (channel.startsWith('Y')) {
        euler.y = THREE.MathUtils.degToRad(frameData[dataIndex++]);
      } else if (channel.startsWith('Z')) {
        euler.z = THREE.MathUtils.degToRad(frameData[dataIndex++]);
      }
    }
    bone.quaternion.setFromEuler(euler);

    // 자식 본 업데이트
    for (const childBone of bvhBone.children) {
      dataIndex = this.updateBonePose(childBone, frameData, dataIndex);
    }

    return dataIndex;
  }

  playAnimation(bvhData: BVHData, speed: number = 1) {
    this.isPlaying = true;
    const frameTime = bvhData.motion.frameTime / speed;

    const animationLoop = () => {
      if (!this.isPlaying) return;

      this.updatePose(bvhData, this.currentFrame);
      this.currentFrame++;

      if (this.currentFrame >= bvhData.motion.frames.length) {
        this.currentFrame = 0;
      }

      setTimeout(() => {
        requestAnimationFrame(animationLoop);
      }, frameTime * 1000);
    };

    animationLoop();
  }

  pauseAnimation() {
    this.isPlaying = false;
  }

  stopAnimation() {
    this.isPlaying = false;
    this.currentFrame = 0;
  }

  private animate() {
    requestAnimationFrame(() => this.animate());
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.renderer.dispose();
  }
}
```

## React 통합

```typescript
import { useEffect, useRef } from 'react';

interface BVHViewerProps {
  bvhFile: File;
  autoPlay?: boolean;
}

export const BVHViewer: React.FC<BVHViewerProps> = ({
  bvhFile,
  autoPlay = true
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const animatorRef = useRef<BVHAnimator | null>(null);
  const bvhDataRef = useRef<BVHData | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // BVH 파일 읽기
    const reader = new FileReader();
    reader.onload = (e) => {
      if (!e.target?.result) return;

      const content = e.target.result as string;
      const bvhData = BVHParser.parse(content);
      bvhDataRef.current = bvhData;

      // 애니메이터 생성
      animatorRef.current = new BVHAnimator(containerRef.current!);
      animatorRef.current.createSkeletonFromBVH(bvhData);

      if (autoPlay) {
        animatorRef.current.playAnimation(bvhData);
      }
    };

    reader.readAsText(bvhFile);

    return () => {
      if (animatorRef.current) {
        animatorRef.current.dispose();
      }
    };
  }, [bvhFile, autoPlay]);

  return (
    <div className="space-y-4">
      <div
        ref={containerRef}
        className="w-full h-[600px] border rounded-lg"
      />
      <div className="flex gap-2">
        <button
          onClick={() => {
            if (animatorRef.current && bvhDataRef.current) {
              animatorRef.current.playAnimation(bvhDataRef.current);
            }
          }}
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          재생
        </button>
        <button
          onClick={() => animatorRef.current?.pauseAnimation()}
          className="px-4 py-2 bg-yellow-500 text-white rounded"
        >
          일시정지
        </button>
        <button
          onClick={() => animatorRef.current?.stopAnimation()}
          className="px-4 py-2 bg-red-500 text-white rounded"
        >
          정지
        </button>
      </div>
    </div>
  );
};
```

## GIF 내보내기

```typescript
import GIF from 'gif.js';

export class BVHGIFExporter {
  static async exportToGIF(
    bvhData: BVHData,
    animator: BVHAnimator,
    width: number = 800,
    height: number = 600,
    frameCount?: number
  ): Promise<Blob> {
    return new Promise((resolve) => {
      const gif = new GIF({
        workers: 2,
        quality: 10,
        width,
        height,
        workerScript: 'gif.worker.js'
      });

      const totalFrames = frameCount || bvhData.motion.frames.length;

      // 각 프레임 캡처
      for (let i = 0; i < totalFrames; i++) {
        animator.updatePose(bvhData, i);
        animator.renderer.render(animator.scene, animator.camera);

        // Canvas를 이미지로 변환
        const canvas = animator.renderer.domElement;
        gif.addFrame(canvas, { delay: 33 });
      }

      gif.on('finished', (blob: Blob) => {
        resolve(blob);
      });

      gif.render();
    });
  }

  static downloadGIF(blob: Blob, filename: string = 'animation.gif') {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
```

## 최적화 팁

### 1. 큰 파일 처리

```typescript
// 스트리밍 파싱
class StreamingBVHParser {
  static *parseFrames(
    lines: string[],
    motionStartIndex: number
  ): Generator<number[]> {
    for (let i = motionStartIndex + 2; i < lines.length; i++) {
      const frameLine = lines[i].trim();
      if (frameLine) {
        yield frameLine.split(/\s+/).map(Number);
      }
    }
  }
}
```

### 2. 성능 최적화

```typescript
// 렌더링 최적화
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(width, height);

// 필요한 프레임만 업데이트
let lastUpdateTime = 0;
const updateInterval = frameTime * 1000;
```

## 결론

Three.js를 이용한 BVH 애니메이션 시각화:

1. **BVH 파싱**: 파일 형식 이해 및 데이터 추출
2. **스켈레톤 생성**: 계층 구조를 Three.js 본으로 변환
3. **애니메이션 재생**: 모션 데이터를 본 회전에 적용
4. **시각화**: 스켈레톤 헬퍼로 뼈대 표시
5. **내보내기**: GIF로 애니메이션 저장

이러한 기술을 활용하면 웹에서 모션캡처 데이터를 효과적으로 다룰 수 있습니다.
