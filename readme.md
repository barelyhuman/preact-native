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
// import the host components from react native
import { Text } from 'react-native'

// import the dom creation helpers from
// preact-native dom
import {
  Document,
  render,
  registerHostElement,
} from '@barelyhuman/preact-native/dom'

// create a DOM reference
global.document = new Document()

// register the host element to the dom
registerHostElement('Text', Text)

function App() {
  let count = 0

  // create an element from the one's you registered above
  const text = document.createElement('Text')

  // set it's text content
  text.textContent = count

  setInterval(() => {
    text.textContent = ++count
  }, 1000)

  // create a react compatible tree
  return render(text)
}
```

> **Note**: All react related stuff (react as a dep and render tree needing
> react) will be removed from the library once I can handle creation of all
> these native modules manually without having to re-write the entire react
> native base from scratch

## Roadmap

- [x] A minimal dom
- [ ] Create views from the bridge instead of rendering with react
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
