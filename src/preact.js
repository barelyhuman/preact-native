import { createDOM } from './dom'
import { registerNativeDOM } from './register-native-dom'
import { h, render } from 'preact'

export function withPreact(Component) {
  return ({ rootTag }) => {
    registerNativeDOM()
    global.document = createDOM(rootTag)
    render(h(Component), document)
    return null
  }
}
