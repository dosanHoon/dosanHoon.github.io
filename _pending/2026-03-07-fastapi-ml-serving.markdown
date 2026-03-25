---
title: "FastAPI로 ML 모델 서빙하기"
date: "2026-03-07T09:00:00.000Z"
template: "post"
draft: false
slug: "/posts/fastapi-ml-model-serving"
category: "PYTHON"
tags:
  - "FastAPI"
  - "Machine Learning"
  - "FAISS"
  - "API Design"
description: "FastAPI를 이용한 머신러닝 모델 서빙 방법과 FAISS 벡터 검색, 비동기 처리, 성능 모니터링을 구현합니다."
---

## 소개

사내 프로젝트 백엔드에서는 머신러닝 모델을 활용한 상품 추천 기능을 제공합니다. FastAPI는 높은 성능과 자동 API 문서화를 제공하는 현대적인 Python 웹 프레임워크입니다. 이 글에서는 FastAPI를 사용해 ML 모델을 효율적으로 서빙하는 방법을 소개하겠습니다.

## FastAPI 기초 설정

```bash
# 필요한 패키지 설치
pip install fastapi uvicorn pydantic numpy scikit-learn faiss-cpu prometheus-client

# 또는 더 간단하게
pip install fastapi[all] faiss-cpu prometheus-client
```

## 기본 API 구조

```python
# main.py

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import numpy as np
from typing import List, Optional
import logging

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="ML Model Serving API",
    description="머신러닝 모델 서빙 API",
    version="1.0.0"
)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 요청 스키마
class PredictionRequest(BaseModel):
    """예측 요청 스키마"""
    features: List[float]
    model_name: str = "default"

class PredictionResponse(BaseModel):
    """예측 응답 스키마"""
    prediction: float
    confidence: float
    model_name: str

# 모델 로딩
class ModelManager:
    def __init__(self):
        self.models = {}
        self.load_models()

    def load_models(self):
        """모델 로드 (시작 시 한 번만 실행)"""
        try:
            # 실제 모델 로드
            import joblib
            self.models['default'] = joblib.load('models/default_model.pkl')
            logger.info("모델 로드 완료")
        except Exception as e:
            logger.error(f"모델 로드 실패: {e}")

    def predict(self, features: List[float], model_name: str = "default") -> tuple:
        """예측 수행"""
        if model_name not in self.models:
            raise ValueError(f"모델 '{model_name}' 없음")

        model = self.models[model_name]
        X = np.array(features).reshape(1, -1)

        # 예측
        prediction = model.predict(X)[0]

        # 신뢰도 계산 (모델에 따라 다름)
        if hasattr(model, 'predict_proba'):
            confidence = float(np.max(model.predict_proba(X)))
        else:
            confidence = 0.0

        return prediction, confidence

# 전역 모델 관리자
model_manager = ModelManager()

@app.post("/predict", response_model=PredictionResponse)
async def predict(request: PredictionRequest):
    """
    머신러닝 모델 예측

    - **features**: 예측에 필요한 특성 값 리스트
    - **model_name**: 사용할 모델 이름 (기본값: "default")
    """
    try:
        prediction, confidence = model_manager.predict(
            request.features,
            request.model_name
        )

        return PredictionResponse(
            prediction=prediction,
            confidence=confidence,
            model_name=request.model_name
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"예측 오류: {e}")
        raise HTTPException(status_code=500, detail="예측 실패")

@app.get("/health")
async def health():
    """헬스 체크"""
    return {"status": "healthy", "models_loaded": len(model_manager.models) > 0}
```

## FAISS를 이용한 벡터 검색

```python
# services/vector_search.py

import faiss
import numpy as np
from typing import List, Tuple
import logging

logger = logging.getLogger(__name__)

class VectorSearchService:
    """FAISS를 이용한 벡터 검색 서비스"""

    def __init__(self, dimension: int = 768):
        self.dimension = dimension
        self.index = None
        self.vectors = None
        self.metadata = []

    def build_index(self, vectors: np.ndarray, metadata: List[dict]):
        """FAISS 인덱스 구축"""
        try:
            # 벡터 정규화
            vectors = vectors.astype('float32')
            faiss.normalize_L2(vectors)

            # 인덱스 생성 (L2 거리)
            self.index = faiss.IndexFlatL2(self.dimension)
            self.index.add(vectors)

            # GPU 가속 (선택사항)
            # self.index = faiss.index_cpu_to_all_gpus(self.index)

            self.vectors = vectors
            self.metadata = metadata

            logger.info(f"인덱스 구축 완료: {len(vectors)} 벡터")
        except Exception as e:
            logger.error(f"인덱스 구축 실패: {e}")
            raise

    def search(self, query_vector: np.ndarray, k: int = 10) -> List[Tuple[dict, float]]:
        """유사한 벡터 검색"""
        if self.index is None:
            raise RuntimeError("인덱스가 구축되지 않음")

        query_vector = query_vector.astype('float32').reshape(1, -1)
        faiss.normalize_L2(query_vector)

        # 검색
        distances, indices = self.index.search(query_vector, k)

        results = []
        for idx, distance in zip(indices[0], distances[0]):
            if idx >= 0 and idx < len(self.metadata):
                results.append((self.metadata[int(idx)], float(distance)))

        return results

# 전역 벡터 검색 서비스
vector_search = VectorSearchService()

# 사용 예시
@app.post("/search-similar")
async def search_similar(
    query_vector: List[float],
    k: int = 10,
    threshold: float = 0.5
):
    """유사 벡터 검색"""
    try:
        query = np.array(query_vector).astype('float32')
        results = vector_search.search(query, k=k)

        # threshold 이상만 반환
        filtered_results = [
            {"metadata": meta, "distance": dist}
            for meta, dist in results
            if dist <= threshold
        ]

        return {
            "results": filtered_results,
            "count": len(filtered_results)
        }
    except Exception as e:
        logger.error(f"검색 오류: {e}")
        raise HTTPException(status_code=500, detail="검색 실패")
```

## 배치 처리 및 비동기 작업

```python
# services/batch_processor.py

from fastapi import BackgroundTasks
from typing import List
import asyncio
import logging

logger = logging.getLogger(__name__)

class BatchProcessor:
    """배치 처리 서비스"""

    def __init__(self):
        self.job_status = {}

    async def process_batch(self, job_id: str, features_list: List[List[float]]):
        """배치 예측 처리"""
        try:
            self.job_status[job_id] = {
                "status": "processing",
                "progress": 0,
                "results": []
            }

            results = []
            total = len(features_list)

            for i, features in enumerate(features_list):
                prediction, confidence = model_manager.predict(features)
                results.append({
                    "index": i,
                    "prediction": prediction,
                    "confidence": confidence
                })

                # 진행률 업데이트
                self.job_status[job_id]["progress"] = int((i + 1) / total * 100)

                # 다른 작업에 CPU 시간 양보
                await asyncio.sleep(0)

            self.job_status[job_id]["status"] = "completed"
            self.job_status[job_id]["results"] = results

        except Exception as e:
            logger.error(f"배치 처리 오류: {e}")
            self.job_status[job_id]["status"] = "failed"
            self.job_status[job_id]["error"] = str(e)

batch_processor = BatchProcessor()

@app.post("/batch-predict")
async def batch_predict(
    features_list: List[List[float]],
    background_tasks: BackgroundTasks
):
    """배치 예측 요청"""
    from uuid import uuid4

    job_id = str(uuid4())

    # 백그라운드에서 처리
    background_tasks.add_task(
        batch_processor.process_batch,
        job_id,
        features_list
    )

    return {"job_id": job_id, "status": "submitted"}

@app.get("/batch-predict/{job_id}")
async def get_batch_result(job_id: str):
    """배치 처리 결과 조회"""
    if job_id not in batch_processor.job_status:
        raise HTTPException(status_code=404, detail="작업을 찾을 수 없음")

    return batch_processor.job_status[job_id]
```

## 성능 모니터링 (Prometheus)

```python
# services/metrics.py

from prometheus_client import Counter, Histogram, Gauge
import time
from functools import wraps

# 메트릭 정의
prediction_counter = Counter(
    'predictions_total',
    'Total predictions',
    ['model_name', 'status']
)

prediction_duration = Histogram(
    'prediction_duration_seconds',
    'Prediction duration',
    ['model_name'],
    buckets=(0.01, 0.05, 0.1, 0.5, 1.0)
)

active_requests = Gauge(
    'active_requests',
    'Active requests'
)

# 데코레이터: 예측 성능 추적
def track_prediction(model_name: str):
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            active_requests.inc()
            start = time.time()

            try:
                result = await func(*args, **kwargs)
                prediction_counter.labels(
                    model_name=model_name,
                    status='success'
                ).inc()
                return result
            except Exception as e:
                prediction_counter.labels(
                    model_name=model_name,
                    status='error'
                ).inc()
                raise
            finally:
                duration = time.time() - start
                prediction_duration.labels(model_name=model_name).observe(duration)
                active_requests.dec()

        return wrapper
    return decorator

# Prometheus 메트릭 엔드포인트
from prometheus_client import generate_latest, CONTENT_TYPE_LATEST
from fastapi.responses import Response

@app.get("/metrics")
async def metrics():
    """Prometheus 메트릭"""
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)
```

## 요청 검증 및 에러 처리

```python
# schemas.py

from pydantic import BaseModel, Field, validator
from typing import List, Optional

class EmbeddingRequest(BaseModel):
    """임베딩 요청"""
    text: str = Field(..., min_length=1, max_length=10000)
    model: str = "default"

    @validator('text')
    def text_not_empty(cls, v):
        if not v.strip():
            raise ValueError('텍스트는 비어있을 수 없음')
        return v

class BatchPredictionRequest(BaseModel):
    """배치 예측 요청"""
    features_list: List[List[float]]
    model_name: str = "default"

    @validator('features_list')
    def validate_features(cls, v):
        if len(v) == 0:
            raise ValueError('최소 1개 이상의 샘플 필요')
        if len(v) > 10000:
            raise ValueError('최대 10000개의 샘플만 처리 가능')
        return v

# 커스텀 예외 처리
from fastapi.exceptions import RequestValidationError

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    """요청 검증 오류 처리"""
    return {
        "status": "error",
        "message": "요청 검증 실패",
        "details": exc.errors()
    }
```

## Docker 배포

```dockerfile
# Dockerfile

FROM python:3.10-slim

WORKDIR /app

# 시스템 패키지
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Python 의존성
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 애플리케이션 코드
COPY . .

# 모델 다운로드
RUN python scripts/download_models.py

# 포트 노출
EXPOSE 8000

# 헬스 체크
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

# 실행
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
```

```yaml
# docker-compose.yml

version: '3.8'

services:
  api:
    build: .
    ports:
      - "8000:8000"
    environment:
      - LOG_LEVEL=INFO
      - FAISS_ENABLE_GPU=false
    volumes:
      - ./models:/app/models
    restart: always

  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
```

## 성능 최적화

```python
# 1. 모델 캐싱
from functools import lru_cache

@lru_cache(maxsize=1000)
def get_cached_prediction(features_tuple: tuple):
    """예측 결과 캐싱"""
    return model_manager.predict(list(features_tuple))

# 2. 비동기 처리
import asyncio

async def parallel_predictions(requests_list: List[dict]):
    """병렬 예측"""
    tasks = [
        asyncio.create_task(
            asyncio.to_thread(
                model_manager.predict,
                req['features']
            )
        )
        for req in requests_list
    ]
    return await asyncio.gather(*tasks)

# 3. 모델 양자화 (선택사항)
def quantize_model(model):
    """모델 양자화로 메모리 감소"""
    import onnx
    from onnxruntime.quantization import quantize_dynamic

    quantize_dynamic("model.onnx", "model_quantized.onnx")
```

## 결론

FastAPI는 ML 모델 서빙을 위한 강력한 도구입니다. 비동기 처리, 자동 API 문서화, Prometheus 메트릭 지원 등의 기능으로 프로덕션 환경에 적합합니다. 특히 사내 3D 뷰어 프로젝트와 같은 대규모 프로젝트에서 안정적이고 확장 가능한 ML 서비스를 구축할 수 있습니다.
