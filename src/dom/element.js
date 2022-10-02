import { Node } from './node'
import { BINDING, BINDINGS, meta, NODES, TYPES } from './shared'

const LISTENERS = Symbol.for('listeners')
const STYLE = Symbol.for('style')
const IS_TRUSTED = Symbol.for('IS_TRUSTED')
const CURRENT_STYLE = Symbol.for('currentStyle')
const OWNER_NODE = Symbol.for('ownerNode')

export const REACT_ELEMENT_TYPE =
  (typeof Symbol !== 'undefined' &&
    Symbol.for &&
    Symbol.for('react.element')) ||
  0xeac7

class Element extends Node {
  constructor(type) {
    super(type)
    this.attributes = []
    this[LISTENERS] = new Map()
    this[STYLE] = createStyleBinding(this[BINDING].id)
    return new Proxy(this, ELEMENT_PROXY)
  }

  get nodeType() {
    return 1
  }

  get className() {
    return this.getAttribute('class')
  }

  set className(val) {
    this.setAttribute('class', val)
  }

  set textContent(val) {
    if (this.localName !== 'Text') {
      throw new Error('Text can only be inside a Text Element')
    }
    let textNode = this.children.find(x => x.nodeType === 3)
    if (!textNode) {
      textNode = new Text(val)
      this.appendChild(textNode)
    }

    textNode.data = val
  }

  get textContent() {
    return this.children.find(x => x.nodeType === 3).data
  }

  get style() {
    return this[STYLE]
  }

  set style(val) {
    const finalStyle = {}
    Object.keys(val).forEach(key => {
      finalStyle[key] = val[key]
      this[STYLE][CURRENT_STYLE].set(key, val[key])
    })
    this[STYLE] = finalStyle
  }

  set id(val) {
    this.setAttribute('id', val)
  }

  get id() {
    this.getAttribute('id')
  }

  get value() {
    // HACK: figure out a better way to get the text
    // or maybe instruct users to avoid doing this?
    // but then what about the frameworks...
    if (__DEV__) {
      return this.ref._internalFiberInstanceHandleDEV.memoizedProps.text
    } else if (this.ref?._internalFiberInstanceHandle) {
      return this.ref._internalFiberInstanceHandle.memoizedProps.text
    }
    return this.getAttribute('value')
  }

  set value(val) {
    this.setAttribute('value', val)
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

  setAttribute(key, value) {
    this[BINDING]?.setProp(key, value)
  }

  getAttribute(key) {
    return this[BINDING]?.getProp(key)
  }

  removeAttribute(key) {
    this[BINDING].removeProp(key)
  }

  addEventListener(type, listener, options) {
    const all = this[LISTENERS]
    let list = all.get(type)
    if (!list) {
      all.set(type, (list = []))
    }

    list.push({
      _listener: listener,
      _flags: getListenerFlags(options),
    })

    const eventFunc = e => {
      list.forEach(fn => {
        fn._listener(e)
      })
    }

    this[BINDING].setProp(type, eventFunc)
  }

  removeEventListener(type, listener, options) {
    const list = this[LISTENERS].get(type)
    if (!list) {
      return false
    }
    const flags = getListenerFlags(options)
    for (let i = 0; i < list.length; i++) {
      const item = list[i]
      if (item._listener === listener && item._flags === flags) {
        list.splice(i, 1)
        return true
      }
    }
    return false
  }

  dispatchEvent(event) {
    let target = (event.target = this)
    const path = (event.path = [this])
    while ((target = target.parentNode)) {
      path.push(target)
    }
    let defaultPrevented = false
    for (let i = path.length; i--; ) {
      if (
        fireEvent(
          event,
          path[i],
          i === 0 ? EVENTPHASE_AT_TARGET : EVENTPHASE_CAPTURE
        )
      ) {
        defaultPrevented = true
      }
    }
    for (let i = 1; i < path.length; i++) {
      if (fireEvent(event, path[i], EVENTPHASE_BUBBLE)) {
        defaultPrevented = true
      }
    }
    return !defaultPrevented
  }

  render() {
    const tConfig = TYPES[this.localName]
    const componentBase = tConfig.hostComponent
    const reactComponent = {
      type: componentBase,
      ref: x => {
        if (!meta.renderStarted) {
          meta.renderStarted = true
        }
        this.ref = x
        this[BINDING].create()
      },
    }

    reactComponent.props = {}

    if (this.children.length) {
      reactComponent.props.children = this.children.map(x => x.render())
    }

    const allProps = this[BINDING].getAllProps()

    if (allProps.length) {
      allProps.forEach(([k, v]) => {
        reactComponent.props[k] = v
      })
    }

    reactComponent.$$typeof = REACT_ELEMENT_TYPE
    return reactComponent
  }
}

class Text extends Element {
  constructor(value) {
    super('#text')
    this.data = value
  }

  get nodeType() {
    return 3
  }

  set data(data) {
    data = String(data)
    this[BINDING].setProp('data', data)
  }

  get data() {
    return this[BINDING].getProp('data')
  }

  render() {
    return this.data
  }
}

export class Document extends Element {
  constructor() {
    super('#document')
  }

  createElement(type) {
    return new Element(type)
  }

  createTextNode(value) {
    return new Text(value)
  }
}

const ELEMENT_PROXY = {
  has(target, key) {
    if (Reflect.has(target, key)) {
      return false
    }
    Object.defineProperty(target, key, getDescriptor(key))
    return true
  },
}

const DESCRIPTORS = new Map()
const getDescriptor = key => DESCRIPTORS.get(key) || createDescriptor(key)
function createDescriptor(key) {
  const desc = {
    enumerable: true,
    configurable: false,
    get() {
      return this[BINDING].getProp(key)
    },
    set(value) {
      this[BINDING].setProp(key, value)
    },
  }
  DESCRIPTORS.set(key, desc)
  return desc
}

// FIXME: Might not be necessary for the native DOM
// but will be needed when a frontend framework
// is involved and is adding events to the DOM
// should be able to proxy them to the original
// bridge
export class Event {
  constructor(type, bubbles, cancelable, timeStamp) {
    Object.defineProperty(this, IS_TRUSTED, { value: false })
    this.type = type
    this.bubbles = bubbles
    this.cancelable = cancelable
    this.target = null
    this.currentTarget = null
    this.inPassiveListener = false
    this.defaultPrevented = false
    this.cancelBubble = false
    this.immediatePropagationStopped = false
    this.data = undefined
  }
  stopPropagation() {
    this.cancelBubble = true
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
const EVENTPHASE_NONE = 0
const EVENTPHASE_BUBBLE = 1
const EVENTPHASE_CAPTURE = 2
const EVENTPHASE_AT_TARGET = 3
const EVENTPHASE_PASSIVE = 4
const EVENTOPT_ONCE = 8
// Flags are easier to compare for listener lookups
function getListenerFlags(options) {
  if (typeof options === 'object' && options) {
    let flags = options.capture ? EVENTPHASE_CAPTURE : EVENTPHASE_BUBBLE
    if (options.passive) {
      flags &= EVENTPHASE_PASSIVE
    }
    if (options.once) {
      flags &= EVENTOPT_ONCE
    }
    return flags
  }
  return options ? EVENTPHASE_CAPTURE : EVENTPHASE_BUBBLE
}

function fireEvent(event, target, phase) {
  const list = target[LISTENERS].get(event.type)
  if (!list) {
    return
  }
  // let error;
  let defaultPrevented = false
  // use forEach for freezing
  const frozen = list.slice()
  for (let i = 0; i < frozen.length; i++) {
    const item = frozen[i]
    const fn = item._listener
    event.eventPhase = phase
    // the bridge is async, so events are always passive.
    //event.inPassiveListener = passive;
    event.currentTarget = target
    try {
      let ret = fn.call(target, event)
      if (ret === false) {
        event.defaultPrevented = true
      }
    } catch (e) {
      //error = e;
      setTimeout(thrower, 0, e)
    }
    // @ts-ignore
    if (item._flags & (EVENTOPT_ONCE !== 0)) {
      list.splice(list.indexOf(item), 1)
    }
    if (event.defaultPrevented === true) {
      defaultPrevented = true
    }
    if (event.immediatePropagationStopped) {
      break
    }
  }
  // if (error !== undefined) throw error;
  return defaultPrevented
}

function thrower(error) {
  throw error
}

// this could be Style.prototype and use the instance as currentStyle
const STYLE_PROXY = {
  has() {
    return true
  },
  get(style, key) {
    return style[CURRENT_STYLE].get(key)
  },
  set(style, key, value) {
    const current = style[CURRENT_STYLE]
    current.set(key, value)
    const _style = Object.fromEntries(current.entries())
    style[OWNER_NODE][BINDING].setProp('style', _style)
    return style
  },
}

function createStyleBinding(id) {
  let style = {}
  const binding = BINDINGS.get(id)
  Object.defineProperty(style, CURRENT_STYLE, { value: new Map() })
  Object.defineProperty(style, OWNER_NODE, {
    get: NODES.get.bind(NODES, binding),
  })
  return new Proxy(style, STYLE_PROXY)
}
