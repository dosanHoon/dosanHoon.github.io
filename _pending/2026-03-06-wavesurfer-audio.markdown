---
title: "WaveSurfer.js로 오디오 플레이어 만들기"
date: "2026-03-06T09:00:00.000Z"
template: "post"
draft: false
slug: "/posts/wavesurfer-audio-player-guide"
category: "JAVASCRIPT"
tags:
  - "WaveSurfer.js"
  - "Audio"
  - "Web Audio API"
  - "Interactive UI"
description: "WaveSurfer.js를 이용한 고급 오디오 플레이어 개발 방법과 실시간 파형 시각화, 리전 관리 기능을 구현합니다."
---

## 소개

사내 다양한 프로젝트에서 오디오 관련 기능이 필요합니다. collab-platform와 3d-viewer-app 같은 프로젝트에서는 사용자가 오디오 파일을 재생하고 편집할 수 있어야 합니다. WaveSurfer.js는 Web Audio API를 기반으로 한 강력한 오디오 플레이어 라이브러리로, 파형 시각화와 상호작용을 제공합니다. 이 글에서는 실제 프로젝트에서 구현한 고급 오디오 플레이어를 소개하겠습니다.

## WaveSurfer.js 소개 및 설치

WaveSurfer.js는 HTML5 Web Audio API를 래핑한 라이브러리로, 브라우저에서 오디오를 파형으로 시각화할 수 있습니다.

```bash
# 설치
npm install wavesurfer.js

# 또는 pnpm
pnpm add wavesurfer.js
```

## 기본 오디오 플레이어 구현

```typescript
// components/AudioPlayer/AudioPlayer.tsx

import React, { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';

interface AudioPlayerProps {
  audioUrl: string;
  title?: string;
  onPlaybackStateChange?: (isPlaying: boolean) => void;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  audioUrl,
  title,
  onPlaybackStateChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  // WaveSurfer 초기화
  useEffect(() => {
    if (!containerRef.current) return;

    // 기존 인스턴스 정리
    if (wavesurferRef.current) {
      wavesurferRef.current.destroy();
    }

    // 새 인스턴스 생성
    wavesurferRef.current = WaveSurfer.create({
      container: containerRef.current,
      waveColor: '#3b82f6',
      progressColor: '#1e40af',
      cursorColor: '#1f2937',
      barWidth: 2,
      barHeight: 1,
      barRadius: 0,
      height: 80,
      normalize: true,
    });

    const wavesurfer = wavesurferRef.current;

    // 이벤트 리스너 등록
    wavesurfer.on('ready', () => {
      setDuration(wavesurfer.getDuration());
      setIsLoading(false);
    });

    wavesurfer.on('play', () => {
      setIsPlaying(true);
      onPlaybackStateChange?.(true);
    });

    wavesurfer.on('pause', () => {
      setIsPlaying(false);
      onPlaybackStateChange?.(false);
    });

    wavesurfer.on('timeupdate', (currentTime) => {
      setCurrentTime(currentTime);
    });

    // 오디오 파일 로드
    if (audioUrl) {
      setIsLoading(true);
      wavesurfer.load(audioUrl);
    }

    // 정리
    return () => {
      if (wavesurferRef.current) {
        wavesurferRef.current.destroy();
      }
    };
  }, [audioUrl, onPlaybackStateChange]);

  // 볼륨 변경
  useEffect(() => {
    if (wavesurferRef.current) {
      wavesurferRef.current.setVolume(volume);
    }
  }, [volume]);

  const handlePlayPause = () => {
    if (wavesurferRef.current) {
      wavesurferRef.current.playPause();
    }
  };

  const handleSeek = (percentage: number) => {
    if (wavesurferRef.current) {
      const time = (percentage / 100) * duration;
      wavesurferRef.current.seekTo(percentage / 100);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full bg-gray-900 rounded-lg p-6 text-white">
      {/* 제목 */}
      {title && <h3 className="text-lg font-semibold mb-4">{title}</h3>}

      {/* 파형 표시 영역 */}
      <div className="mb-4 bg-gray-800 rounded p-3">
        {isLoading && <div className="text-center text-sm text-gray-400">로드 중...</div>}
        <div ref={containerRef} />
      </div>

      {/* 시간 정보 */}
      <div className="flex justify-between text-sm text-gray-400 mb-4">
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>

      {/* 컨트롤 버튼 */}
      <div className="flex items-center gap-4 mb-4">
        <button
          onClick={handlePlayPause}
          disabled={isLoading}
          className="flex-shrink-0 w-12 h-12 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded-full flex items-center justify-center transition-colors"
        >
          {isPlaying ? (
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path d="M5.75 1.75A.75.75 0 017 1.5h2A.75.75 0 017 3H6v14h1a.75.75 0 010 1.5H7a.75.75 0 01-.75-.75V1.75zM13 1.5a.75.75 0 00-.75.75v14c0 .414.336.75.75.75h2a.75.75 0 000-1.5h-1V3h1a.75.75 0 000-1.5h-2z" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
            </svg>
          )}
        </button>

        {/* 볼륨 컨트롤 */}
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.172a1 1 0 011.414 0A6.972 6.972 0 0118 10a6.972 6.972 0 01-1.929 4.928 1 1 0 01-1.414-1.414A4.972 4.972 0 0016 10c0-1.713-.672-3.329-1.858-4.528a1 1 0 010-1.414zM12.95 5.05a1 1 0 011.414 0A3.987 3.987 0 0115 10a3.987 3.987 0 01-1.636 3.05 1 1 0 11-1.414-1.414A1.987 1.987 0 0013 10a1.987 1.987 0 00-.636-1.464 1 1 0 010-1.414z" />
          </svg>
          <input
            type="range"
            min="0"
            max="100"
            value={volume * 100}
            onChange={(e) => setVolume(parseInt(e.target.value) / 100)}
            className="w-20 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
          />
        </div>
      </div>

      {/* 프로그레스 바 */}
      <div
        className="h-1 bg-gray-700 rounded cursor-pointer hover:h-2 transition-all"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const percentage = ((e.clientX - rect.left) / rect.width) * 100;
          handleSeek(percentage);
        }}
      >
        <div
          className="h-full bg-blue-600 rounded"
          style={{ width: `${(currentTime / duration) * 100}%` }}
        />
      </div>
    </div>
  );
};
```

## 고급 기능: 리전(Region) 관리

```typescript
// components/AudioEditor/AudioEditorWithRegions.tsx

import React, { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions';

interface Region {
  id: string;
  start: number;
  end: number;
  label: string;
  color?: string;
}

interface AudioEditorProps {
  audioUrl: string;
  regions?: Region[];
  onRegionCreate?: (region: Region) => void;
  onRegionUpdate?: (region: Region) => void;
  onRegionDelete?: (regionId: string) => void;
}

export const AudioEditorWithRegions: React.FC<AudioEditorProps> = ({
  audioUrl,
  regions = [],
  onRegionCreate,
  onRegionUpdate,
  onRegionDelete,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const regionsPluginRef = useRef<any>(null);
  const [isCreatingRegion, setIsCreatingRegion] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);

  // WaveSurfer와 RegionsPlugin 초기화
  useEffect(() => {
    if (!containerRef.current) return;

    if (wavesurferRef.current) {
      wavesurferRef.current.destroy();
    }

    wavesurferRef.current = WaveSurfer.create({
      container: containerRef.current,
      waveColor: '#3b82f6',
      progressColor: '#1e40af',
      cursorColor: '#1f2937',
      height: 200,
      normalize: true,
    });

    // RegionsPlugin 추가
    regionsPluginRef.current = wavesurferRef.current.registerPlugin(
      RegionsPlugin.create()
    );

    const wavesurfer = wavesurferRef.current;
    const regionsPlugin = regionsPluginRef.current;

    // 리전 이벤트 리스너
    regionsPlugin.on('region-created', (region: any) => {
      const newRegion: Region = {
        id: region.id,
        start: region.start,
        end: region.end,
        label: `리전 ${new Date().getTime()}`,
      };
      onRegionCreate?.(newRegion);
    });

    regionsPlugin.on('region-updated', (region: any) => {
      const updatedRegion: Region = {
        id: region.id,
        start: region.start,
        end: region.end,
        label: region.label || 'Untitled',
      };
      onRegionUpdate?.(updatedRegion);
    });

    regionsPlugin.on('region-clicked', (region: any, _e: any) => {
      setSelectedRegion(region.id);
      wavesurfer.setTime(region.start);
    });

    // 기존 리전 추가
    regions.forEach((region) => {
      regionsPlugin.addRegion({
        id: region.id,
        start: region.start,
        end: region.end,
        label: region.label,
        color: region.color || `hsla(${Math.random() * 360}, 100%, 50%, 0.3)`,
        drag: true,
        resize: true,
      });
    });

    wavesurfer.load(audioUrl);

    // 클릭으로 리전 생성
    const handleClick = () => {
      if (isCreatingRegion) {
        const time = wavesurfer.getCurrentTime();
        regionsPlugin.addRegion({
          start: Math.max(0, time - 1),
          end: Math.min(wavesurfer.getDuration(), time + 1),
          color: `hsla(${Math.random() * 360}, 100%, 50%, 0.3)`,
        });
        setIsCreatingRegion(false);
      }
    };

    wavesurfer.on('click', handleClick);

    return () => {
      if (wavesurferRef.current) {
        wavesurferRef.current.destroy();
      }
    };
  }, [audioUrl, onRegionCreate, onRegionUpdate]);

  const handleDeleteRegion = (regionId: string) => {
    if (regionsPluginRef.current) {
      const region = regionsPluginRef.current.getRegions().find(
        (r: any) => r.id === regionId
      );
      if (region) {
        region.remove();
        onRegionDelete?.(regionId);
      }
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* 파형 표시 */}
      <div className="bg-gray-900 rounded-lg p-4">
        <div ref={containerRef} />
      </div>

      {/* 컨트롤 버튼 */}
      <div className="flex gap-2">
        <button
          onClick={() => setIsCreatingRegion(!isCreatingRegion)}
          className={`px-4 py-2 rounded font-medium transition-colors ${
            isCreatingRegion
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {isCreatingRegion ? '취소' : '리전 추가'}
        </button>

        {selectedRegion && (
          <button
            onClick={() => handleDeleteRegion(selectedRegion)}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-medium transition-colors"
          >
            선택한 리전 삭제
          </button>
        )}
      </div>

      {/* 리전 목록 */}
      <div className="space-y-2">
        <h3 className="font-semibold">리전 목록</h3>
        {regions.map((region) => (
          <div
            key={region.id}
            className={`p-3 rounded border cursor-pointer transition-colors ${
              selectedRegion === region.id
                ? 'bg-blue-100 border-blue-500'
                : 'bg-gray-100 border-gray-300'
            }`}
            onClick={() => setSelectedRegion(region.id)}
          >
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">{region.label}</p>
                <p className="text-sm text-gray-600">
                  {formatTime(region.start)} - {formatTime(region.end)}
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteRegion(region.id);
                }}
                className="text-red-600 hover:text-red-700 font-medium"
              >
                삭제
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};
```

## 실시간 시각화 및 스펙트럼 분석

```typescript
// components/AudioAnalyzer/AudioAnalyzer.tsx

import React, { useEffect, useRef, useState } from 'react';

interface AudioAnalyzerProps {
  audioUrl: string;
}

export const AudioAnalyzer: React.FC<AudioAnalyzerProps> = ({ audioUrl }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const initializeAudio = async () => {
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioContextRef.current = audioContext;

        // Analyser 노드 생성
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        analyserRef.current = analyser;

        // 오디오 파일 로드
        const response = await fetch(audioUrl);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        // 오디오 소스 생성
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(analyser);
        analyser.connect(audioContext.destination);

        // 데이터 배열 생성
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        dataArrayRef.current = dataArray;

        // 그리기 함수
        const draw = () => {
          if (!canvasRef.current || !analyserRef.current || !dataArrayRef.current) return;

          const canvas = canvasRef.current;
          const ctx = canvas.getContext('2d');
          if (!ctx) return;

          analyserRef.current.getByteFrequencyData(dataArrayRef.current);

          // 캔버스 초기화
          ctx.fillStyle = 'rgb(200, 200, 200)';
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          // 스펙트럼 그리기
          const barWidth = (canvas.width / dataArrayRef.current.length) * 2.5;
          let x = 0;

          for (let i = 0; i < dataArrayRef.current.length; i++) {
            const barHeight = (dataArrayRef.current[i] / 255) * canvas.height;
            const hue = (i / dataArrayRef.current.length) * 360;

            ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
            ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

            x += barWidth + 1;
          }

          animationRef.current = requestAnimationFrame(draw);
        };

        source.start(0);
        draw();
      } catch (error) {
        console.error('Failed to initialize audio analyzer:', error);
      }
    };

    initializeAudio();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [audioUrl]);

  return (
    <div className="w-full">
      <canvas
        ref={canvasRef}
        width={800}
        height={200}
        className="w-full border border-gray-300 rounded-lg"
      />
    </div>
  );
};
```

## 실제 사용 예시

```typescript
// pages/audio-editor.tsx - 협업 플랫폼 프로젝트 예시

import { useState } from 'react';
import { AudioPlayer } from '@/components/AudioPlayer';
import { AudioEditorWithRegions } from '@/components/AudioEditor';

export default function AudioEditorPage() {
  const [regions, setRegions] = useState([]);
  const [audioUrl] = useState('https://example.com/audio.mp3');

  return (
    <div className="max-w-4xl mx-auto p-8 space-y-8">
      <h1 className="text-3xl font-bold">오디오 에디터</h1>

      <section>
        <h2 className="text-2xl font-semibold mb-4">기본 플레이어</h2>
        <AudioPlayer audioUrl={audioUrl} title="샘플 오디오" />
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4">고급 에디터</h2>
        <AudioEditorWithRegions
          audioUrl={audioUrl}
          regions={regions}
          onRegionCreate={(region) => setRegions([...regions, region])}
          onRegionUpdate={(updated) =>
            setRegions(regions.map((r) => (r.id === updated.id ? updated : r)))
          }
          onRegionDelete={(id) => setRegions(regions.filter((r) => r.id !== id))}
        />
      </section>
    </div>
  );
}
```

## 성능 최적화 팁

```typescript
// 1. 메모리 효율 - 큰 오디오 파일 스트리밍
const loadAudioWithStreaming = async (url: string) => {
  const response = await fetch(url);
  const reader = response.body?.getReader();
  // 청크 단위로 처리
};

// 2. 캔버스 성능 최적화
const optimizedDraw = (canvas: HTMLCanvasElement, analyser: AnalyserNode) => {
  // requestAnimationFrame 사용으로 성능 최적화
  const draw = () => {
    requestAnimationFrame(draw);
    // 그리기 로직
  };
  draw();
};
```

## 결론

WaveSurfer.js는 웹 기반 오디오 플레이어 구현을 위한 강력한 도구입니다. 기본 재생 기능부터 고급 리전 관리, 스펙트럼 분석까지 다양한 기능을 제공합니다. collab-platform나 3d-viewer-app 같은 프로젝트에서 사용자 친화적인 오디오 인터페이스를 구축할 때 매우 유용합니다.
