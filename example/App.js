/** @jsxImportSource preact */

import {
  TextInput,
  Text,
  View,
  SafeAreaView,
} from '@barelyhuman/preact-native/core'
import { registerNativeDOM, createDOM } from '@barelyhuman/preact-native/dom'
import { Component, render, h } from 'preact'
import { Alert } from 'react-native'

let document

function App({ rootTag }) {
  // Register native components as dom compatible elements
  registerNativeDOM()

  // create a dom with the root container from react native
  document = createDOM(rootTag)
  global.document = document
  render(<Renderable />, document)
}

class Renderable extends Component {
  state = { count: 0 }

  constructor(props) {
    super(props)
    this.handleClick = this.handleClick.bind(this)
  }

  handleClick() {
    const { count } = this.state
    this.setState({ count: count + 1 })
  }

  render() {
    const { count } = this.state
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
              backgroundColor="transparent"
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
                Alert.alert('Yeah, no, not happening')
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
