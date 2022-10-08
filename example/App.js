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
    // setInterval(() => {
    //   this.setState({ count: this.state.count + 1 })
    // }, 1000)
  }

  render() {
    return h('SafeAreaView', {}, h('Text', {}, `Count ${this.state.count}`))
  }
}

export default App
