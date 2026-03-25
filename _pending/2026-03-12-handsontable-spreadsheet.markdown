---
title: "Handsontable로 웹 스프레드시트 만들기"
date: "2026-03-12T09:00:00.000Z"
template: "post"
draft: false
slug: "/posts/handsontable-web-spreadsheet-guide"
category: "JAVASCRIPT"
tags:
  - "Handsontable"
  - "Spreadsheet"
  - "Data Grid"
  - "Data Management"
description: "Handsontable을 이용한 웹 기반 스프레드시트 구현 방법과 고급 기능, 데이터 검증, 복잡한 렌더링을 다룹니다."
---

## 소개

사내 협업 플랫폼 프로젝트에서는 사용자가 대량의 데이터를 효율적으로 관리할 수 있어야 합니다. Handsontable은 웹을 위한 고성능 스프레드시트 라이브러리로, Excel 같은 사용자 경험을 제공합니다. 이 글에서는 Handsontable의 기본 사용법부터 고급 기능까지, 실제 프로젝트에서 구현한 방법을 소개하겠습니다.

## 설치

```bash
# npm 설치
npm install handsontable react-handsontable

# 또는 pnpm
pnpm add handsontable react-handsontable

# 스타일 import 필요
npm install --save handsontable/dist/handsontable.full.min.css
```

## 기본 설정

```typescript
// components/Spreadsheet/BasicSpreadsheet.tsx

import React, { useRef, useState } from 'react';
import { HotTable } from '@handsontable/react';
import { registerAllModules } from 'handsontable/registry';
import 'handsontable/dist/handsontable.full.min.css';

// 모든 모듈 등록
registerAllModules();

interface SpreadsheetProps {
  data: any[];
  onDataChange?: (data: any[]) => void;
}

export const BasicSpreadsheet: React.FC<SpreadsheetProps> = ({
  data,
  onDataChange,
}) => {
  const hotRef = useRef(null);

  const handleDataChange = (changes: any, source: string) => {
    if (source === 'loadData') {
      return;
    }

    // 데이터 변경 이벤트 처리
    const hotInstance = (hotRef.current as any)?.hotInstance;
    if (hotInstance) {
      const updatedData = hotInstance.getData();
      onDataChange?.(updatedData);
    }
  };

  const columns = [
    { data: 'id', title: 'ID', type: 'numeric', width: 50 },
    { data: 'name', title: '이름', type: 'text', width: 150 },
    { data: 'email', title: '이메일', type: 'text', width: 200 },
    { data: 'age', title: '나이', type: 'numeric', width: 80 },
    { data: 'status', title: '상태', type: 'dropdown', width: 120, source: ['활성', '비활성'] },
  ];

  return (
    <HotTable
      ref={hotRef}
      data={data}
      columns={columns}
      rowHeaders={true}
      colHeaders={true}
      stretchH="all"
      height="auto"
      afterChange={handleDataChange}
      contextMenu={true}
      copyPaste={true}
      dropdownMenu={true}
      filters={true}
      licenseKey="non-commercial-and-evaluation"
    />
  );
};
```

## 고급 설정: 데이터 검증

```typescript
// components/Spreadsheet/ValidatedSpreadsheet.tsx

import React, { useRef } from 'react';
import { HotTable } from '@handsontable/react';
import { registerAllModules } from 'handsontable/registry';
import 'handsontable/dist/handsontable.full.min.css';

registerAllModules();

interface ValidatedSpreadsheetProps {
  data: any[];
  onDataChange?: (data: any[]) => void;
  onValidationError?: (errors: ValidationError[]) => void;
}

interface ValidationError {
  row: number;
  col: number;
  message: string;
}

export const ValidatedSpreadsheet: React.FC<ValidatedSpreadsheetProps> = ({
  data,
  onDataChange,
  onValidationError,
}) => {
  const hotRef = useRef(null);

  // 커스텀 유효성 검사 함수들
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const isValidAge = (age: number): boolean => {
    return age >= 0 && age <= 150;
  };

  const isValidPhoneNumber = (phone: string): boolean => {
    const phoneRegex = /^01[0-9]-\d{3,4}-\d{4}$/;
    return phoneRegex.test(phone);
  };

  const columns = [
    {
      data: 'id',
      title: 'ID',
      type: 'numeric',
      width: 50,
      validator: (value: any, callback: any) => {
        callback(value > 0);
      },
    },
    {
      data: 'name',
      title: '이름',
      type: 'text',
      width: 150,
      validator: (value: any, callback: any) => {
        callback(value && value.trim().length > 0);
      },
    },
    {
      data: 'email',
      title: '이메일',
      type: 'text',
      width: 200,
      validator: (value: any, callback: any) => {
        callback(value && isValidEmail(value));
      },
    },
    {
      data: 'age',
      title: '나이',
      type: 'numeric',
      width: 80,
      validator: (value: any, callback: any) => {
        callback(isValidAge(value));
      },
    },
    {
      data: 'phone',
      title: '전화번호',
      type: 'text',
      width: 150,
      validator: (value: any, callback: any) => {
        callback(!value || isValidPhoneNumber(value));
      },
    },
    {
      data: 'department',
      title: '부서',
      type: 'dropdown',
      width: 150,
      source: ['영업', '마케팅', '개발', '인사', '재무'],
    },
  ];

  const handleBeforeChange = (changes: any, source: string) => {
    if (!changes) return true;

    const errors: ValidationError[] = [];

    changes.forEach(([row, prop, oldValue, newValue]: any) => {
      const column = columns.find((col) => col.data === prop);
      if (!column) return;

      // 유효성 검사
      if (column.data === 'email' && newValue && !isValidEmail(newValue)) {
        errors.push({
          row,
          col: columns.indexOf(column),
          message: '올바른 이메일 형식이 아닙니다',
        });
      }

      if (column.data === 'age' && newValue && !isValidAge(newValue)) {
        errors.push({
          row,
          col: columns.indexOf(column),
          message: '나이는 0-150 사이여야 합니다',
        });
      }

      if (column.data === 'phone' && newValue && !isValidPhoneNumber(newValue)) {
        errors.push({
          row,
          col: columns.indexOf(column),
          message: '올바른 전화번호 형식(01X-XXXX-XXXX)이 아닙니다',
        });
      }
    });

    if (errors.length > 0) {
      onValidationError?.(errors);
      return false; // 변경 취소
    }

    return true;
  };

  return (
    <div className="w-full">
      <HotTable
        ref={hotRef}
        data={data}
        columns={columns}
        rowHeaders={true}
        colHeaders={true}
        stretchH="all"
        height="auto"
        beforeChange={handleBeforeChange}
        contextMenu={true}
        dropdownMenu={true}
        filters={true}
        licenseKey="non-commercial-and-evaluation"
      />
    </div>
  );
};
```

## 커스텀 셀 렌더러

```typescript
// components/Spreadsheet/CustomRendererSpreadsheet.tsx

import React, { useRef } from 'react';
import { HotTable } from '@handsontable/react';
import { registerAllModules } from 'handsontable/registry';
import 'handsontable/dist/handsontable.full.min.css';

registerAllModules();

interface CustomRendererSpreadsheetProps {
  data: any[];
}

// 상태별 배경색 렌더러
const statusRenderer = (instance: any, td: HTMLTableCellElement, row: number, col: number, prop: string, value: string) => {
  const colors: Record<string, string> = {
    '활성': '#d4edda',
    '비활성': '#f8d7da',
    '대기': '#fff3cd',
  };

  td.style.backgroundColor = colors[value] || '#ffffff';
  td.style.color = '#000000';
  td.textContent = value;
};

// 진행률 렌더러
const progressRenderer = (instance: any, td: HTMLTableCellElement, row: number, col: number, prop: string, value: number) => {
  const percentage = Math.min(100, Math.max(0, value || 0));

  td.style.padding = '0';
  td.innerHTML = `
    <div style="
      width: 100%;
      height: 100%;
      background: linear-gradient(to right, #4CAF50 0%, #4CAF50 ${percentage}%, #e0e0e0 ${percentage}%, #e0e0e0 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
    ">
      ${percentage}%
    </div>
  `;
};

// 이미지 렌더러
const imageRenderer = (instance: any, td: HTMLTableCellElement, row: number, col: number, prop: string, value: string) => {
  td.innerHTML = `<img src="${value}" style="max-width: 100%; max-height: 50px; object-fit: contain;" alt="thumbnail" />`;
};

export const CustomRendererSpreadsheet: React.FC<CustomRendererSpreadsheetProps> = ({
  data,
}) => {
  const hotRef = useRef(null);

  const columns = [
    { data: 'id', title: 'ID', type: 'numeric', width: 50 },
    { data: 'name', title: '이름', type: 'text', width: 150 },
    {
      data: 'status',
      title: '상태',
      type: 'dropdown',
      width: 120,
      source: ['활성', '비활성', '대기'],
      renderer: statusRenderer,
    },
    {
      data: 'progress',
      title: '진행률',
      type: 'numeric',
      width: 150,
      renderer: progressRenderer,
    },
    {
      data: 'thumbnail',
      title: '썸네일',
      type: 'text',
      width: 150,
      renderer: imageRenderer,
    },
  ];

  return (
    <HotTable
      ref={hotRef}
      data={data}
      columns={columns}
      rowHeaders={true}
      colHeaders={true}
      stretchH="all"
      height="auto"
      licenseKey="non-commercial-and-evaluation"
    />
  );
};
```

## 데이터 내보내기/가져오기

```typescript
// utils/spreadsheetExport.ts

import { exportFile } from 'handsontable/plugins/export-file';

export interface ExportOptions {
  filename: string;
  format: 'csv' | 'xlsx' | 'pdf';
}

export const exportToCSV = (data: any[], filename: string = 'export.csv') => {
  const headers = Object.keys(data[0] || {});
  const csv = [
    headers.join(','),
    ...data.map((row) =>
      headers
        .map((header) => {
          const value = row[header];
          // CSV 특수문자 처리
          return typeof value === 'string' && (value.includes(',') || value.includes('"'))
            ? `"${value.replace(/"/g, '""')}"`
            : value;
        })
        .join(',')
    ),
  ].join('\n');

  downloadFile(csv, filename, 'text/csv');
};

export const exportToJSON = (data: any[], filename: string = 'export.json') => {
  const json = JSON.stringify(data, null, 2);
  downloadFile(json, filename, 'application/json');
};

export const exportToXLSX = async (data: any[], filename: string = 'export.xlsx') => {
  // xlsx 라이브러리 필요: npm install xlsx
  const XLSX = await import('xlsx');

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
  XLSX.writeFile(workbook, filename);
};

const downloadFile = (content: string, filename: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// 파일 가져오기
export const importFromCSV = (file: File): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const csv = event.target?.result as string;
        const lines = csv.split('\n');
        const headers = lines[0].split(',').map((h) => h.trim());

        const data = lines.slice(1).map((line) => {
          const values = line.split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
          const row: any = {};
          headers.forEach((header, index) => {
            row[header] = values[index];
          });
          return row;
        });

        resolve(data);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error('파일 읽기 실패'));
    reader.readAsText(file);
  });
};

export const importFromJSON = (file: File): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const json = event.target?.result as string;
        const data = JSON.parse(json);
        resolve(Array.isArray(data) ? data : [data]);
      } catch (error) {
        reject(new Error('JSON 파싱 실패'));
      }
    };

    reader.onerror = () => reject(new Error('파일 읽기 실패'));
    reader.readAsText(file);
  });
};
```

## 실시간 협업

```typescript
// components/Spreadsheet/CollaborativeSpreadsheet.tsx

import React, { useRef, useEffect, useState } from 'react';
import { HotTable } from '@handsontable/react';
import { useSocket } from '@/hooks/useSocket';
import 'handsontable/dist/handsontable.full.min.css';

interface CollaborativeSpreadsheetProps {
  sheetId: string;
  initialData: any[];
  userId: string;
}

export const CollaborativeSpreadsheet: React.FC<CollaborativeSpreadsheetProps> = ({
  sheetId,
  initialData,
  userId,
}) => {
  const hotRef = useRef(null);
  const { socket } = useSocket();
  const [data, setData] = useState(initialData);
  const [activeUsers, setActiveUsers] = useState<Map<string, any>>(new Map());

  useEffect(() => {
    if (!socket) return;

    // 시트 입장
    socket.emit('join-sheet', { sheetId, userId });

    // 원격 변경 수신
    socket.on('cell-changed', (event: any) => {
      const { row, col, value } = event;
      const newData = JSON.parse(JSON.stringify(data));
      if (newData[row]) {
        const columns = Object.keys(newData[row]);
        newData[row][columns[col]] = value;
        setData(newData);
      }
    });

    // 사용자 목록 업데이트
    socket.on('active-users', (users: any[]) => {
      const userMap = new Map(users.map((u) => [u.userId, u]));
      setActiveUsers(userMap);
    });

    return () => {
      socket.emit('leave-sheet', sheetId);
      socket.off('cell-changed');
      socket.off('active-users');
    };
  }, [socket, sheetId, userId]);

  const handleDataChange = (changes: any, source: string) => {
    if (source === 'loadData') return;

    changes?.forEach(([row, prop, oldValue, newValue]: any) => {
      // 서버에 변경 전송
      socket?.emit('change-cell', {
        sheetId,
        row,
        col: data[0] ? Object.keys(data[0]).indexOf(prop) : 0,
        value: newValue,
        userId,
      });
    });
  };

  return (
    <div className="w-full space-y-4">
      {/* 활성 사용자 표시 */}
      <div className="flex gap-2 p-2 bg-gray-100 rounded">
        {Array.from(activeUsers.values()).map((user) => (
          <div
            key={user.userId}
            style={{ backgroundColor: user.color }}
            className="px-3 py-1 rounded text-white text-sm"
          >
            {user.userName}
          </div>
        ))}
      </div>

      {/* 스프레드시트 */}
      <HotTable
        ref={hotRef}
        data={data}
        rowHeaders={true}
        colHeaders={true}
        stretchH="all"
        height="auto"
        afterChange={handleDataChange}
        contextMenu={true}
        licenseKey="non-commercial-and-evaluation"
      />
    </div>
  );
};
```

## 성능 최적화

```typescript
// hooks/useLargeDatasetHandsontable.ts

import { useMemo } from 'react';

interface UseLargeDatasetOptions {
  data: any[];
  pageSize?: number;
  sortColumn?: string;
  filterFn?: (item: any) => boolean;
}

export const useLargeDataset = ({
  data,
  pageSize = 100,
  sortColumn,
  filterFn,
}: UseLargeDatasetOptions) => {
  // 필터링 및 정렬 최적화
  const processedData = useMemo(() => {
    let result = [...data];

    // 필터링
    if (filterFn) {
      result = result.filter(filterFn);
    }

    // 정렬
    if (sortColumn) {
      result.sort((a, b) => {
        const aVal = a[sortColumn];
        const bVal = b[sortColumn];
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      });
    }

    return result;
  }, [data, sortColumn, filterFn]);

  // 페이지네이션
  const getPage = (pageIndex: number) => {
    const startIndex = pageIndex * pageSize;
    return processedData.slice(startIndex, startIndex + pageSize);
  };

  return {
    totalRows: processedData.length,
    totalPages: Math.ceil(processedData.length / pageSize),
    getPage,
    processedData,
  };
};
```

## 실제 프로젝트 예시

```typescript
// pages/data-management.tsx - 데이터 관리 페이지

import { useState } from 'react';
import { ValidatedSpreadsheet } from '@/components/Spreadsheet/ValidatedSpreadsheet';
import { exportToCSV, importFromCSV } from '@/utils/spreadsheetExport';

export default function DataManagementPage() {
  const [data, setData] = useState([
    { id: 1, name: '홍길동', email: 'hong@example.com', age: 30, status: '활성' },
    { id: 2, name: '이순신', email: 'lee@example.com', age: 35, status: '활성' },
  ]);

  const handleImport = async (file: File) => {
    try {
      const imported = await importFromCSV(file);
      setData(imported);
      alert('데이터 가져오기 완료');
    } catch (error) {
      alert('데이터 가져오기 실패');
    }
  };

  return (
    <div className="p-8 space-y-4">
      <h1 className="text-3xl font-bold">데이터 관리</h1>

      {/* 버튼들 */}
      <div className="flex gap-2">
        <button
          onClick={() => exportToCSV(data, 'data.csv')}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          CSV로 내보내기
        </button>

        <label className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 cursor-pointer">
          CSV 가져오기
          <input
            type="file"
            accept=".csv"
            onChange={(e) => e.target.files?.[0] && handleImport(e.target.files[0])}
            className="hidden"
          />
        </label>
      </div>

      {/* 스프레드시트 */}
      <ValidatedSpreadsheet
        data={data}
        onDataChange={setData}
        onValidationError={(errors) => {
          console.error('검증 오류:', errors);
        }}
      />
    </div>
  );
}
```

## 결론

Handsontable은 웹 기반 데이터 관리를 위한 강력한 솔루션입니다. Excel 같은 사용자 경험, 데이터 검증, 커스텀 렌더링, 실시간 협업 등의 기능으로 복잡한 데이터 관리 시나리오를 효과적으로 처리할 수 있습니다. 데이터 중심 애플리케이션에서 필수적인 도구입니다.
