---
title: React 시작하기
date: "2019-01-01T23:46:37.121Z"
template: "post"
draft: false
slug: "/posts/start-react"
category: "REACT"
tags:
  - "javascript"
  - "react"
description: "React 시작하기"
---

# React 시작하기

## 현 상태

- Java 서버의 Tiles 로 프론트 구성
- ServerSide에 의존적임
- 프로젝트 졸라 복잡함

## 어떻게 리액트를 도입할까?

- 처음부터 다시 만들고 싶지만 비즈니스 로직에 대한 이해도 조차 낮은 상태
- Jsp 안에서 직접 받는 ServerSide 데이터도 많은 상태
- Tiles 에 해당하는 템플릿에 1:1로 컴포넌트를 작성하여 순차적으로 교체하는 방법 시도

## 초기 환경 설정

### 1. Global Package 설치

cli로 실행하기 위해서 필요한 패키지 설치

1. babel
2. webpack
3. webpack-dev-server  
   – 필수 아님(본인은 실제 자바 서버에서 데이터를 받으면서 테스트 하는 경우이기 때문에 필요가 없지만 보통은 webpack-dev-server 로 리액트 개발을 하고 배포나 테스트시에만 실제 product 서버를 켜서 bundle 된 output 만 가지고 확인하면 된다.)

```
$ npm install -g babel webpack webpack-dev-server
```

### 2. NPM INIT

```bash
$ npm init
```

- 기존 프로젝트내에 npm init 으로 초기 설정

### 3. Dependency 및 Plugin 설치

```
$ npm install --save react react-dom
```

```
$ npm install --save-dev babel-core babel-loader babel-preset-react babel-preset-es2015 webpack webpack-dev-server
```

- 위는 개발 환경에서만 사용되는 모듈이니 -dev 옵션

- package.json 파일을 확인하면 설치한 모듈이 명시되어 있는것을 확인 가능

```
"dependencies": {
  "react": "^16.2.0",
  "react-dom": "^16.2.0"
},
"devDependencies": {
  "babel-core": "^6.26.0",
  "babel-loader": "^7.1.2",
  "babel-preset-es2015": "^6.24.1",
  "babel-preset-react": "^6.24.1",
  "webpack": "^3.11.0",
  "webpack-dev-server": "^2.11.1"
}
```

(2018/2/19 기준 최신 버젼)

### 4. webpack 설정

```javascript
module.exports = {
  entry: "./src/index.js",

  output: {
    path: __dirname + "/public/",
    filename: "bundle.js"
  },

  devServer: {
    inline: true,
    port: 7777,
    contentBase: __dirname + "/public/"
  },

  module: {
    loaders: [
      {
        test: /\.js$/,
        loader: "babel-loader",
        exclude: /node_modules/,
        query: {
          cacheDirectory: true,
          presets: ["es2015", "react"]
        }
      }
    ]
  }
};
```

- 가장 기본적인 설정이니 entry 와 output 의 경로만 본인 프로젝트에 맞게 변경하면 됨

## webpack 명령어

```
$ webpack --watch
```

watch 옵션을 주면 entry 에 변경사항이 있으면 자동으로 bundle 작업을 함.  
("--watch" 옵션이 생각이 안나서 계속 "webpack watch"로 bundle 하니 에러가 나더라.....)

- webpack 개발 서버로 작업할시

```
$ webpack-dev-server --hot --host 0.0.0.0
```

많은 내용은 존경하는 velopert님의 블로그를 참고 했습니다.
[참고](https://velopert.com/814)
