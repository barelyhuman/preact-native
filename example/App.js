/** @jsxImportSource preact */

import {
  TextInput,
  Text,
  View,
  SafeAreaView,
} from '@barelyhuman/preact-native/core'
import { registerNativeDOM, createDOM } from '@barelyhuman/preact-native/dom'
import { Component, render, h } from 'preact'
import { signal } from '@preact/signals'
import { Alert } from 'react-native'

let document

function App({ rootTag }) {
  // Register native components as dom compatible elements
  registerNativeDOM()

  // create a dom with the root container from react native
  document = createDOM(rootTag)
  global.document = document
  render(<TestRenderable />, document)
}

const count = signal(0)

function Counter() {
  const handleClick = () => {
    count.value += 1
  }

  return (
    <>
      <SafeAreaView>
        <Text fontSize={20} margin={10} color="white">
          {count.value}
        </Text>
        <View onClick={handleClick}>
          <Text fontSize={20} margin={10} color="white">
            Inc
          </Text>
        </View>
      </SafeAreaView>
    </>
  )
}

class TestRenderable extends Component {
  state = { email: '' }
  constructor(props) {
    super(props)
  }

  render() {
    return (
      <>
        <SafeAreaView backgroundColor="#181819">
          <View
            height="100%"
            width="100%"
            padding={10}
            alignItems="center"
            justifyContent="center"
          >
            <TextInput
              width={'100%'}
              height={52}
              marginBottom={8}
              padding={10}
              placeholder="email"
              borderRadius={10}
              borderWidth={1}
              borderColor="slategray"
              color="white"
              value={this.state.email}
              backgroundColor="transparent"
              onFocus={e => {
                console.log('focus')
              }}
              onBlur={e => {
                console.log('blur')
              }}
              onChange={e => {
                this.setState({ email: e.data })
              }}
            />
            <TextInput
              width={'100%'}
              height={52}
              marginBottom={8}
              padding={10}
              placeholder="password"
              secureTextEntry={true}
              borderRadius={10}
              borderWidth={1}
              borderColor="slategray"
              color="white"
              backgroundColor="transparent"
            />
            <View
              height={52}
              padding={15}
              width={'100%'}
              borderRadius={6}
              justifyContent="center"
              alignItems="center"
              backgroundColor="white"
              onClick={() => {
                Alert.alert(`Oh hey, ${this.state.email}`)
              }}
            >
              <Text fontSize={16} fontWeight="bold">
                Login
              </Text>
            </View>
          </View>
        </SafeAreaView>
      </>
    )
  }
}

export default App
