---
title: "Socket.io로 실시간 협업 기능 구현하기"
date: "2026-03-11T09:00:00.000Z"
template: "post"
draft: false
slug: "/posts/socketio-realtime-collaboration"
category: "JAVASCRIPT"
tags:
  - "Socket.io"
  - "WebSocket"
  - "Real-time"
  - "Collaboration"
description: "Socket.io를 이용한 실시간 협업 기능 구현과 채팅, 알림, 라이브 커서 추적 등의 고급 기능을 소개합니다."
---

## 소개

사내 협업 플랫폼 프로젝트는 실시간 협업 기능이 필수적입니다. 여러 사용자가 동시에 작업하면서 실시간으로 데이터를 공유해야 합니다. Socket.io는 WebSocket을 기반으로 한 실시간 양방향 통신 라이브러리로, 연결 끊김 시 자동 재연결, Room 기반 메시징 등 많은 기능을 제공합니다. 이 글에서는 실제 프로젝트에서 구현한 실시간 협업 기능을 소개하겠습니다.

## 설치

```bash
# 서버
npm install socket.io express

# 클라이언트
npm install socket.io-client

# TypeScript 타입
npm install --save-dev @types/socket.io @types/socket.io-client
```

## 기본 서버 설정

```typescript
// server/io.ts - Socket.io 서버 설정

import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';

const app = express();
const httpServer = createServer(app);

// Socket.io 설정
const io = new Server(httpServer, {
  cors: {
    origin: ['http://localhost:3000', 'https://example.com'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
  // 성능 최적화
  transports: ['websocket', 'polling'],
  pingInterval: 25000,
  pingTimeout: 60000,
  maxHttpBufferSize: 1e6, // 1MB
});

// 미들웨어
io.use((socket, next) => {
  // 인증 확인
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication error'));
  }

  // 토큰 검증 (실제로는 JWT 검증)
  socket.userId = decodeToken(token).userId;
  next();
});

// 연결 이벤트
io.on('connection', (socket: Socket) => {
  console.log(`사용자 연결: ${socket.id}`);

  // 사용자 정보 저장
  socket.emit('connected', { socketId: socket.id, userId: socket.userId });

  // 연결 해제
  socket.on('disconnect', () => {
    console.log(`사용자 연결 해제: ${socket.id}`);
  });
});

// 서버 실행
const PORT = 3001;
httpServer.listen(PORT, () => {
  console.log(`서버 실행 중: http://localhost:${PORT}`);
});
```

## 기본 클라이언트 설정

```typescript
// hooks/useSocket.ts

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface UseSocketOptions {
  url?: string;
  autoConnect?: boolean;
}

export const useSocket = (options: UseSocketOptions = {}) => {
  const { url = process.env.REACT_APP_SOCKET_URL || 'http://localhost:3001', autoConnect = true } =
    options;

  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!autoConnect) return;

    // 토큰 가져오기
    const token = localStorage.getItem('authToken');

    // Socket.io 클라이언트 생성
    socketRef.current = io(url, {
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    // 이벤트 리스너
    socketRef.current.on('connected', (data) => {
      setUserId(data.userId);
      setIsConnected(true);
      console.log('Socket.io 연결됨:', data.socketId);
    });

    socketRef.current.on('disconnect', () => {
      setIsConnected(false);
      console.log('Socket.io 연결 해제');
    });

    socketRef.current.on('error', (error) => {
      console.error('Socket.io 오류:', error);
    });

    // 정리
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [url, autoConnect]);

  return {
    socket: socketRef.current,
    isConnected,
    userId,
  };
};
```

## Room 기반 메시징

```typescript
// server/rooms.ts

interface Room {
  id: string;
  name: string;
  members: Map<string, UserInfo>;
  createdAt: Date;
}

interface UserInfo {
  userId: string;
  socketId: string;
  userName: string;
  color: string;
}

class RoomManager {
  private rooms = new Map<string, Room>();

  createRoom(roomId: string, roomName: string): Room {
    const room: Room = {
      id: roomId,
      name: roomName,
      members: new Map(),
      createdAt: new Date(),
    };
    this.rooms.set(roomId, room);
    return room;
  }

  joinRoom(roomId: string, socketId: string, userInfo: UserInfo): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    room.members.set(socketId, userInfo);
    return true;
  }

  leaveRoom(roomId: string, socketId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    room.members.delete(socketId);

    // 방이 비어있으면 삭제
    if (room.members.size === 0) {
      this.rooms.delete(roomId);
    }

    return true;
  }

  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  getRoomMembers(roomId: string): UserInfo[] {
    const room = this.rooms.get(roomId);
    return room ? Array.from(room.members.values()) : [];
  }
}

export const roomManager = new RoomManager();

// Server-side room event handlers
export const setupRoomHandlers = (io: Server, socket: Socket) => {
  // 방 입장
  socket.on('join-room', (data: { roomId: string; userName: string }) => {
    const { roomId, userName } = data;

    const userInfo: UserInfo = {
      userId: socket.userId,
      socketId: socket.id,
      userName,
      color: generateRandomColor(),
    };

    // 방 생성 또는 입장
    if (!roomManager.getRoom(roomId)) {
      roomManager.createRoom(roomId, `Room ${roomId}`);
    }

    roomManager.joinRoom(roomId, socket.id, userInfo);
    socket.join(roomId);

    // 기존 멤버에게 알림
    io.to(roomId).emit('user-joined', {
      user: userInfo,
      members: roomManager.getRoomMembers(roomId),
    });
  });

  // 방 퇴장
  socket.on('leave-room', (roomId: string) => {
    roomManager.leaveRoom(roomId, socket.id);
    socket.leave(roomId);

    io.to(roomId).emit('user-left', {
      socketId: socket.id,
      members: roomManager.getRoomMembers(roomId),
    });
  });

  // 방의 멤버 목록 요청
  socket.on('get-room-members', (roomId: string, callback) => {
    const members = roomManager.getRoomMembers(roomId);
    callback(members);
  });
};

function generateRandomColor(): string {
  return '#' + Math.floor(Math.random() * 16777215).toString(16);
}
```

## 실시간 채팅 구현

```typescript
// server/chat.ts

interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  content: string;
  timestamp: Date;
  roomId: string;
}

const messageHistory = new Map<string, ChatMessage[]>();

export const setupChatHandlers = (io: Server, socket: Socket) => {
  // 메시지 전송
  socket.on('send-message', (data: { roomId: string; content: string }, callback) => {
    const { roomId, content } = data;

    const message: ChatMessage = {
      id: generateId(),
      userId: socket.userId,
      userName: socket.handshake.auth.userName || 'Anonymous',
      content,
      timestamp: new Date(),
      roomId,
    };

    // 메시지 히스토리 저장
    if (!messageHistory.has(roomId)) {
      messageHistory.set(roomId, []);
    }
    messageHistory.get(roomId)!.push(message);

    // 방의 모든 사용자에게 메시지 전송
    io.to(roomId).emit('message-received', message);

    // 클라이언트에 확인
    callback({ success: true, messageId: message.id });
  });

  // 메시지 히스토리 요청
  socket.on('get-message-history', (roomId: string, callback) => {
    const messages = messageHistory.get(roomId) || [];
    callback(messages);
  });

  // 입력 중 표시
  socket.on('user-typing', (data: { roomId: string; userName: string }) => {
    const { roomId, userName } = data;
    socket.to(roomId).emit('user-typing', { userName });
  });

  // 입력 완료
  socket.on('user-stopped-typing', (roomId: string) => {
    socket.to(roomId).emit('user-stopped-typing');
  });
};

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}
```

```typescript
// components/ChatWidget.tsx - 클라이언트 채팅

import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '@/hooks/useSocket';

interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  content: string;
  timestamp: Date;
}

interface ChatWidgetProps {
  roomId: string;
  userName: string;
}

export const ChatWidget: React.FC<ChatWidgetProps> = ({ roomId, userName }) => {
  const { socket } = useSocket();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!socket) return;

    // 메시지 수신
    socket.on('message-received', (message: ChatMessage) => {
      setMessages((prev) => [...prev, message]);
    });

    // 입력 중 표시
    socket.on('user-typing', (data: { userName: string }) => {
      setTypingUsers((prev) => new Set([...prev, data.userName]));
    });

    socket.on('user-stopped-typing', () => {
      setTypingUsers(new Set());
    });

    // 메시지 히스토리 요청
    socket.emit('get-message-history', roomId, (messages: ChatMessage[]) => {
      setMessages(messages);
    });

    return () => {
      socket.off('message-received');
      socket.off('user-typing');
      socket.off('user-stopped-typing');
    };
  }, [socket, roomId]);

  // 자동 스크롤
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = () => {
    if (!socket || !inputValue.trim()) return;

    socket.emit('send-message', { roomId, content: inputValue }, (response) => {
      if (response.success) {
        setInputValue('');
        socket.emit('user-stopped-typing', roomId);
      }
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);

    // 입력 중 표시
    socket?.emit('user-typing', { roomId, userName });

    // 입력 완료 후 1초 후 타이핑 표시 제거
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      socket?.emit('user-stopped-typing', roomId);
    }, 1000);
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg border">
      {/* 메시지 목록 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className="flex gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">{msg.userName}</span>
                <span className="text-xs text-gray-500">
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <p className="text-sm text-gray-700 mt-1">{msg.content}</p>
            </div>
          </div>
        ))}

        {/* 입력 중 표시 */}
        {typingUsers.size > 0 && (
          <div className="text-xs text-gray-400 italic">
            {Array.from(typingUsers).join(', ')} 입력 중...
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 입력 영역 */}
      <div className="border-t p-4 flex gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          placeholder="메시지 입력..."
          className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={handleSendMessage}
          disabled={!inputValue.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          전송
        </button>
      </div>
    </div>
  );
};
```

## 라이브 커서 추적

```typescript
// server/cursor.ts

interface CursorPosition {
  userId: string;
  userName: string;
  x: number;
  y: number;
  color: string;
}

export const setupCursorHandlers = (io: Server, socket: Socket) => {
  // 커서 위치 업데이트
  socket.on('cursor-move', (data: { roomId: string; x: number; y: number; color: string }) => {
    const { roomId, x, y, color } = data;

    // 같은 방의 다른 사용자들에게 커서 위치 전송
    socket.to(roomId).emit('cursor-moved', {
      userId: socket.userId,
      x,
      y,
      color,
    });
  });

  // 커서 감추기
  socket.on('cursor-hide', (roomId: string) => {
    socket.to(roomId).emit('cursor-hidden', {
      userId: socket.userId,
    });
  });
};
```

```typescript
// components/LiveCursor.tsx - 클라이언트 커서 표시

import React, { useState, useEffect } from 'react';
import { useSocket } from '@/hooks/useSocket';

interface Cursor {
  userId: string;
  x: number;
  y: number;
  color: string;
}

interface LiveCursorProps {
  roomId: string;
  cursorColor: string;
}

export const LiveCursor: React.FC<LiveCursorProps> = ({ roomId, cursorColor }) => {
  const { socket } = useSocket();
  const [cursors, setCursors] = useState<Map<string, Cursor>>(new Map());
  const [localCursor, setLocalCursor] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!socket) return;

    // 커서 위치 업데이트 수신
    socket.on('cursor-moved', (cursor: Cursor) => {
      setCursors((prev) => new Map(prev).set(cursor.userId, cursor));
    });

    // 커서 감추기
    socket.on('cursor-hidden', (data: { userId: string }) => {
      setCursors((prev) => {
        const newCursors = new Map(prev);
        newCursors.delete(data.userId);
        return newCursors;
      });
    });

    return () => {
      socket.off('cursor-moved');
      socket.off('cursor-hidden');
    };
  }, [socket, roomId]);

  // 마우스 이동 감지
  const handleMouseMove = (e: React.MouseEvent) => {
    const x = e.clientX;
    const y = e.clientY;

    setLocalCursor({ x, y });

    // 커서 위치 전송 (100ms 간격으로 throttle)
    socket?.emit('cursor-move', {
      roomId,
      x,
      y,
      color: cursorColor,
    });
  };

  // 마우스 떠났을 때 커서 감추기
  const handleMouseLeave = () => {
    socket?.emit('cursor-hide', roomId);
  };

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative w-full h-full"
    >
      {/* 원격 커서 표시 */}
      {Array.from(cursors.values()).map((cursor) => (
        <div
          key={cursor.userId}
          style={{
            position: 'fixed',
            left: `${cursor.x}px`,
            top: `${cursor.y}px`,
            pointerEvents: 'none',
            zIndex: 1000,
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill={cursor.color}>
            <path d="M0,0 L0,24 L6,18 L12,24 L18,18 L24,0 Z" />
          </svg>
        </div>
      ))}
    </div>
  );
};
```

## 자동 재연결 및 오류 처리

```typescript
// hooks/useSocketWithReconnect.ts

import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export const useSocketWithReconnect = (url: string) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>(
    'disconnected'
  );
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem('authToken');

    const newSocket = io(url, {
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    newSocket.on('connect', () => {
      setConnectionStatus('connected');
      setReconnectAttempts(0);
      console.log('✓ Socket.io 연결됨');
    });

    newSocket.on('disconnect', () => {
      setConnectionStatus('disconnected');
      console.log('✗ Socket.io 연결 해제');
    });

    newSocket.on('reconnect_attempt', () => {
      setConnectionStatus('connecting');
      setReconnectAttempts((prev) => prev + 1);
      console.log(`재연결 시도: ${reconnectAttempts + 1}`);
    });

    newSocket.on('reconnect_failed', () => {
      console.error('재연결 실패');
    });

    newSocket.on('error', (error) => {
      console.error('Socket.io 오류:', error);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [url]);

  return { socket, connectionStatus, reconnectAttempts };
};
```

## 성능 최적화

```typescript
// 메시지 배칭
class MessageBatcher {
  private batch: any[] = [];
  private timer: NodeJS.Timeout | null = null;

  constructor(private socket: Socket, private batchSize = 10, private batchTime = 100) {}

  add(message: any) {
    this.batch.push(message);

    if (this.batch.length >= this.batchSize) {
      this.flush();
    } else if (!this.timer) {
      this.timer = setTimeout(() => this.flush(), this.batchTime);
    }
  }

  private flush() {
    if (this.batch.length > 0) {
      this.socket.emit('batch-messages', this.batch);
      this.batch = [];
    }

    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}
```

## 결론

Socket.io는 웹 기반 실시간 협업 기능을 구현하기 위한 강력한 도구입니다. 자동 재연결, Room 기반 메시징, 바이너리 지원 등의 기능으로 복잡한 실시간 시나리오를 효과적으로 처리할 수 있습니다. 협업 플랫폼 프로젝트에서 필수적인 기술입니다.
