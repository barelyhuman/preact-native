/**
 * Binding
 *
 * These maintain the processing functions that communicate
 * with the bridge and are called by the node
 * these maintain a 2 way connection with the DOM node
 * and act as commands thrown to the bridge
 */

import { bridge } from './bridge'
import { Event } from './event'
import { BINDING_NODE, IS_TRUSTED, EVENT_TYPES } from './constants'
import { registry } from './registry'

export class Binding {
  id
  props

  constructor(node) {
    this.props = new Map()
    this[BINDING_NODE] = node
    this.id = registry.allocateNewTag()
    this.bridge = bridge
    this.type = node.localName
  }

  clear() {
    this.bridge.enqueue('clear', [this.id])
  }

  create() {
    this.bridge.enqueue('create', [this.id, this[BINDING_NODE].localName])
  }

  setProp(key, val) {
    this.props.set(key, val)
    this.bridge.enqueue('setProp', [this.id, key, val])
  }

  getProp(key) {
    return this.props.get(key)
  }

  removeProp(key) {
    return this.props.delete(key)
  }

  getAllProps() {
    const res = {}
    for (let [key, val] of Object.entries(this.props)) {
      res[key] = val
    }
    return res
  }

  updateChildren(old, next) {
    this.bridge.enqueue('updateChildren', [this.id, old, next])
  }

  dispatchEvent(eventInfo) {
    const type = eventInfo.type
    const bubbles = false
    const cancelable = false

    const event = new Event(type, bubbles, cancelable)

    event[IS_TRUSTED] = true
    event.nativeEvent = eventInfo.event

    if (type == EVENT_TYPES.CHANGE) {
      event.data = event.nativeEvent.text
    }

    this[BINDING_NODE].dispatchEvent(event)
  }
}
