---
title: mobx-react-guide
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

## 잘못된 위치에서 IMPORT
### Importing from wrong location

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

## 데코레이터 관련 문제
### Issues with decorators?


#### isArray ?
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

## 렌더 콜백은 render 메소드의 일부가 아닙니다.

왜냐하면 현재 구성 요소 observer의 render 메소드 에만 정확하게 적용 되기 때문입니다 . 렌더링 콜백 또는 구성 요소를 하위 구성 요소에 전달해도 자동으로 반응하지 않습니다. 자세한 내용 은 Mobx는 무엇에 반응하는가를 참고하세요
[Mobx는 무엇에 반응하는가](https://github.com/mobxjs/mobx/blob/gh-pages/docs/best/react.md#mobx-only-tracks-data-accessed-for-observer-components-if-they-are-directly-accessed-by-render)


```javascript
class Example extends Component {
  _renderList = ()=> { //=> render call back
    this.props.data.map(()=>{//...
    })
  }
  render(){
    return this._renderList()
  }
}
```

## 최대한 늦게 역참조해야 됩니다.
MobX는 많은 일을 할 수 있지만 원시값을 관찰할 수는 없습니다 (오브젝트로 랩핑해야 관찰 가능 [observable.box(value)참조] (https://mobx.js.org/refguide/boxed.html)). 따라서 관찰 할 수 있는 건 값이 아니라 객체의 속성 입니다. 이는 @observer이 실제로 역참조한 값에 반응한다는 사실을 의미합니다 . 


```javascript
ReactDOM.render(<Timer timerData={timerData.secondsPassed} />, document.body)
```
위의 예에서 Timer구성 요소는 다음과 같이 초기화 된 경우 반응 하지 않습니다 .

위 예제에서는 Timer에 `timerData.secondsPassed`의 현재 값이 전달되고, 이는 불변 값입니다.(모든 원시값은 JAVASCRIPT 에서 불변합니다.). 이 값는 더 이상 변경되지 않으므로 Timer는 결코 업데이트되지 않습니다. `secondsPassed`는 변경 될 값 이므로 Component 내부에서 접근해야 합니다. 혹은 항상 관찰 가능한 속성의 소유 객체를 전달해야 합니다. 자세한 내용 은 Mobx는 무엇에 반응하는가를 참고하세요
[Mobx는 무엇에 반응하는가](https://github.com/mobxjs/mobx/blob/gh-pages/docs/best/react.md#mobx-only-tracks-data-accessed-for-observer-components-if-they-are-directly-accessed-by-render)

## computed 값이 예상보다 자주 실행됩니다.

computed 속성이 일부 reaction(사용 중 autorun, observer등)에서 사용된게 아니라면,값이 요청될때마다 느리게 평가됩니다. (그래서 그들은 단지 보통 property로 동작합니다.) computed 속성은 종속된것이 관찰 된 경우에만 추적합니다. 이를 통해 MobX는 자주 사용되지 않는 computed 속성을 자동으로 중단 할 수 있습니다. 이 [블로그]https://hackernoon.com/becoming-fully-reactive-an-in-depth-explanation-of-mobservable-55995262a254)를 보거나   [#356](https://github.com/mobxjs/mobx/issues/356)의 설명을 보세요. 따라서 computed 속성이 효율적으로 보이지 않을 수 있습니다. 그러나 observer, autorun등을 사용하는 프로젝트에서 적용될 때, computed 속성은 매우 효율적입니다.

computed 속성은 트랜잭션 도중 자동으로 유지됩니다. 참고 :  [#452](https://github.com/mobxjs/mobx/pull/452) 및 [#489](https://github.com/mobxjs/mobx/pull/489)

computed 속성을 강제로 유지하려면 `keepAlive: true`옵션을 사용할 수 있지만 메모리 누수가 발생할 수 있습니다.

## 항상 reactions을 처리하십시오.

autorun, observe그리고 intercept의 모든 형식은 그들이 관찰 한 모든 객체가 가비지로 수집되는 경우에만 가비지 수집됩니다. 따라서 더 이상 필요하지 않을 때 메서드에서 반환 된 `디스 포저(disposer)` 함수를 사용하여 중지하는 것이 좋습니다. 일반적으로 대한 observe과 intercept는 thisdp targed돤 경우를 dispose가 필요하지 않습니다. autorun이 여러 가지 관측 대상을 관찰 할 수 있기 때문에 더욱 까다롭습니다. observable 객체가 하나라도 scope에 남아있다면 다른 모든 observable객체가 남아있습니다. 그래서 observable객체가 더 이상 필요하지 않을떄는 항상 dispose 해주는 것이 좋습니다.

예:

```javascript
const VAT = observable(1.20)

class OrderLIne {
    @observable price = 10;
    @observable amount = 1;
    constructor() {
        // this autorun will be GC-ed together with the current orderline instance
        this.handler = autorun(() => {
            doSomethingWith(this.price * this.amount)
        })
        // this autorun won't be GC-ed together with the current orderline instance
        // since VAT keeps a reference to notify this autorun,
        // which in turn keeps 'this' in scope
        this.handler = autorun(() => {
            doSomethingWith(this.price * this.amount * VAT.get())
        })
        // So, to avoid subtle memory issues, always call..
        this.handler()
        // When the reaction is no longer needed!
    }
}
```

### React Component에서 @observable를 사용할 때 버그가 있습니다.

react-hot-loader 를 사용할떄 데코레이터를 지원하지 않는 Uncaught TypeError: Cannot assign to read only property '__mobxLazyInitializers' of object에러가 발생합니다 . 사용하기 위해선 @observabl대신에 componentWillMount 에 extendObservable를 사용해야 합니다. 또는 react-hot-loader "^3.0.0-beta.2"이상으로 업그레이드 해야 합니다.

## React Component의 표시 이름이 설정되지 않았습니다.
`export const MyComponent = observer((props => <div>hi</div>))`를 사용하는 경우 devtools에 표시 이름이 표시되지 않습니다. 
다음과 같은 방법을 사용하여 이를 해결할 수 있습니다.

```javascript
// 1 (set displayName explicitly)
export const MyComponent = observer((props => <div>hi</div>))
myComponent.displayName = "MyComponent"

// 2 (MobX infers component name from function name)
export const MyComponent = observer(function MyComponent(props) { return <div>hi</div> })

// 3 (transpiler will infer component name from variable name)
const _MyComponent = observer((props => <div>hi</div>)) //
export const MyComponent = observer(_MyComponent)

// 4 (with default export)
const MyComponent = observer((props => <div>hi</div>))
export default observer(MyComponent)
```


http://mobxjs.github.io/mobx/best/stateless-HMR.html 또는 [#141](https://github.com/mobxjs/mobx/issues/141#issuecomment-228457886) # 141을 참고하십시오 .

## Oservable Array의 propType은 object입니다.

Oservable Array는 실제로는 객체이므로 `propTypes.object`를 준수합니다. Observable 객체에 대해서는 `mobx-react`가 명시적으로 PropTypes를 제공합니다 .

## React 네이티브에서 ListView 렌더링하기

ListView.DataSourcein React 네이티브는 실제 배열을 기대합니다. 관찰 가능한 배열은 실제로는 객체이므로 .slice()로 전달하기 전에 먼저 배열로 변환하십시오.
또한 ListView.DataSource자체를 Store로 이동하여 @computed로 자동 갱신 할 수 있으며, 이 단계는 component 레벨에서도 수행 할 수 있습니다.

```javascript
class ListStore {
  @observable list = [
    'Hello World!',
    'Hello React Native!',
    'Hello MobX!'
  ];

  ds = new ListView.DataSource({ rowHasChanged: (r1, r2) => r1 !== r2 });

  @computed get dataSource() {
    return this.ds.cloneWithRows(this.list.slice());
  }
}

const listStore = new ListStore();

@observer class List extends Component {
  render() {
    return (
      <ListView
        dataSource={listStore.dataSource}
        renderRow={row => <Text>{row}</Text>}
        enableEmptySections={true}
      />
    );
  }
}
```

자세한 내용은 [#476](https://github.com/mobxjs/mobx/issues/476)을 참조하십시오.

## propType을 선언하면 dev 모드에서 불필요한 렌더링이 발생할 수 있습니다.

참조 : https://github.com/mobxjs/mobx-react/issues/56

## Observer React Component의 (일부) React lifecycle method에 action.bound를 decorate 하지 않아야 합니다.

위에서 언급했듯이, 관찰 가능한 데이터를 사용하는 모든 React Component는 `@observer`로 decorate 되어야 합니다. 또한 React Component내부 함수에서 `observable` 데이터를 수정하려는 경우 해당 함수는 `@action`로 표시되어야합니다.
또한 this가 `class component`의 인스턴스를 참조하려면 @action.bound 사용해야합니다. 다음 클래스를 참고하세요.

```javascript
class ExampleComponent extends React.Component {
  @observable disposer // <--- this value is disposed in addActed

  @action.bound
  addActed() {
    this.dispose()
  }

  @action.bound
  componentDidMount() {
    this.disposer = this.observe(....) //<-- details don't matter
  }
}
```

마운트 된 ExampleComponent에서 addActed()를 호출하면, 디스 포저가 호출됩니다.
반면에 다음을 고려하세요.

```javascript
class ExampleComponent extends React.Component {
  @observable disposer // <--- this value is disposed in addActed

  @action.bound
  componentWillUnmount() {
    this.dispose()
  }

  @action.bound
  componentDidMount() {
    this.disposer = this.observe(....) //<-- details don't matter
  }
}
```

이 경우는 disposer가 결코 호출 되지 않을 것입니다! 그 이유는 observer되는 ExampleComponentan을 만들기위한 mixin에 있습니다. componentWillUnmount함수가 예기치 않은 React.Component 인스턴스로 this를 변경합니다.
이 문제를 해결하려면 componentWillUnmount()다음과 같이 선언하십시오 .

```javascript
componentWillUnmount() {
  runInAction(() => this.dispose())
}
```



