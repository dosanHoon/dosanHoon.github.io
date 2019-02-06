---
title: Javascript 참조형 Deep copy
date: "2019-01-01T23:46:37.121Z"
template: "post"
draft: false
slug: "/posts/javascript-deep-copy"
category: "JAVASCRIPT"
tags:
  - "javascript"
description: "Javascript 참조형 Deep copy"
---

# Javascript 참조형 Deep copy

- 자바스크립트에서 Object 나 Array 는 참조형이다.

## Array

```javascript
var newArray = JSON.parse(JSON.stringify(oldArray));

var newArray = oldArray.slice();
```

## Object

```javascript
var newObject = Object.assign({}, oldObject);
```

단순 값만 복사한다면 위에 방법중 골라서 하면 된다.

다만 [{},{}] 나 {key:{},key:{}} 처럼

원소 값 또한 참조형이면 값을 복제하더라고 원소가 참조형이기 때문에

값을 변경하면 원본 자료도 값이 변경 된다.(자바스크립의 괴랄함..)

이떄는 json 을 이용한 방식으로 하면 가능 하다.

이외에도 함수로 구현하거나 lodash 등 자바스크립트 Superset 라이브러리등을 사용하는 방법 등이 있다.

개인적으론 Deep copy는 한글로 복제 shallow copy 는 참조 라고 하는게 자연스러운것 같다.
(prototype 과 property 모두를 복제 할려면 위 방법으로 해야 된다.)

[복제 알고리즘 참고](https://developer.mozilla.org/ko/docs/Web/API/Web_Workers_API/Structured_clone_algorithm)

[lodash deep clone 구현 코드](https://github.com/lodash/lodash/blob/4.17.5/lodash.js#L11078)

위 내용 참고해보면 재밌다.

알고리즘 사이트는 저런게 있는것도 처음 알았다는....

추후 자바스크립에 deep copy 메소드가 추가 되면 좋겟다.
