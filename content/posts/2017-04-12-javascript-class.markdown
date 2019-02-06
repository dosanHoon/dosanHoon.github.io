---
title: Javascript Class 에 대한 이해
date: "2019-01-01T23:46:37.121Z"
template: "post"
draft: false
slug: "/posts/javascript-class"
category: "JAVASCRIPT"
tags:
  - "javascript"
  - "class"
description: "Javascript Class 에 대한 이해"
---

# Class & Module

## Class

### 9.2 생성자와 prototype

- class 객체는 생성자로 구분 되지 않는다.
- 객체는 prototype 으로 구분 된다.
- 하지만 동일한 prototype일 경우 동일한 prototype.constructor 프로퍼티를 상속 받는다.

```javascript
function 생성자1() {
  this.x = "생성자1 프로퍼티";
}

생성자1.prototype.y = "생성자1 프로토타입";

function 생성자2() {
  this.x = "생성자2 프로퍼티";
}

생성자2.prototype = 생성자1.prototype;

var 클래스1 = new 생성자1();

var 클래스2 = new 생성자2();

클래스1 instanceof 생성자2; //true

클래스2 instanceof 생성자1; //true

(클래스1.constructor == 클래스2.constructor) == 생성자1; //?
```

### 9.3 자바 스타일 클래스

- 생성자 객체
  - 클래스를 정의 하는 함수 객체
  - 생성자의 프로퍼티는 클래스 필드와 클래스 메서드
- 프로포타입 객체
  - 프로퍼티를 인스턴스 객체에 상속
  - 프로퍼티가 함수일 경우 인스턴스 메서드
- 인스턴스 객체

  - 생성자를 통해 프로토타입을 상속 받은 객체
  - 프로퍼티는 인스턴스 필드

- 자바 등 클래스 지원 언어의 멤버 유형을 관용적으로 자바스크립트에서 구현하는 방법

```javascript
function Person(value) {
  this.name = value; //name 은 인스턴스 필드
  this.getName = function() {
    console.log(this);
    console.log(this.name);
  };
  this.setName = function(value) {
    this.name = value;
  };
}

Person.prototype.gender = "";
Person.prototype.getGender = function() {
  console.log(this);
  console.log(this.gender);
};
Person.prototype.setGender = function(value) {
  this.gender = value;
};
//prototype의 프로퍼티 gender는 prototype의 프로퍼티
//prototype의 프로퍼티 함수는 인스턴스 메소드 책에서는 상속이라고 하지만 참조가 더 맞는 표현인듯

Person.MAN = "man"; //클래스 필드
Person.WOMAN = "woman";
Person.WTF = function(value) {
  //클래스 메소드
  console.log(this);
  console.log(Person.MAN + Person.WOMAN);
};
//클래스 멤버는 인스턴스에 상속 되지 않는다.
//인스턴스.constructor 를 통해 접근 가능
```

### 9.4 클래스 확장하기

- 인스턴스가 생성된 이후에도 prototype 통해서 클래스 확장이 가능하다

```javascript
var n = 3;
undefined;
n.times(function(n) {
  console.log(n + "hello");
});
Number.prototype.times = function(f, context) {
  var n = Number(this);
  for (var i = 0; i < n; i++) f.call(context, i);
};
```

### 9.5 클래스 자료형

- classof ㄴㄴ
- class 타입에 대한 검사

```javasciprt
 isPrototypeOf()
 instanceof
```

### Duck typing

- 인스턴스의 클래스 타입인지 검사하기 위해 인스턴스의 특성을 검사하여 클래스는 유추하는 방식
