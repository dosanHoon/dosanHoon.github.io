---
title: Mobx 최적화
date: "2019-01-01T23:46:37.121Z"
template: "post"
draft: false
slug: "/posts/react-mobx"
category: "MOBX"
tags:
  - "javascript"
  - "react"
  - "mobx"
description: "Mobx 최적환 관련 기록"
---

# Mobx 최적화

## mobx-react-devtools 개발도구 설치

```bash
$ npm install mobx-react-devtools
```

```jsx
import React, { Component } from "react";
import DevTools from "mobx-react-devtools";

class App extends Component {
  render() {
    return <div>{process.env.NODE_ENV === "development" && <DevTools />}</div>;
  }
}

export default App;
```

- 필수는 아니지만 업데이트에 대한 세부 내용을 확인 할수 있게 해줌.

## functional component mobx inject

React 함수형 컴포넌트에서 mobx 를 inject 하는 방식  
컴포넌트 선언부가 아닌 export 에서 inject 하는게 더 가독성이 좋다.

### before

```jsx
const Component = inject("mobxStore")(
  observer(({ props }) => {
    // ....생략
  })
);

export default Component;
```

### better

```jsx
const Component = ({ props }) => {
  // ....생략
};

export default inject("mobxStore")(observer(Component));
```

#### or

```jsx
const Component = ({ props }) => {
  // ....생략
};

export default inject(({ mobxStore }) => ({
  mobxStore: mobxStore
}))(observer(Component));
```

## @observer , observer

@observable 데이터를 사용하는 component 는 부모에서 props 로 받더라도 @observer 해주는게 성능 향상

```jsx
const Component = ({ props }) => {
  return (
    //생략
  );
};

export default observer(Component)
```

## React render 최적화

### list render 는 별도로

#### Bad:

```jsx
@observer
class MyComponent extends Component {
  render() {
    const { todos, user } = this.props;
    return (
      <div>
        {user.name}
        <ul>
          {todos.map(todo => (
            <TodoView todo={todo} key={todo.id} />
          ))}
        </ul>
      </div>
    );
  }
}
```

#### Good:

```jsx
@observer class MyComponent extends Component {
    render() {
        const {todos, user} = this.props;
        return (<div>
            {user.name}
            <TodosView todos={todos} />
        </div>)
    }
}

@observer class TodosView extends Component {
    render() {
        const {todos} = this.props;
        return <ul>
            {todos.map(todo => <TodoView todo={todo} key={todo.id} />)}
        </ul>)
    }
}
```

- user.name 이 변경될때도 리렌더링 되기 때문에 리스트 render 는 별도로 분리 하는게 좋다

### Index as a key is an anti-pattern

- 배열 인덱스를 key 로 사용하지 않도록
- 배열 인덱스 데이터 추가 삭제등에 의해서 변경될수 있다.
- id 같은 공유한 시퀀스로 key 를 잡아야 된다
  [index key 참고](https://medium.com/@robinpokorny/index-as-a-key-is-an-anti-pattern-e0349aece318)

### Dereference values late

- 가능한 한 늦게 값을 세부 참조하는 것이 좋다.
- 세부 참조하는 구성 요소를 리 랜더링하기 때문에 최소한의 구성 요소를 랜더링하기 위해서

#### Bad

```jsx
<DisplayName name={person.name} />
```

#### Better

```jsx
<DisplayName person={person} />
```

- 전자는 아무런 문제가 없지만, name 속성이 변경될 경우 후자는 DisplayName 만 다시 랜더링 되고 전자의 경우 부모 컴포넌트까지 다시 랜더링됨

### 초기 함수 바인딩

#### Bad :

```jsx
render() {
    return <MyWidget onClick={() => { alert('hi') }} />
}
```

#### Better :

```jsx
render() {
    return <MyWidget onClick={this.handleClick} />
}

handleClick = () => {
    alert('hi')
}
```
