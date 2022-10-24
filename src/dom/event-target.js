import {
  EVENTPHASE_AT_TARGET,
  EVENTPHASE_BUBBLE,
  EVENTPHASE_CAPTURE,
  LISTENERS,
} from './constants'
import { Node } from './node'

export class EventTarget extends Node {
  constructor(type, nodeType) {
    super(type, nodeType)
  }

  addEventListener(type, fn, options = {}) {
    const all = this[LISTENERS]
    let list = all.get(type)
    if (!list) {
      all.set(type, (list = []))
    }
    list.push({
      _listener: fn,
    })
  }

  removeEventListener(type, listener, options) {
    const list = this[LISTENERS].get(type)
    if (!list) return false
    for (let i = 0; i < list.length; i++) {
      const item = list[i]
      if (item._listener === listener) {
        list.splice(i, 1)
        return true
      }
    }
    return false
  }

  handleEvent(event) {
    this.dispatchEvent(event)
  }

  dispatchEvent(event) {
    let target = (event.target = this)
    const bubblePath = []
    let defaultPrevented = false

    while (target != null) {
      bubblePath.push(target)
      target = target.parentNode
    }

    for (let i = bubblePath.length; --i; ) {
      if (fireEvent(event, bubblePath[i], EVENTPHASE_CAPTURE)) {
        defaultPrevented = true
      }
    }

    if (fireEvent(event, this, EVENTPHASE_AT_TARGET)) {
      defaultPrevented = true
    }

    if (!event.cancelBubble) {
      for (let i = 1; i < bubblePath.length; i++) {
        if (fireEvent(event, bubblePath[i], EVENTPHASE_BUBBLE)) {
          defaultPrevented = true
        }
      }
    }

    return !defaultPrevented
  }
}

function fireEvent(event, target, phase) {
  const list = target[LISTENERS].get(event.type)
  if (!list) return

  let defaultPrevented = false

  for (const item of Array.from(list)) {
    event.eventPhase = phase
    event.currentTarget = target
    try {
      let ret = item._listener.call(target, event)
      if (ret === false) {
        event.defaultPrevented = true
      }
    } catch (e) {
      setTimeout(thrower, 0, e)
    }
    if (event.defaultPrevented === true) {
      defaultPrevented = true
    }
    if (event.immediatePropagationStopped) {
      break
    }
  }
  return defaultPrevented
}

function thrower(error) {
  throw error
}
