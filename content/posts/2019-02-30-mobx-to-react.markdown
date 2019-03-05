---
title: Mobx는 언제 reaction 하는가?
date: "2019-02-20T23:46:37.121Z"
template: "post"
draft: false
slug: "/posts/mobx-to-react"
category: "MOBX"
tags:
  - "javascript"
  - "react"
  - "mobx"
description: "Mobx를 React를 사용할때 언제 reaction 하는 지에 대해서 "
---

Mobx를 React에서 사용할떄 언제 reaction 하는지에 대해서 가이드에 있는 내용 번역입니다.
오역과 직역이 난무하니 얼른 한글 가이드가 나왔으면 좋겠습니다.

## MobX는 무엇에 반응합니까?
MobX는 보통 당신이 기대하는 것과 정확하게 반응합니다. 즉, 사용 사례의 90 %에서 mobx가 "그냥 작동합니다"라는 의미입니다. 그러나 어느 시점에서 예상했던대로 작동하지 않을 수도 있습니다. 이 시점에서 MobX가 대응할 대상을 결정하는 방법을 이해하는 것은 매우 중요합니다.

| MobX는 `추적 된 함수(tracked function)`를 실행하는 `동안(during)` `읽혀 지는(reading)` `observable` 속성(property)에 반응 합니다.

* `읽기(reading)`는 객체의 속성을 역참조하는 것이며,(예 : user["name"] ,user.name )을 사용하여 수행 할 수 있습니다 .

* `추적 된 함수(tracked function)`는 `computed` 식 , `observer component`의 `render()` 메소드  내지 첫 PARAM로 전달하는 when, reaction및 autorun등의 함수를 의미합니다.

* `during`은 함수가 실행되는 동안 읽혀지는 `observable` 항목 만 추적한다는 것을 의미합니다. 이러한 값이 추적 된 기능에 의해 직접적으로 또는 간접적으로 사용되는지는 중요하지 않습니다.
즉, MobX는 다음에 반응하지 않습니다.

* `observable`에서 획득한 값이지만 `추적 된 함수` 외부에서 얻은 값
* 비동기 적으로 호출 된 코드 블록에서 읽은 `observable`

## MobX는 값이 아닌 속성 액세스를 추적합니다.

위의 규칙을 예제로 자세히 설명하기 위해 다음과 같은 `observable` 데이터 구조가 있다고 가정합니다.
(`observable`은 기본이 재귀적으로 적용되므로 이 예제의 모든 필드를 관찰 할 수 있습니다.)

```javascript
let message = observable({
    title: "Foo",
    author: {
        name: "Michel"
    },
    likes: [
        "John", "Sara"
    ]
})
```


메모리는 다음과 같이 보입니다. 녹색 상자는 observable 속성을 나타냅니다.
* 유의 : 값 자체는 observable되지 않습니다!

![data](https://github.com/mobxjs/mobx/raw/gh-pages/docs/images/observed-refs.png)

이제 MobX는 기본적으로 어떤 화살표를 사용하여 함수를 수행 하는지 기록 합니다.  
그 후 이 화살표 중 하나가 변경 될 때(그들이 다른 것을 참조하기 시작할 때)마다 다시 실행 됩니다.

#### Examples

위에서 정의 된 message 변수를 기반으로 한 많은 예제를 통해 알 수 있습니다.

Correct: dereference inside the tracked function

```javascript
autorun(() => {
    console.log(message.title)
})
message.title = "Bar"
```

이것은 예상대로 반응하고, .title속성은 자동 실행에 의해 참조 해제되고 나중에 변경되므로이 변경 사항이 감지됩니다.

trace()추적 된 기능 내에서 호출하여 MobX가 추적 할 내용을 확인할 수 있습니다 . 위의 함수의 경우 다음을 출력합니다.

```javascript
const disposer = autorun(() => {
    console.log(message.title)
    trace()
})

// Outputs:
// [mobx.trace] 'Autorun@2' tracing enabled
message.title = "Hello"
// [mobx.trace] 'Autorun@2' is invalidated due to a change in: 'ObservableObject@1.title'
```

It is also possible to get the internal dependency (or observer) tree by using the designated utilities for that:

getDependencyTree(disposer) // prints the dependency tree of the reaction coupled to the disposer
// { name: 'Autorun@4',
//  dependencies: [ { name: 'ObservableObject@1.title' } ] }
Incorrect: changing a non-observable reference
autorun(() => {
    console.log(message.title)
})
message = observable({ title: "Bar" })
This will not react. message was changed, but message is not an observable, just a variable which refers to an observable, but the variable (reference) itself is not observable.