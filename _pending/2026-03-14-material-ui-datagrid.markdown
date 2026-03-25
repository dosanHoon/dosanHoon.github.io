---
title: "MUI DataGrid로 대용량 테이블 구현하기"
date: "2026-03-14T11:15:00.000Z"
template: "post"
draft: false
slug: "/posts/material-ui-datagrid"
category: "REACT"
tags:
  - "Material UI"
  - "DataGrid"
  - "Table"
description: "사내 자산 관리 시스템에서 수천 개의 데이터를 효율적으로 표시하기 위해 MUI DataGrid를 활용한 방법을 소개합니다."
---

## 개요

사내 3D 뷰어 프로젝트에서 자산 데이터를 관리할 때, 수천 개의 항목을 한 번에 표시해야 하는 상황이 발생했습니다. 일반적인 HTML 테이블로는 성능이 심각하게 저하되었고, MUI DataGrid를 도입하여 이 문제를 해결했습니다. 이 글에서는 우리의 구현 경험을 공유합니다.

## MUI DataGrid의 장점

- **가상화(Virtualization)**: 화면에 보이는 행만 렌더링
- **서버 기반 페이지네이션**: 필요한 데이터만 로드
- **정렬 및 필터링**: 내장된 UI 컴포넌트
- **편집 기능**: 인라인 셀 편집 지원
- **내보내기**: CSV, Excel로 데이터 추출

## 기본 설정

### 1. 설치

```bash
npm install @mui/x-data-grid @mui/material
```

### 2. 기본 구조

```typescript
import { DataGrid, GridColDef, GridValueGetterParams } from '@mui/x-data-grid';
import { useState, useCallback } from 'react';

interface Asset {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: string;
  creator: string;
}

export const AssetTable: React.FC = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [paginationModel, setPaginationModel] = useState({
    pageSize: 25,
    page: 0,
  });

  const columns: GridColDef[] = [
    { field: 'id', headerName: '자산 ID', width: 120 },
    { field: 'name', headerName: '자산명', width: 200, editable: true },
    { field: 'type', headerName: '타입', width: 100 },
    {
      field: 'size',
      headerName: '크기 (MB)',
      width: 120,
      valueGetter: (params: GridValueGetterParams) => (params.row.size / 1024 / 1024).toFixed(2)
    },
    {
      field: 'uploadedAt',
      headerName: '업로드 날짜',
      width: 150,
      valueGetter: (params: GridValueGetterParams) => new Date(params.row.uploadedAt).toLocaleDateString('ko-KR')
    },
    { field: 'creator', headerName: '제작자', width: 100 }
  ];

  return (
    <DataGrid
      rows={assets}
      columns={columns}
      pageSizeOptions={[10, 25, 50, 100]}
      paginationModel={paginationModel}
      onPaginationModelChange={setPaginationModel}
      loading={loading}
      autoHeight
    />
  );
};
```

## 서버 기반 페이지네이션

대용량 데이터를 효율적으로 처리하기 위해 서버에서 페이지네이션합니다:

```typescript
import { GridPaginationModel, GridSortModel } from '@mui/x-data-grid';

interface FetchParams {
  page: number;
  pageSize: number;
  sort?: GridSortModel;
  filters?: Record<string, any>;
}

const fetchAssets = async (params: FetchParams): Promise<{ data: Asset[], total: number }> => {
  const queryParams = new URLSearchParams({
    offset: (params.page * params.pageSize).toString(),
    limit: params.pageSize.toString(),
  });

  if (params.sort && params.sort.length > 0) {
    const { field, sort } = params.sort[0];
    queryParams.append('sortBy', field);
    queryParams.append('sortOrder', sort === 'asc' ? 'ASC' : 'DESC');
  }

  const response = await fetch(`/api/assets?${queryParams}`);
  const result = await response.json();

  return {
    data: result.items,
    total: result.total
  };
};

export const AssetTableWithServer: React.FC = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [rowCount, setRowCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    pageSize: 25,
    page: 0,
  });
  const [sortModel, setSortModel] = useState<GridSortModel>([]);

  // 데이터 가져오기
  const loadAssets = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchAssets({
        page: paginationModel.page,
        pageSize: paginationModel.pageSize,
        sort: sortModel,
      });
      setAssets(result.data);
      setRowCount(result.total);
    } finally {
      setLoading(false);
    }
  }, [paginationModel, sortModel]);

  useEffect(() => {
    loadAssets();
  }, [loadAssets]);

  const columns: GridColDef[] = [
    { field: 'id', headerName: '자산 ID', width: 120, sortable: true },
    { field: 'name', headerName: '자산명', width: 200 },
    { field: 'type', headerName: '타입', width: 100 },
    { field: 'size', headerName: '크기', width: 120 },
  ];

  return (
    <DataGrid
      rows={assets}
      columns={columns}
      rowCount={rowCount}
      pageSizeOptions={[10, 25, 50, 100]}
      paginationModel={paginationModel}
      onPaginationModelChange={setPaginationModel}
      sortModel={sortModel}
      onSortModelChange={setSortModel}
      loading={loading}
      paginationMode="server"
      sortingMode="server"
      autoHeight
    />
  );
};
```

## 커스텀 렌더링 및 편집

### 1. 커스텀 컬럼 렌더러

```typescript
import { Chip, IconButton } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';

const columns: GridColDef[] = [
  {
    field: 'status',
    headerName: '상태',
    width: 100,
    renderCell: (params) => {
      const statusColors: Record<string, 'default' | 'primary' | 'success' | 'warning' | 'error'> = {
        'active': 'success',
        'inactive': 'default',
        'archived': 'error'
      };
      return <Chip label={params.value} color={statusColors[params.value]} />;
    }
  },
  {
    field: 'actions',
    headerName: '작업',
    width: 100,
    sortable: false,
    filterable: false,
    renderCell: (params) => (
      <>
        <IconButton size="small" onClick={() => handleEdit(params.row)}>
          <EditIcon fontSize="small" />
        </IconButton>
        <IconButton size="small" onClick={() => handleDelete(params.row.id)}>
          <DeleteIcon fontSize="small" />
        </IconButton>
      </>
    )
  }
];
```

### 2. 셀 편집 처리

```typescript
const handleProcessRowUpdate = async (newRow: Asset) => {
  try {
    const response = await fetch(`/api/assets/${newRow.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newRow)
    });

    if (!response.ok) throw new Error('업데이트 실패');

    return newRow;
  } catch (error) {
    console.error('편집 실패:', error);
    throw error;
  }
};

const columns: GridColDef[] = [
  {
    field: 'name',
    headerName: '자산명',
    width: 200,
    editable: true
  },
  {
    field: 'tags',
    headerName: '태그',
    width: 200,
    editable: true,
    valueFormatter: (params) => params.value?.join(', ') || ''
  }
];

<DataGrid
  rows={assets}
  columns={columns}
  processRowUpdate={handleProcessRowUpdate}
  onProcessRowUpdateError={(error) => console.error('행 업데이트 오류:', error)}
/>
```

## 성능 최적화

### 1. 행 가상화 및 컬럼 가상화

```typescript
<DataGrid
  rows={assets}
  columns={columns}
  // 행 가상화 (이미 기본값)
  experimentalFeatures={{ newEditingApi: true }}
  // 큰 데이터셋을 위한 최적화
  autoHeight={false}
  sx={{
    '& .MuiDataGrid-virtualScroller': {
      minHeight: '400px'
    }
  }}
/>
```

### 2. 메모이제이션

```typescript
const AssetTableMemo = React.memo(AssetTable);

const columns = useMemo<GridColDef[]>(() => [
  { field: 'id', headerName: '자산 ID', width: 120 },
  { field: 'name', headerName: '자산명', width: 200 },
], []);

const rows = useMemo(() => assets, [assets]);
```

### 3. 필터링 최적화

```typescript
const [filterModel, setFilterModel] = useState<GridFilterModel>({
  items: []
});

const handleFilterModelChange = useCallback((newFilterModel: GridFilterModel) => {
  setFilterModel(newFilterModel);
  // 필터 변경 시 데이터 다시 로드
  loadAssets();
}, []);

<DataGrid
  filterModel={filterModel}
  onFilterModelChange={handleFilterModelChange}
/>
```

## 스타일링

```typescript
import { styled } from '@mui/material/styles';

const StyledDataGrid = styled(DataGrid)(({ theme }) => ({
  '& .MuiDataGrid-columnHeader': {
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
    fontWeight: 600,
  },
  '& .MuiDataGrid-row:hover': {
    backgroundColor: theme.palette.action.hover,
  },
  '& .MuiDataGrid-cell:focus': {
    outline: 'none',
  }
}));

<StyledDataGrid
  rows={assets}
  columns={columns}
/>
```

## 일반적인 문제 해결

### 1. 높이가 정해지지 않은 문제

```typescript
// 부모 컨테이너에 높이 명시
<Box sx={{ height: '100vh', width: '100%' }}>
  <DataGrid rows={assets} columns={columns} />
</Box>
```

### 2. 정렬/필터링이 클라이언트에서만 작동

```typescript
// 서버 기반 정렬/필터링 사용
<DataGrid
  paginationMode="server"
  sortingMode="server"
  filterMode="server"
/>
```

## 결론

MUI DataGrid는 복잡한 테이블 요구사항을 효과적으로 해결합니다. 특히:

- **가상화**: 수천 개의 행도 부드럽게 표시
- **유연한 커스터마이징**: 렌더러, 편집기 커스터마이징 가능
- **내장 기능**: 정렬, 필터링, 페이지네이션 내장
- **우수한 접근성**: ARIA 속성 및 키보드 네비게이션 지원

올바르게 설정하면 사용자 경험을 크게 향상시킬 수 있습니다.
