---
title: MOBX Common pitfalls & best practices
date: "2019-02-20T23:46:37.121Z"
template: "post"
draft: false
slug: "/posts/react-mobx-guide"
category: "MOBX"
tags:
  - "javascript"
  - "react"
  - "mobx"
description: "mobx 삽질의 연속을 줄여줄 Common pitfalls & best practices "
---

mobx 공식 가이드에 있는 내용입니다.
예전에 봤을때보다 내용이 추가 됐네요.
가전 제품사면 설명서 따위 버리는 버릇으로 개발하니 삽질의 연속이라 guide 부터 다시 읽기 시작했습니다.

# 잘못된 위치에서 IMPORT
## Importing from wrong location

```javascript
  // wrong
  import { observable } from "mobx/lib/mobx"
```
vscode 등에서 자동 import 기능 사용시 위와 같이 import 되는 경우가 있는데 위는 올바르지 않다.
항상 runtime 에러를 일으키는 것은 아니니 주의하자.

```javascript
  // correct
  import { observable } from "mobx"
```

# 데코레이터 관련 문제
## Issues with decorators?


### isArray ?
```javascript
  Array.isArray(observable([1,2,3])) === false
```
* MobX 4 이하에만 적용됩니다.

ES5에는 배열로부터 상속받는 신뢰할 수 있는 방법이 없으므로 "observable arrays"은 객체를 상속합니다. 이것은 정기적으로 라이브러리가 "observable array"을 일반 배열 
`(예 : lodash 또는 내장 작업과 같은 Array.concat)` 으로 인식 할 수 없음을 의미합니다 . 이는 `observable.toJS()`하거나 `observable.slice()`로 "observable array"을 다른 라이브러리로 전달하기 전에 간단히 해결할 수 있습니다 . 외부 라이브러리가 배열을 수정할 의도가 없으면 예상대로 완전히 작동합니다. `isObservableArray(observable)`관찰 가능한 배열인지 여부를 확인할 수 있습니다

### object.someNewProp = value
(원문 : object.someNewProp = value is not picked up
observer가 변경사항을 감지하지 못한다로 이해하시면 됩니다.)

* MobX 4 이하에 적용됩니다.

MobX5에서는 제한은 `observable() / observable.object()`로 생성되지 않은 클래스 인스턴스/객체에 적용됩니다 

MobX observable objects는 이전에 관찰 가능하다고 선언되지 않은 속성 할당을 감지하거나 이에 반응하지 않습니다. 따라서 MobX 관찰 가능 객체는 미리 정의 된 키가있는 레코드로 작동합니다. `extendObservable(target, props)`를 통해서 observable object에 새로운 속성을 추가하는 것이 가능합니다. 그러나 `for .. in` 또는 `Object.keys()` 같은 객체 반복문에서는 자동으로 반응하지 않습니다. MobX 4 이하에서 동적으로 키를 할당하는 객체가 필요한 경우 (예 : id로 user를 저장 하는 경우) `observable.map`을 이용하여 Map을 만들거나 Object API 에서 제공하는 유틸리티 메소드를 사용 하여야 합니다.

## @observer를 @observable를 렌더링하는 모든 컴포넌트에 사용하야 합니다.

@observer는 사용된 컴포넌트만 decorating 할뿐 component내부에 구성 요소에 대해서는 작동하지 않습니다.그래서 모든 component에 @observer를 decoration 해야 합니다.observer component들은 rendering을 더 효율적으로 만들어 주기때문에 걱정할 필요가 없습니다.


## observables 속성을 복사하거나 컴포넌트 내부에 저장하면 안됩니다.

Observer components는 render method 내부에서 액세스되는 데이터만 추적합니다. 흔히 볼 수있는 실수가 observable property 에서 복사한 데이터와 컴포넌트에 내부에 저장한 데이터가 관측되지 않는 것입니다.

```javascript
class User {
  @observable name
}

class Profile extends React.Component {
  name

  componentWillMount() {
    // Wrong
    // user.name 를 한번만 복사합니다. 해당 메소드는 라이프 사이클에서 반복되지 않으므로 추후 변경되는 데이터는 업데이트 되지 않습니다.
    // 이러한 할달은 중복되는 데이터를 생성합니다.
    this.name = this.props.user.name
  }

  render() {
    return <div>{this.name}</div>
  }
}
```

올바른 접근법은 observable value를 로컬에 저장하지 않는 것입니다 (분명히 위의 예제는 간단하지만 부자연스러운것입니다). 또는 계산 된 프로퍼티로 정의하면됩니다.

```javascript
class User {
  @observable name
}

class Profile extends React.Component {
  @computed get name() {
    // computed property 는 user.name 을 추적합니다.
    return this.props.user.name
  }

  render() {
    return <div>{this.name}</div>
  }
}

```

## 렌더 콜백은 render 메소드의 일부 가 아닙니다.

왜냐하면 현재 구성 요소 observer의 render 메소드 에만 정확하게 적용 되기 때문입니다 . 렌더링 콜백 또는 구성 요소를 하위 구성 요소에 전달해도 자동으로 반응하지 않습니다. 자세한 내용 은 Mobx는 무엇에 반응하는가를 참고하세요
[Mobx는 무엇에 반응하는가](https://github.com/mobxjs/mobx/blob/gh-pages/docs/best/react.md#mobx-only-tracks-data-accessed-for-observer-components-if-they-are-directly-accessed-by-render)