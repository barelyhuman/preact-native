import { createDOM } from './dom'
import { registerNativeDOM } from './register-native-dom'
import { h } from 'preact'

export function withPreact(Component, render) {
  return ({ rootTag }) => {
    registerNativeDOM()
    global.document = createDOM(rootTag)
    render(h(Component), document)
    return null
  }
}
