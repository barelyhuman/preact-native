import { createDOM, registerNativeDOM } from '@barelyhuman/preact-native/dom'
import { Component, h, render } from 'preact'

let document

function App({ rootTag }) {
  registerNativeDOM()
  document = createDOM(rootTag)
  global.document = document
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
