# preact-native

> **Warning**: This is an experimental approach at creating a renderer for
> preact

> **Note**: until this reaches v1.0.0, the entire featureset might change,
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
2. Change `index.js` to include the `withPreact` from the library

```js
/**
 * @format
 */
import { AppRegistry } from 'react-native'
import App from './App'
import { name as appName } from './app.json'
import { withPreact } from '@barelyhuman/preact-native'

AppRegistry.registerComponent(appName, () => withPreact(App))
```

3. Then add the following to the top of the `App.js` file

```js
/** @jsxImportSource preact */
import { SafeAreaView, View, Text, TextInput } from '@barelyhuman/preact-native'
```

4. Once the above is setup, you can just go ahead and write preact components as
   usual.

> **Note**: instead of `preact/hooks` please use `@preact/signals` for the time
> being, once fixed this note will be removed

**Eg:**

```js
/** @jsxImportSource preact */
import { SafeAreaView, View, Text } from '@barelyhuman/preact-native'

export default function App() {
  return <Home />
}

function Home() {
  return (
    <>
      <SafeAreaView>
        <View>
          <Text color={'red'}>Hello</Text>
        </View>
      </SafeAreaView>
    </>
  )
}
```

> **Note**: All react related stuff (react as a dep and render tree needing
> react) will be removed from the library once I can handle creation of all
> these native modules manually without having to re-write the entire react
> native base from scratch

## Roadmap

- [x] A minimal dom
- [x] Create views from the bridge instead of rendering with react
  - [x] Create native views (Views created on the iOS and Android platform APIs)
  - [x] Create derived views (Views created on top of the above by manipulating
        the SDK)
- [x] Update view styles from the bridge
- [x] Update text nodes from the bridge
- [x] Add compat for preact to make it possible for preact to diff and render
      without the need for a react tree generator
      `import {render} from "preact-native/dom"`
- [ ] Handle events (presses, input, gestures) , aka events from preact will be
      on the DOM, need to be proxied as events to the Native SDK
- [x] Handling for Bridge level style props

## Contribute

read the [CONTRIBUTING.md](CONTRIBUTING.md)

## Why ?

It seemed like a nice project to try out my limits in terms of complicated stuff
and also because I got bored of building websites. Also, I personally think
preact has become a lot more stable and has less breaking changes every 3
versions thus making it easier to maintain and upgrade older projects.

## License

[MIT](/LICENSE) &copy; [reaper](https://reaper.is)
