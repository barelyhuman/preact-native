import { IS_TRUSTED } from './constants'

export class Event {
  constructor(type, bubbles, cancelable) {
    Object.defineProperty(this, IS_TRUSTED, { value: false })
    this.type = type
    this.bubbles = bubbles
    this.cancelable = cancelable
    this.target = null
    this.nativeEvent = null
    this.currentTarget = null
    this.inPassiveListener = false
    this.defaultPrevented = false
    this._stopPropagation = false
    this.immediatePropagationStopped = false
    this.data = undefined
    this.timestamp = new Date().valueOf()
  }

  get isTrusted() {
    return this[IS_TRUSTED]
  }

  get cancelBubble() {
    return this._stopPropagation
  }

  set cancelBubble(val) {
    if (val) {
      this._stopPropagation = true
    }
  }

  stopPropagation() {
    this.cancelBubble = true
    this._stopPropagation = true
  }

  stopImmediatePropagation() {
    this.immediatePropagationStopped = true
  }
  preventDefault() {
    this.defaultPrevented = true
  }
  set returnValue(v) {
    this.defaultPrevented = v
  }
  get returnValue() {
    return this.defaultPrevented
  }
}
