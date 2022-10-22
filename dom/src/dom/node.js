import { Binding } from './binding'
import { BINDING } from './constants'
import { registry } from './registry'
import { getChildIndex } from './utils'

export class Node {
  children = []
  parent = null

  constructor(name, nodeType) {
    this._nodeType = nodeType
    this._nativeInstance = null
    this.localName = name

    // create binding to the bridge for the node
    const binding = new Binding(this)
    this[BINDING] = binding
    registry.addBinding(binding)
  }

  get nodeType() {
    return this._nodeType
  }

  set nodeType(_readOnly) {}

  get parentNode() {
    return this.parent
  }

  set parentNode(node) {
    this.parent = node
  }

  get childNodes() {
    return this.children
  }

  get firstChild() {
    return this.children.length > 0 ? this.children[0] : null
  }

  set firstChild(_readOnly) {}

  get lastChild() {
    return this.children.length > 0
      ? this.children[this.children.length - 1]
      : null
  }

  set lastChild(_readOnly) {}

  hasChildNodes() {
    return this.children.length > 0
  }

  // TODO:
  cloneNode() {
    return
  }

  insertBefore(node, refNode) {
    const old = this.children.slice()
    const index = getChildIndex(this, refNode)
    const before = this.children.slice(0, index)
    const rest = this.children.slice(index)
    node.parent = this
    before.push(node)
    this.children = [].concat(before, rest)
    this[BINDING].updateChildren(old, this.children.slice())
  }

  replaceChild(newChild, oldChild) {
    const old = this.children.slice()
    const index = getChildIndex(this, oldChild)
    this.children[index] = newChild
    this[BINDING].updateChildren(old, this.children.slice())
  }

  appendChild(node) {
    const old = this.children.slice()
    node.parent = this
    const existingChild = this.children.findIndex(
      x => x[BINDING].id === node[BINDING].id
    )
    if (existingChild > -1) {
      this.children.splice(existingChild, 1)
      this.children.push(node)
      this[BINDING].updateChildren(old, this.children.slice())
    } else {
      this.children.push(node)
      this[BINDING].updateChildren(old, this.children.slice())
    }
  }

  removeChild(node) {
    let old = this.children.slice()
    const index = getChildIndex(this, node)
    if (index > -1) {
      this.children.splice(index, 1)
      this[BINDING].updateChildren(old, this.children.slice())
    }
  }

  get ref() {
    return this._nativeInstance
  }
  set ref(node) {
    this._nativeInstance = node
  }
}
