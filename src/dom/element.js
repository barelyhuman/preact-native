import {
  BINDING,
  BINDING_NODE,
  CURRENT_STYLE,
  LISTENERS,
  NODE_TYPES,
  NS,
  OWNER_NODE,
  STYLE,
} from './constants'
import { EventTarget } from './event-target'
import { registry } from './registry'
import { Text } from './text'

export class Element extends EventTarget {
  [NS] = 'http://www.w3.org/1999/xhtml'

  constructor(type, nodeType) {
    super(type, nodeType || NODE_TYPES.ELEMENT)
    Object.defineProperty(this, LISTENERS, {
      value: new Map(),
    })
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
}

function createStyleBinding(id) {
  let style = {}
  const binding = registry.getBinding(id)
  Object.defineProperty(style, CURRENT_STYLE, { value: new Map() })
  Object.defineProperty(style, OWNER_NODE, {
    get: () => binding[BINDING_NODE],
  })
  return new Proxy(style, STYLE_PROXY)
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
