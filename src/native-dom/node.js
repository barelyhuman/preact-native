import { createBinding } from './bridge'
import { BINDING, NODES } from './shared'

export class Node {
  parent = null
  children = []
  constructor(localName) {
    this.localName = localName
    const binding = createBinding(this)
    this.id = binding.id
    this[BINDING] = binding
    NODES.set(binding, this)
  }

  get ref() {
    return this.nativeRef
  }

  set ref(val) {
    this.nativeRef = val
  }

  get parentNode() {
    return this.parent
  }

  appendChild(node) {
    node.parent = this
    this.children.push(node)
  }

  removeChild(node) {
    this.children = this.children.filter(x => x.id === node.id)
  }
}
