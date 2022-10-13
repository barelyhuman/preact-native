import {
  createDOM,
  registerNativeDOM,
  SafeAreaView,
  View,
  Text,
} from '@barelyhuman/preact-native'
import { Alert } from 'react-native'

/** @jsxImportSource preact */
import { Component, render } from 'preact'

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
        <SafeAreaView>
          <View
            backgroundColor="black"
            margin={10}
            borderRadius={10}
            justifyContent="center"
            alignItems="center"
            padding={10}
            onClick={this.handleClick}
          >
            <Text color="white">Count {count}</Text>
          </View>
        </SafeAreaView>
      </>
    )
  }
}

export default App
