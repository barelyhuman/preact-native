import {
  BINDING,
  CURRENT_STYLE,
  EVENTPHASE_AT_TARGET,
  EVENTPHASE_BUBBLE,
  EVENTPHASE_CAPTURE,
  LISTENERS,
  NODE_TYPES,
  OWNER_NODE,
  STYLE,
} from './constants'
import { Node } from './node'

export class Element extends Node {
  constructor(type, reset, nodeType) {
    super(type, nodeType || NODE_TYPES.ELEMENT)
    Object.defineProperty(this, LISTENERS, {
      value: new Map(),
    })
    if (reset) {
      this[BINDING].clear()
    }
    this[BINDING].create()
  }

  _textNode() {
    let ind = this.children.findIndex(node => node.localName === '#text')
    if (ind === -1) {
      let n = new Text('')
      this.appendChild(n)
      ind = this.children[this.children.length - 1]
    }
    return this.children[ind]
  }

  get textContent() {
    return this.children.find(x => x.nodeType === 3).data
  }

  set textContent(val) {
    let textNode = this.children.find(x => x.nodeType === 3)
    if (!textNode) {
      textNode = new Text(val)
      this.appendChild(textNode)
    }
    textNode.data = val
  }

  set id(val) {
    this.setAttribute('id', val)
  }

  get id() {
    return this.getAttribute('id')
  }

  getElementById(id) {
    let result

    // root check
    if (this[BINDING].getProp('id') === id) {
      return this
    }

    // check 1st level children
    for (let i = 0; i < this.children.length; i += 1) {
      const x = this.children[i]
      if (x[BINDING].getProp('id') === id) {
        result = x
      }
    }

    // branched check
    if (!result) {
      for (let i = 0; i < this.children.length; i += 1) {
        result = this.children[i].getElementById(id)
        if (result) {
          break
        }
      }
    }

    return result
  }

  // TODO:
  querySelector(selector) {}

  // TODO:
  querySelectorAll(selector) {}

  hasAttribute(key) {
    if (typeof this[BINDING]?.getProp(key) !== 'undefined') {
      return true
    }
    return false
  }

  setAttribute(key, value) {
    this[BINDING]?.setProp(key, value)
  }

  getAttribute(key) {
    return this[BINDING]?.getProp(key)
  }

  removeAttribute(key) {
    this[BINDING].removeProp(key)
  }

  set style(cssText) {
    this[STYLE].cssText = String(cssText)
  }

  get style() {
    let style = this[STYLE]
    if (!style) {
      style = createStyleBinding(this[BINDING].id)
      this[STYLE] = style
    }
    return style
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

function createStyleBinding(id) {
  let style = {}
  // const binding = BINDINGS.get(id)
  // Object.defineProperty(style, CURRENT_STYLE, { value: new Map() })
  // Object.defineProperty(style, OWNER_NODE, {
  //   get: NODES.get.bind(NODES, binding),
  // })
  // return new Proxy(style, STYLE_PROXY)
}

const STYLE_PROXY = {
  has(key) {
    return true
  },
  get(style, key) {
    return style[CURRENT_STYLE].get(key)
  },
  set(style, key, value) {
    style[CURRENT_STYLE].set(key, value)
    const current = Object.fromEntries(style[CURRENT_STYLE])
    style[OWNER_NODE][BINDING].setProp('style', current)
    return true
  },
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
