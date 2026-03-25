---
title: "Motor로 MongoDB 비동기 처리"
date: "2026-03-20T14:15:00.000Z"
template: "post"
draft: false
slug: "/posts/mongodb-motor-async"
category: "PYTHON"
tags:
  - "MongoDB"
  - "Motor"
  - "AsyncIO"
  - "Python"
description: "사내 3D 뷰어 프로젝트의 백엔드에서 Motor를 활용하여 MongoDB 비동기 작업을 처리하는 방법을 설명합니다."
---

## 소개

Motor는 MongoDB의 비동기 Python 드라이버입니다. 사내 3D 뷰어 프로젝트의 Python 백엔드에서는 Motor를 통해 대량의 동시 요청을 효율적으로 처리합니다.

## Motor 설치 및 기본 설정

```bash
pip install motor pymongo python-dotenv
```

### MongoDB 연결 설정

```python
import os
from motor.motor_asyncio import AsyncClient, AsyncDatabase

# 환경 변수에서 MongoDB URI 읽기
MONGODB_URL = os.getenv('MONGODB_URL', 'mongodb://localhost:27017')
DATABASE_NAME = os.getenv('DATABASE_NAME', 'viewer_db')

class DatabaseManager:
    _client: AsyncClient | None = None
    _db: AsyncDatabase | None = None

    @classmethod
    async def connect(cls) -> AsyncDatabase:
        """MongoDB 연결"""
        if cls._client is None:
            cls._client = AsyncClient(MONGODB_URL)
            cls._db = cls._client[DATABASE_NAME]

            # 연결 확인
            await cls._client.admin.command('ping')
            print('✓ MongoDB 연결 성공')

        return cls._db

    @classmethod
    async def disconnect(cls) -> None:
        """MongoDB 연결 해제"""
        if cls._client is not None:
            cls._client.close()
            cls._client = None
            cls._db = None
            print('✓ MongoDB 연결 해제')

    @classmethod
    async def get_database(cls) -> AsyncDatabase:
        """데이터베이스 인스턴스 반환"""
        if cls._db is None:
            await cls.connect()
        return cls._db
```

## 기본 CRUD 작업

### 1. 문서 삽입

```python
from datetime import datetime
from typing import Dict, Any, Optional
from motor.motor_asyncio import AsyncCollection

class AssetRepository:
    def __init__(self, collection: AsyncCollection):
        self.collection = collection

    async def insert_asset(self, asset_data: Dict[str, Any]) -> str:
        """자산 삽입"""
        asset_data['created_at'] = datetime.utcnow()
        asset_data['updated_at'] = datetime.utcnow()

        result = await self.collection.insert_one(asset_data)
        return str(result.inserted_id)

    async def insert_many_assets(
        self, assets_data: list[Dict[str, Any]]
    ) -> list[str]:
        """여러 자산 삽입"""
        now = datetime.utcnow()

        for asset in assets_data:
            asset['created_at'] = now
            asset['updated_at'] = now

        result = await self.collection.insert_many(assets_data)
        return [str(id) for id in result.inserted_ids]
```

### 2. 문서 조회

```python
from bson import ObjectId

async def get_asset_by_id(self, asset_id: str) -> Optional[Dict[str, Any]]:
    """ID로 자산 조회"""
    try:
        oid = ObjectId(asset_id)
    except Exception:
        return None

    return await self.collection.find_one({'_id': oid})

async def get_assets_by_name(
    self, name: str
) -> list[Dict[str, Any]]:
    """이름으로 자산 조회"""
    cursor = self.collection.find({'name': {'$regex': name, '$options': 'i'}})
    return await cursor.to_list(length=100)

async def list_assets(
    self,
    skip: int = 0,
    limit: int = 20,
    sort_by: str = 'created_at'
) -> tuple[list[Dict[str, Any]], int]:
    """자산 목록 조회 (페이지네이션)"""
    # 전체 개수 조회
    total = await self.collection.count_documents({})

    # 페이지네이션된 결과 조회
    cursor = (
        self.collection
        .find({})
        .skip(skip)
        .limit(limit)
        .sort(sort_by, -1)
    )

    assets = await cursor.to_list(length=limit)
    return assets, total
```

### 3. 문서 업데이트

```python
async def update_asset(
    self,
    asset_id: str,
    update_data: Dict[str, Any]
) -> bool:
    """자산 업데이트"""
    try:
        oid = ObjectId(asset_id)
    except Exception:
        return False

    update_data['updated_at'] = datetime.utcnow()

    result = await self.collection.update_one(
        {'_id': oid},
        {'$set': update_data}
    )

    return result.modified_count > 0

async def update_many_assets(
    self,
    filter_: Dict[str, Any],
    update_data: Dict[str, Any]
) -> int:
    """여러 자산 업데이트"""
    update_data['updated_at'] = datetime.utcnow()

    result = await self.collection.update_many(
        filter_,
        {'$set': update_data}
    )

    return result.modified_count

async def increment_views(self, asset_id: str) -> Optional[int]:
    """조회 수 증가"""
    try:
        oid = ObjectId(asset_id)
    except Exception:
        return None

    result = await self.collection.find_one_and_update(
        {'_id': oid},
        {'$inc': {'views': 1}, '$set': {'updated_at': datetime.utcnow()}},
        return_document=True
    )

    return result.get('views') if result else None
```

### 4. 문서 삭제

```python
async def delete_asset(self, asset_id: str) -> bool:
    """자산 삭제"""
    try:
        oid = ObjectId(asset_id)
    except Exception:
        return False

    result = await self.collection.delete_one({'_id': oid})
    return result.deleted_count > 0

async def delete_many_assets(self, filter_: Dict[str, Any]) -> int:
    """여러 자산 삭제"""
    result = await self.collection.delete_many(filter_)
    return result.deleted_count
```

## 복잡한 쿼리 작업

### 1. 집계 파이프라인

```python
async def get_asset_statistics(self) -> Dict[str, Any]:
    """자산 통계 조회"""
    pipeline = [
        {
            '$group': {
                '_id': '$type',
                'count': {'$sum': 1},
                'avg_size': {'$avg': '$size'},
                'total_views': {'$sum': '$views'}
            }
        },
        {
            '$sort': {'count': -1}
        }
    ]

    cursor = self.collection.aggregate(pipeline)
    results = await cursor.to_list(length=None)
    return {doc['_id']: doc for doc in results}

async def get_popular_assets(self, limit: int = 10) -> list[Dict[str, Any]]:
    """인기 자산 조회"""
    pipeline = [
        {
            '$match': {
                'views': {'$gt': 0},
                'is_active': True
            }
        },
        {
            '$group': {
                '_id': '$category',
                'assets': {
                    '$push': {
                        'id': '$_id',
                        'name': '$name',
                        'views': '$views'
                    }
                },
                'total_views': {'$sum': '$views'}
            }
        },
        {
            '$project': {
                '_id': 1,
                'assets': {
                    '$slice': ['$assets', limit]
                },
                'total_views': 1
            }
        },
        {
            '$sort': {'total_views': -1}
        }
    ]

    cursor = self.collection.aggregate(pipeline)
    return await cursor.to_list(length=None)
```

### 2. 텍스트 검색

```python
async def create_text_index(self) -> None:
    """텍스트 인덱스 생성"""
    await self.collection.create_index([
        ('name', 'text'),
        ('description', 'text'),
        ('tags', 'text')
    ])

async def search_assets(self, query: str) -> list[Dict[str, Any]]:
    """전문 검색"""
    results = await self.collection.find(
        {'$text': {'$search': query}},
        {'score': {'$meta': 'textScore'}}
    ).sort([('score', {'$meta': 'textScore'})]).to_list(length=20)

    return results
```

## 트랜잭션 처리

```python
from motor.motor_asyncio import AsyncSession

async def transfer_asset(
    self,
    asset_id: str,
    from_user_id: str,
    to_user_id: str
) -> bool:
    """자산 양도 (트랜잭션)"""
    db = await DatabaseManager.get_database()

    async with await db.client.start_session() as session:
        async with session.start_transaction():
            try:
                # 자산 소유자 변경
                asset = await db.assets.find_one(
                    {'_id': ObjectId(asset_id)},
                    session=session
                )

                if not asset or asset['owner_id'] != from_user_id:
                    raise ValueError('자산 소유권이 없습니다')

                await db.assets.update_one(
                    {'_id': ObjectId(asset_id)},
                    {'$set': {'owner_id': to_user_id, 'updated_at': datetime.utcnow()}},
                    session=session
                )

                # 사용자 로그 기록
                await db.asset_logs.insert_one(
                    {
                        'asset_id': asset_id,
                        'from_user_id': from_user_id,
                        'to_user_id': to_user_id,
                        'action': 'transfer',
                        'timestamp': datetime.utcnow()
                    },
                    session=session
                )

                return True

            except Exception as e:
                print(f'트랜잭션 오류: {e}')
                return False
```

## 벌크 작업

```python
from pymongo import InsertOne, UpdateOne, DeleteOne, ReplaceOne

async def bulk_operations(self, operations: list) -> Dict[str, int]:
    """벌크 작업 실행"""
    if not operations:
        return {'matched': 0, 'modified': 0, 'deleted': 0, 'inserted': 0}

    result = await self.collection.bulk_write(operations)

    return {
        'matched': result.matched_count,
        'modified': result.modified_count,
        'deleted': result.deleted_count,
        'inserted': result.inserted_id
    }

async def bulk_update_assets(
    self,
    updates: list[tuple[str, Dict[str, Any]]]
) -> Dict[str, int]:
    """여러 자산 일괄 업데이트"""
    operations = [
        UpdateOne(
            {'_id': ObjectId(asset_id)},
            {'$set': {**data, 'updated_at': datetime.utcnow()}}
        )
        for asset_id, data in updates
    ]

    return await self.bulk_operations(operations)

async def bulk_insert_and_update(
    self,
    new_assets: list[Dict[str, Any]],
    updates: list[tuple[str, Dict[str, Any]]]
) -> Dict[str, int]:
    """자산 삽입 및 업데이트 일괄 처리"""
    now = datetime.utcnow()

    operations = [
        InsertOne({**asset, 'created_at': now, 'updated_at': now})
        for asset in new_assets
    ] + [
        UpdateOne(
            {'_id': ObjectId(asset_id)},
            {'$set': {**data, 'updated_at': now}}
        )
        for asset_id, data in updates
    ]

    return await self.bulk_operations(operations)
```

## 인덱싱 최적화

```python
async def create_indexes(self) -> None:
    """성능 최적화를 위한 인덱스 생성"""
    indexes = [
        # 단일 필드 인덱스
        [('type', 1)],
        [('creator_id', 1)],
        [('created_at', -1)],

        # 복합 인덱스
        [('creator_id', 1), ('created_at', -1)],
        [('type', 1), ('views', -1)],

        # 텍스트 인덱스
        [('name', 'text'), ('description', 'text')],

        # TTL 인덱스 (임시 데이터 자동 삭제)
        [('created_at', 1)],  # TTL 설정은 별도 필요
    ]

    for index_spec in indexes:
        try:
            await self.collection.create_index(index_spec)
            print(f'✓ 인덱스 생성: {index_spec}')
        except Exception as e:
            print(f'인덱스 생성 실패 {index_spec}: {e}')

async def set_ttl_index(self, field: str = 'created_at', expire_seconds: int = 86400) -> None:
    """TTL 인덱스 설정 (24시간 후 자동 삭제)"""
    await self.collection.create_index(
        field,
        expireAfterSeconds=expire_seconds
    )
```

## 연결 풀 관리

```python
from motor.motor_asyncio import AsyncClient

class MotorPool:
    def __init__(self, uri: str, max_pool_size: int = 50, min_pool_size: int = 10):
        self.client = AsyncClient(
            uri,
            maxPoolSize=max_pool_size,
            minPoolSize=min_pool_size,
            waitQueueTimeoutMS=5000  # 5초 대기 후 타임아웃
        )

    async def close(self) -> None:
        self.client.close()

    async def get_database(self, db_name: str):
        return self.client[db_name]

# 사용 예제
pool = MotorPool('mongodb://localhost:27017')

@app.on_event('startup')
async def startup():
    await pool.client.admin.command('ping')

@app.on_event('shutdown')
async def shutdown():
    await pool.close()
```

## 에러 처리

```python
from pymongo.errors import (
    ConnectionFailure,
    OperationFailure,
    DuplicateKeyError,
    WriteError
)

async def safe_insert_asset(
    self,
    asset_data: Dict[str, Any]
) -> tuple[bool, Optional[str], Optional[str]]:
    """에러 처리가 있는 안전한 삽입"""
    try:
        asset_id = await self.insert_asset(asset_data)
        return True, asset_id, None

    except DuplicateKeyError:
        return False, None, '이미 존재하는 자산입니다'

    except ConnectionFailure:
        return False, None, 'MongoDB 연결 실패'

    except OperationFailure as e:
        return False, None, f'작업 실패: {e.details}'

    except Exception as e:
        return False, None, f'예상치 못한 오류: {str(e)}'
```

## 성능 모니터링

```python
import time
from functools import wraps
from typing import Callable

def monitor_performance(func: Callable):
    """성능 모니터링 데코레이터"""
    @wraps(func)
    async def wrapper(*args, **kwargs):
        start_time = time.time()

        try:
            result = await func(*args, **kwargs)
            return result

        finally:
            elapsed = time.time() - start_time
            print(f'{func.__name__} 실행 시간: {elapsed:.3f}초')

    return wrapper

class MonitoredAssetRepository(AssetRepository):
    @monitor_performance
    async def list_assets(self, skip: int = 0, limit: int = 20, sort_by: str = 'created_at'):
        return await super().list_assets(skip, limit, sort_by)
```

## 결론

Motor를 효과적으로 사용하면:

1. **비동기 처리**: 많은 동시 요청을 효율적으로 처리
2. **연결 풀링**: 연결 재사용으로 성능 향상
3. **트랜잭션**: ACID 속성 보장
4. **인덱싱**: 쿼리 성능 최적화
5. **확장성**: 대규모 데이터 처리 가능

올바른 설정과 사용법을 통해 MongoDB 기반의 고성능 애플리케이션을 구축할 수 있습니다.
