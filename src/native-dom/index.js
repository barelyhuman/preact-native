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

import { Text as RText, SafeAreaView as RSafeAreaView } from 'react-native'

import { UIManager } from 'react-native/Libraries/ReactPrivate/ReactNativePrivateInterface'

const BINDINGS = new Map()
const IS_TRUSTED = Symbol('isTrusted')
export const BINDING = Symbol.for('binding')
const NODES = new WeakMap()

let renderStarted = false

export const REACT_ELEMENT_TYPE =
  (typeof Symbol !== 'undefined' &&
    Symbol.for &&
    Symbol.for('react.element')) ||
  0xeac7

const TYPES = {
  '#text': { type: 'Text' },
  '#document': { type: 'Document' },
  'Text': { type: 'NATIVE_Text', hostComponent: RText },
  'SafeAreaView': { type: 'NATIVE_SafeAreaView', hostComponent: RSafeAreaView },
}

function createBinding(node) {
  const config = TYPES[node.localName]
  const id = ++bridge.currentId
  const props = new Map()

  const binding = {
    id,
    props,
    config: config,
    nativeInstance: node.ref,
    create() {
      bridge.enqueue('create', [id, config, props, node.ref])
      for (const [key, value] of Object.entries(props)) {
        if (value !== undefined) {
          bridge.enqueue('setProp', [id, key, value, node.ref])
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
        bridge.enqueue('setProp', [id, prop, value, node.ref])
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

const bridge = {
  queue: [],
  currentId: 0,
  call(method, params) {
    const id = params[0]
    const binding = BINDINGS.get(id)
    const node = NODES.get(binding)

    switch (method) {
      case 'create': {
        break
      }
      case 'setProp': {
        if (binding.config.type === 'Text') {
          _updateTextNode(node, binding)
        }
        break
      }
    }
  },
  enqueue(method, params) {
    this.queue.push({
      method,
      params,
    })
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

function createProcess() {
  return function process() {
    if (renderStarted && bridge.queue.length > 0) {
      const toProcess = bridge.queue.shift()
      bridge.call(toProcess.method, toProcess.params)
    }
    setTimeout(() => {
      process()
    }, 250)
  }
}

class Node {
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

  appendChild(node) {
    node.parent = this
    this.children.push(node)
  }

  removeChild(node) {
    this.children = this.children.filter(x => x.id === node.id)
  }
}

class Element extends Node {
  constructor(type) {
    super(type)
    return new Proxy(this, ELEMENT_PROXY)
  }

  render() {
    const tConfig = TYPES[this.localName]
    const componentBase = tConfig.hostComponent
    const reactComponent = {
      type: componentBase,
      ref: x => {
        if (!renderStarted) {
          renderStarted = true
        }
        this.ref = x
        this[BINDING].create(x)
      },
      props: {
        children: this.children.map(x => x.render()),
      },
    }

    reactComponent.$$typeof = REACT_ELEMENT_TYPE
    return reactComponent
  }
}

class Text extends Element {
  constructor(value) {
    super('#text')
    this._value = value
  }

  set data(data) {
    data = String(data)
    this[BINDING].setProp('data', data)
  }

  get data() {
    return this[BINDING].getProp('data')
  }

  get value() {
    return this._value
  }

  render() {
    return this._value
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

export function render(node) {
  const process = createProcess()
  process()

  let renderTree = _buildRenderTree(node)

  return renderTree
}

function _buildRenderTree(node) {
  let tree
  let currentNode = node
  while (currentNode?.render) {
    tree = currentNode.render()
    currentNode = null
  }
  return tree
}

function _updateTextNode(node, binding) {
  const parent = node.parent

  if (!parent.ref) {
    return
  }

  if (!parent.ref._children.length) {
    // TODO: throw
    return
  }

  if (typeof parent.ref._children[0] !== 'number') {
    // TODO: throw
    return
  }

  const textNodeTag = parent.ref._children[0]

  UIManager.updateView(textNodeTag, 'RCTRawText', {
    text: binding.getProp('data'),
  })
}
