/* 
ROUGH Implementation of a mutable DOM Node for Text component react

This implmentation disregards the existence of React in the picture and only plans to depend on react-native 
for the SDK that they've built over both the platforms over time. 

The point or target is to get a browser like DOM but for React Native nodes, 
this will further make it easier to make libraries like Preact/Solid/Svelte work directly 
on React Native. 
*/

/* TODO:
* - Move every mutation and update action to the bridge 
* - All code related to React Native's SDK goes into the bridge 
* - The DOM maintains a consistent structure for creation of node and manipulating them 
* - Switch to WeakMap to maintain nodal structures and Identifiers (useful for mutational nodes)
* - This structure should have the following (most of this replicates the browser DOM)
* --- Element Creation 
* --- Element Append and Destroy 
* --- Sibling Information
* --- RootHostNode instance 
* --- Additional information if the Child is a leaf node in RN or another stateNode
* --- Valid properties that can be updated 

* RESEARCH PENDING: 
* - Figure out how styles can be updated at runtime 

* FIRST PRIORITY: 
* - Implement the reusable set of Node and Element structures for Text Node and View 
* - The above should give enough information about generalised handling of updates
*/

const BINDINGS = new Map()
export const BINDING = Symbol.for('binding')
const NODES = new Map()
import { Text as RText, SafeAreaView as RSafeAreaView } from 'react-native'
import { UIManager } from 'react-native/Libraries/ReactPrivate/ReactNativePrivateInterface'

export const REACT_ELEMENT_TYPE =
  (typeof Symbol !== 'undefined' &&
    Symbol.for &&
    Symbol.for('react.element')) ||
  0xeac7

const TYPES = {
  '#text': { type: 'Text' },
  '#safeareaview': { type: 'SafeAreaView' },
}

const bridge = {
  currentQueue: [],
  currentId: 0,
  async call(method, params) {
    // transfer the call to UIManager via ReactNative
  },
  enqueue(method, params) {
    // queue to maintain the sequence
  },
  handleEvent(method, params) {
    switch (method) {
      case 'event':
        const target = BINDINGS.get(params.id)
        if (target) {
          target.dispatchEvent(params.event)
        }
        break
    }
  },
}

function createBinding(node) {
  const config = TYPES[node.localName]
  const id = ++bridge.currentId
  const props = new Map()
  const binding = {
    id,
    props,
    create() {
      bridge.enqueue('create', [id, config.type, props])
      for (const [key, value] of Object.entries(props)) {
        if (value !== undefined) {
          bridge.enqueue('setProp', [id, key, value])
        }
      }
    },
    destroy() {
      bridge.enqueue('destroy', [id])
    },
    append(parent) {
      bridge.enqueue('append', [id, parent])
    },
    insertBefore(sibling) {
      bridge.enqueue('insertBefore', [id, sibling])
    },
    setProp(prop, value) {
      if (props.get(prop) !== value) {
        props.set(prop, value)
        bridge.enqueue('setProp', [id, prop, value])
      }
    },
    getProp(prop) {
      return props.get(prop)
    },
    dispatchEvent(eventInfo) {
      const [type, bubbles, cancelable, timestamp, extra] = eventInfo
      const event = new Event(type, bubbles, cancelable, timestamp)
      if (extra !== undefined) {
        Object.assign(event, extra)
      }
      event[IS_TRUSTED] = true
      node.dispatchEvent(event)
    },
  }
  BINDINGS.set(id, binding)
  return binding
}

class Node {
  constructor(localName) {
    this.children = []
    this.localName = localName
    const binding = createBinding(this)
    this.id = binding.id
    this[BINDING] = binding
    NODES.set(binding.id, this)
  }

  appendChild(node) {
    node.parent = this
    this.children.push(node.component)
  }

  removeChild(node) {
    this.children = this.children.filter(x => x.id == node.id)
  }
}

export class SafeAreaView extends Node {
  constructor() {
    super('#safeareaview')
    this.component = {
      type: RSafeAreaView,
      ref: null,
      props: {
        children: this.children || [],
      },
      $$typeof: REACT_ELEMENT_TYPE,
    }
  }
}

export class Text extends Node {
  constructor(data) {
    super('#text')

    if (data != null) {
      this.data = data
    }

    this.nativeRef = null
    this.component = {
      type: RText,
      ref: x => {
        this.nativeRef = x
      },
      props: {
        children: [this.data],
      },
      $$typeof: REACT_ELEMENT_TYPE,
    }
  }

  get nodeType() {
    return 3
  }

  set data(data) {
    data = String(data)
    this[BINDING].setProp('data', data)
    if (this.nativeRef) {
      UIManager.updateView(
        this.nativeRef._nativeTag,
        this.nativeRef.viewConfig.uiViewClassName,
        {
          style: {
            fontSize: 10,
          },
        }
      )
      UIManager.updateView(
        this.nativeRef._children[0], // reactTag
        'RCTRawText', // viewName
        {
          text: data,
          style: {
            fontSize: 20,
          },
        } // props
      )
    }
  }

  get data() {
    return this[BINDING].getProp('data')
  }
}
// Object.defineProperty(Text.prototype, 'data', getDescriptor('data));

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

const LISTENERS = Symbol.for('listeners')

class Element extends Node {
  constructor(localName) {
    super(localName)

    Object.defineProperty(this, STYLE, { value: undefined })

    // Set up proxy traps for existence checks, prop setters and cached prop getters
    return new Proxy(this, ELEMENT_PROXY)
  }

  get nodeType() {
    return 1
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

  get style() {
    let style = this[STYLE]
    if (!style) {
      const id = this[BINDING].id
      let style = {}
      Object.defineProperty(style, CURRENT_STYLE, { value: new Map() })
      Object.defineProperty(style, OWNER_NODE, {
        get: NODES.get.bind(NODES, id),
      })
      style = this[STYLE] = new Proxy(style, STYLE_PROXY)
    }
    return style
  }
  set style(style) {
    this.style.cssText = style
  }
}
const STYLE = Symbol('style')
const CURRENT_STYLE = Symbol('currentStyle')
const OWNER_NODE = Symbol('ownerNode')
// this could be Style.prototype and use the instance as currentStyle
const STYLE_PROXY = {
  has() {
    return true
  },
  get(style, key) {
    const current = style[CURRENT_STYLE]
    if (key === 'cssText') {
      return getCss(current)
    }
    const value = current.get(key)
    return value == null ? null : value
  },
  set(style, key, value) {
    const current = style[CURRENT_STYLE]
    value = value == null ? null : String(value)
    if (key === 'cssText') {
      setCss(current, value)
    } else {
      current.set(key, value)
    }
    style[OWNER_NODE][BINDING].setProp('style', getCss(current))
  },
}

function setCss(style, css) {
  style.clear()
  const tokenizer = /(?:(['"]).*?\1|;|:)/g
  let token,
    sub,
    key,
    index = 0
  while ((token = tokenizer.exec(css)) && !token[1]) {
    let sub = css.substring(index, token.index).trim()
    if (token[0] == ':') {
      key = sub
    } else {
      style.set(key, sub)
    }
    index = tokenizer.lastIndex
  }
}

function getCss(style) {
  let css = ''
  for (const [key, value] of style.entries()) {
    if (value == null) {
      continue
    }
    if (css.length === 0) {
      css += ' '
    }
    css += key
    css += ': '
    css += value
    css += ';'
  }
  return css
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
      setTimeout(thower, 0, e)
    }
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

const IS_TRUSTED = Symbol('isTrusted')
class Event {
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
  get isTrusted() {
    return this[EVENT_TRUSTED]
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

export function render(baseNode) {
  const tree = baseNode.component
  return tree
}
