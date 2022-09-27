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
2. Change the index.js to look like so

```js
import { Renderer } from '@barelyhuman/preact-native'
import { AppRegistry } from 'react-native'
import App from './App'
import { name as appName } from './app.json'

const Main = () => {
  return <Renderer rootNode={App} />
}

AppRegistry.registerComponent(appName, () => Main)
```

3.Now, the `App.js` file and sub components can be written using preact, heres
an example.

```js
// App.js
/** @jsxImportSource preact */
import { makeComponent } from '@barelyhuman/preact-native/src'
import { signal } from '@preact/signals' // => install this if you are using this example

import {
  SafeAreaView as RSafeAreaView,
  Text as RText,
  TouchableOpacity as RTouchableOpacity,
} from 'react-native'

const SafeAreaView = makeComponent(RSafeAreaView, 'SafeAreaView')
const Text = makeComponent(RText, 'Text')
const TouchableOpacity = makeComponent(RTouchableOpacity, 'TouchableOpacity')

const count = signal(0)

export default function Home() {
  return (
    <SafeAreaView>
      <TouchableOpacity
        onPress={() => {
          count.value += 1
        }}
      >
        <Text style={{ color: 'dodgerblue', padding: 8 }}>{count.value}</Text>
      </TouchableOpacity>
    </SafeAreaView>
  )
}
```

## Why ?

It seemed like a nice project to try out my limits in terms of complicated stuff
and also because I got bored of building websites. Also, I personally think
preact has become a lot more stable and has less breaking changes every 3
versions thus making it easier to maintain and upgrade older projects.

## License

[MIT](/LICENSE) &copy; [reaper](https://reaper.is)
