---
title: "Jenkins로 모노레포 CI/CD 파이프라인 구축하기"
date: "2026-03-16T09:20:00.000Z"
template: "post"
draft: false
slug: "/posts/jenkins-cicd-pipeline"
category: "DEVOPS"
tags:
  - "Jenkins"
  - "CI/CD"
  - "Docker"
description: "turborepo 기반의 모노레포 환경에서 Jenkins를 사용하여 자동화된 CI/CD 파이프라인을 구축한 경험을 공유합니다."
---

## 개요

사내 모노레포 프로젝트에서 Jenkins를 활용하여 지속적 통합 및 배포를 자동화했습니다. 이 글에서는 파이프라인 스크립트 작성, Docker 빌드, 환경 변수 관리, 아티팩트 레지스트리 통합 방법을 설명합니다.

## Jenkins 파이프라인 기본 구조

### 1. Jenkinsfile 작성

프로젝트 루트에 배치하는 `Jenkinsfile`:

```groovy
pipeline {
    agent any

    options {
        // 이전 빌드 5개만 유지
        buildDiscarder(logRotator(numToKeepStr: '5'))
        // 빌드 제한시간: 30분
        timeout(time: 30, unit: 'MINUTES')
        // 동시 빌드 방지
        disableConcurrentBuilds()
    }

    environment {
        // 환경 변수 설정
        NODE_VERSION = '18.19.0'
        DOCKER_REGISTRY = 'gcr.io/my-project'
        ARTIFACT_REGISTRY = 'us-central1-npm.pkg.dev/my-project/npm'
    }

    stages {
        stage('Checkout') {
            steps {
                script {
                    echo "체크아웃: ${env.GIT_BRANCH}"
                }
                checkout scm
            }
        }

        stage('Setup') {
            steps {
                script {
                    echo "환경 설정 중..."
                    // Node.js 버전 확인
                    sh 'node --version'
                    sh 'npm --version'
                    // 의존성 설치
                    sh 'npm ci'
                }
            }
        }

        stage('Lint') {
            steps {
                script {
                    echo "코드 품질 검사 중..."
                }
                sh 'npm run lint'
            }
        }

        stage('Test') {
            steps {
                script {
                    echo "테스트 실행 중..."
                }
                sh 'npm run test -- --coverage'
            }
        }

        stage('Build') {
            steps {
                script {
                    echo "빌드 중..."
                    sh 'npm run build'
                }
            }
        }

        stage('Build Docker Image') {
            when {
                branch 'main'
            }
            steps {
                script {
                    echo "Docker 이미지 빌드 중..."
                    sh '''
                        docker build -t ${DOCKER_REGISTRY}/app:${BUILD_NUMBER} .
                        docker tag ${DOCKER_REGISTRY}/app:${BUILD_NUMBER} ${DOCKER_REGISTRY}/app:latest
                    '''
                }
            }
        }

        stage('Push to Registry') {
            when {
                branch 'main'
            }
            steps {
                script {
                    echo "레지스트리에 푸시 중..."
                    sh '''
                        docker push ${DOCKER_REGISTRY}/app:${BUILD_NUMBER}
                        docker push ${DOCKER_REGISTRY}/app:latest
                    '''
                }
            }
        }

        stage('Deploy') {
            when {
                branch 'main'
            }
            steps {
                script {
                    echo "배포 중..."
                    sh '''
                        kubectl set image deployment/app \
                            app=${DOCKER_REGISTRY}/app:${BUILD_NUMBER} \
                            --record
                    '''
                }
            }
        }
    }

    post {
        always {
            // 테스트 리포트 수집
            junit 'packages/*/coverage/junit.xml'
            // 커버리지 리포트
            publishHTML([
                reportDir: 'packages/app/coverage',
                reportFiles: 'index.html',
                reportName: 'Coverage Report'
            ])
        }

        success {
            script {
                echo "빌드 성공!"
                // 성공 알림
                sh 'curl -X POST https://slack-webhook-url -d "Build successful"'
            }
        }

        failure {
            script {
                echo "빌드 실패!"
                // 실패 알림
                sh 'curl -X POST https://slack-webhook-url -d "Build failed"'
            }
        }

        cleanup {
            deleteDir()
        }
    }
}
```

## 선택적 빌드 (변경된 패키지만)

모노레포에서는 변경된 패키지만 빌드하여 시간을 단축할 수 있습니다:

```groovy
pipeline {
    agent any

    stages {
        stage('Detect Changes') {
            steps {
                script {
                    // 변경된 파일 감지
                    sh '''
                        git fetch origin main
                        CHANGED_FILES=$(git diff --name-only origin/main...HEAD)
                        echo "Changed files: $CHANGED_FILES"
                    '''
                }
            }
        }

        stage('Build Changed Packages') {
            steps {
                script {
                    sh '''
                        npx turbo run build \
                            --filter="...[origin/main]" \
                            --since=HEAD
                    '''
                }
            }
        }

        stage('Test Changed Packages') {
            steps {
                script {
                    sh '''
                        npx turbo run test \
                            --filter="...[origin/main]" \
                            --coverage
                    '''
                }
            }
        }
    }
}
```

## Docker 멀티 스테이지 빌드

`Dockerfile`:

```dockerfile
# 빌드 스테이지
FROM node:18.19.0-alpine AS builder

WORKDIR /app

# 의존성 설치
COPY package*.json .npmrc ./
RUN npm ci

# 소스 코드 복사
COPY . .

# 빌드 실행
RUN npm run build

# 프로덕션 스테이지
FROM node:18.19.0-alpine

WORKDIR /app

# 빌드 결과 및 필요한 파일만 복사
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

# 헬스체크
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# 포트 노출
EXPOSE 3000

# 실행
CMD ["node", "dist/index.js"]
```

## 환경 변수 관리

### 1. Jenkins Credentials 사용

```groovy
pipeline {
    agent any

    environment {
        // Jenkins에서 관리하는 시크릿
        DATABASE_URL = credentials('db-url-prod')
        API_KEY = credentials('api-key-prod')
        DOCKER_CREDENTIALS = credentials('docker-registry-creds')
    }

    stages {
        stage('Build') {
            steps {
                script {
                    sh '''
                        cat > .env <<EOF
DATABASE_URL=${DATABASE_URL}
API_KEY=${API_KEY}
NODE_ENV=production
EOF
                    npm run build
                '''
                }
            }
        }
    }
}
```

### 2. Jenkins 구성에서 변수 주입

`Jenkinsfile`:

```groovy
pipeline {
    agent any

    stages {
        stage('Build') {
            steps {
                script {
                    // 빌드 시 환경 변수 전달
                    withEnv([
                        'DATABASE_URL=postgresql://user:pass@host/db',
                        'LOG_LEVEL=info'
                    ]) {
                        sh 'npm run build'
                    }
                }
            }
        }

        stage('Deploy') {
            steps {
                script {
                    // 배포 시 다른 환경 변수
                    withEnv(['ENVIRONMENT=production']) {
                        sh './deploy.sh'
                    }
                }
            }
        }
    }
}
```

## 아티팩트 관리

### 1. npm 패키지 발행

```groovy
stage('Publish NPM Package') {
    when {
        tag "v*"
    }
    steps {
        script {
            sh '''
                npm config set registry ${ARTIFACT_REGISTRY}
                npm config set //${ARTIFACT_REGISTRY#https://}:_authToken=${NPM_TOKEN}
                npm publish
            '''
        }
    }
}
```

### 2. Docker 이미지 관리

```groovy
stage('Push Docker Image') {
    steps {
        script {
            sh '''
                # 로그인
                echo ${DOCKER_PASSWORD} | docker login -u ${DOCKER_USERNAME} --password-stdin

                # 이미지 빌드 및 태그
                docker build -t ${DOCKER_REGISTRY}/app:${VERSION} .
                docker tag ${DOCKER_REGISTRY}/app:${VERSION} ${DOCKER_REGISTRY}/app:latest

                # 푸시
                docker push ${DOCKER_REGISTRY}/app:${VERSION}
                docker push ${DOCKER_REGISTRY}/app:latest

                # 정리
                docker logout
            '''
        }
    }
}
```

## 배포 전략

### 1. Blue-Green 배포

```groovy
stage('Deploy Blue-Green') {
    steps {
        script {
            sh '''
                # 현재 배포 확인
                CURRENT=$(kubectl get service app-service -o jsonpath='{.spec.selector.version}')

                if [ "$CURRENT" = "blue" ]; then
                    TARGET="green"
                else
                    TARGET="blue"
                fi

                # 신규 버전 배포
                kubectl set image deployment/app-${TARGET} \
                    app=${DOCKER_REGISTRY}/app:${BUILD_NUMBER}

                # 헬스 체크 대기
                kubectl rollout status deployment/app-${TARGET}

                # 서비스 전환
                kubectl patch service app-service \
                    -p '{"spec":{"selector":{"version":"'${TARGET}'"}}}'

                echo "배포 완료: $TARGET"
            '''
        }
    }
}
```

### 2. Canary 배포

```groovy
stage('Deploy Canary') {
    steps {
        script {
            sh '''
                # Canary 버전 배포 (5% 트래픽)
                kubectl set image deployment/app-canary \
                    app=${DOCKER_REGISTRY}/app:${BUILD_NUMBER}

                kubectl rollout status deployment/app-canary

                # 메트릭 모니터링 (1시간)
                sleep 3600

                # 메트릭 확인 및 롤백 또는 전체 배포 결정
                ERROR_RATE=$(kubectl top pod | grep app-canary | awk '{print $3}')

                if [ "${ERROR_RATE}" -gt 5 ]; then
                    kubectl rollout undo deployment/app-canary
                    echo "롤백 완료"
                else
                    # 전체 배포
                    kubectl set image deployment/app \
                        app=${DOCKER_REGISTRY}/app:${BUILD_NUMBER}
                    echo "전체 배포 완료"
                fi
            '''
        }
    }
}
```

## 모니터링 및 로깅

```groovy
stage('Monitor') {
    steps {
        script {
            sh '''
                # 배포 후 헬스 체크
                for i in {1..30}; do
                    if curl -f http://app:3000/health; then
                        echo "앱이 정상 작동 중입니다"
                        exit 0
                    fi
                    echo "재시도 $i/30"
                    sleep 10
                done

                echo "헬스 체크 실패"
                exit 1
            '''
        }
    }
}
```

## 롤백 전략

```groovy
stage('Rollback') {
    when {
        expression {
            return env.ROLLBACK == 'true'
        }
    }
    steps {
        script {
            sh '''
                # 이전 버전으로 롤백
                kubectl rollout undo deployment/app --to-revision=1

                kubectl rollout status deployment/app

                echo "롤백 완료"
            '''
        }
    }
}
```

## 실제 워크플로우 예제

```groovy
pipeline {
    agent any

    triggers {
        // PR 생성 시 자동 빌드
        githubPullRequest(
            prNumber: "${env.ghprbPullId}",
            autoCloseFailedPullRequests: false,
            skipBuildPhrase: 'skip ci'
        )
        // 메인 브랜치 푸시 시 배포
        githubPush()
    }

    stages {
        stage('Code Quality') {
            parallel {
                stage('Lint') {
                    steps {
                        sh 'npm run lint'
                    }
                }
                stage('Type Check') {
                    steps {
                        sh 'npm run type-check'
                    }
                }
                stage('Security Audit') {
                    steps {
                        sh 'npm audit --production'
                    }
                }
            }
        }

        stage('Test') {
            steps {
                sh 'npm run test -- --coverage --watchAll=false'
            }
        }

        stage('Build & Push') {
            when {
                branch 'main'
            }
            steps {
                sh 'npm run build'
                sh '''
                    docker build -t ${DOCKER_REGISTRY}/app:${BUILD_NUMBER} .
                    docker push ${DOCKER_REGISTRY}/app:${BUILD_NUMBER}
                '''
            }
        }

        stage('Deploy to Staging') {
            when {
                branch 'develop'
            }
            steps {
                sh '''
                    kubectl set image deployment/app-staging \
                        app=${DOCKER_REGISTRY}/app:${BUILD_NUMBER} \
                        -n staging
                '''
            }
        }

        stage('Deploy to Production') {
            when {
                branch 'main'
            }
            steps {
                sh '''
                    kubectl set image deployment/app \
                        app=${DOCKER_REGISTRY}/app:${BUILD_NUMBER} \
                        -n production
                '''
            }
        }
    }

    post {
        always {
            junit 'coverage/junit.xml'
            publishHTML([
                reportDir: 'coverage',
                reportFiles: 'index.html',
                reportName: 'Code Coverage'
            ])
        }
    }
}
```

## 결론

Jenkins를 활용한 모노레포 CI/CD 파이프라인의 핵심:

1. **자동화**: 수동 개입 최소화
2. **빠른 피드백**: 변경사항에 대한 즉각적인 피드백
3. **신뢰성**: 일관된 빌드 및 배포 프로세스
4. **확장성**: 새로운 단계 추가 용이
5. **모니터링**: 배포 후 상태 감시

이러한 파이프라인으로 안정적인 배포와 빠른 개발 주기를 동시에 달성할 수 있습니다.
