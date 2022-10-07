# preact-native

> **Warning**: This is an experimental approach at creating a renderer for
> preact

> **Note**: untill this reaches v1.0.0, the entire featureset might change,
> since we are still figuring out what works best

I wouldn't really recommend using this for production but putting down the base
usage setup so that anyone who'd wish to help with development can at least get
a test environment ready.

## Install

```sh
$ npm install @barelyhuman/preact-native preact
```

## Usage

1. Setup a base react native project using `npx react-native init`
2. Change the App.js to this

```js
import { createDOM, registerNativeDOM } from '@barelyhuman/preact-native/dom'
import { Component, h, render } from 'preact'

let document

function App({ rootTag }) {
  // Register native components as dom compatible elements
  registerNativeDOM()
  // create a dom with the root container from react native
  document = createDOM(rootTag)
  global.document = document
  // render a preact component to the above DOM
  render(h(RenderableComponent, {}), document)
  return null
}

class RenderableComponent extends Component {
  state = {
    count: 0,
  }

  componentDidMount() {
    setInterval(() => {
      this.setState({ count: this.state.count + 1 })
    }, 1000)
  }

  render() {
    return h('SafeAreaView', {}, h('Text', {}, `Count ${this.state.count}`))
  }
}

export default App
```

> **Note**: All react related stuff (react as a dep and render tree needing
> react) will be removed from the library once I can handle creation of all
> these native modules manually without having to re-write the entire react
> native base from scratch

## Roadmap

- [x] A minimal dom
- [ ] Create views from the bridge instead of rendering with react
  - [x] Create native views (Views created on the iOS and Android platform APIs)
  - [ ] Create derived views (Views created on top of the above by manipulating the SDK)
- [x] Update view styles from the bridge
- [x] Update text nodes from the bridge
- [ ] Add compat for preact to make it possible for preact to diff and render
      without the need for a react tree generator
      `import {render} from "preact-native/dom"`

## Contribute

read the [CONTRIBUTING.md](CONTRIBUTING.md)

## Why ?

It seemed like a nice project to try out my limits in terms of complicated stuff
and also because I got bored of building websites. Also, I personally think
preact has become a lot more stable and has less breaking changes every 3
versions thus making it easier to maintain and upgrade older projects.

## License

[MIT](/LICENSE) &copy; [reaper](https://reaper.is)
