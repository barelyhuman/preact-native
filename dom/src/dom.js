import * as UIManager from 'react-native/Libraries/ReactNative/UIManager'
import getNativeComponentAttributes from 'react-native/Libraries/ReactNative/getNativeComponentAttributes'
import * as ReactNativePrivateInterface from 'react-native/Libraries/ReactPrivate/ReactNativePrivateInterface'

let ROOT_TAG

const BINDING = Symbol.for('binding')
const STYLE = Symbol.for('style')
const CURRENT_STYLE = Symbol.for('current')
const OWNER_NODE = Symbol.for('owner')
const IS_TRUSTED = Symbol.for('isTrusted')
const LISTENERS = Symbol.for('listeners')

const KEYBOARD_EVENTS = ['topFocus', 'topEndEditing']
const FOCUS_EVENTS = ['topFocus']
const BLUR_EVENTS = ['topBlur']

const EVENTPHASE_NONE = 0
const EVENTPHASE_CAPTURE = 1
const EVENTPHASE_AT_TARGET = 2
const EVENTPHASE_BUBBLE = 3

const NODE_TYPES = {
  ELEMENT: 1,
  TEXT_NODE: 3,
  DOCUMENT: 9,
}

const EVENT_TYPES = {
  CLICK: 'Click',
  CHANGE: 'Change',
  FOCUS: 'Focus',
  BLUR: 'Blur',
}

const BINDINGS = new Map()
let INSTANCES = new WeakMap()
let NODES = new WeakMap()

let VIEWS_RENDERED = false
let pChain = Promise.resolve()
let processing = false
let renderQ = []

export const REACT_ELEMENT_TYPE =
  (typeof Symbol != 'undefined' && Symbol.for && Symbol.for('react.element')) ||
  0xeac7

const TYPES = {
  '#text': {
    type: 'RCTRawText',
  },
  '#document': {
    type: 'Document',
  },
}

export const bridge = {
  currentId: 0,
  call(method, params) {
    console.log({ method, params })
    const id = params[0]
    const binding = BINDINGS.get(id)
    const node = NODES.get(binding)

    switch (method) {
      case 'clear': {
        const childIndices = (node.childNodes || []).map((_, i) => i)
        try {
          UIManager.manageChildren(ROOT_TAG, [], [], [], [], childIndices)
        } catch (err) {}
        break
      }
      case 'create': {
        const type = params[1]
        if (type === '#document') {
          break
        }
        const rawViewClass = TYPES[type]

        if (type === '#text') {
          UIManager.createView(binding.id, 'RCTRawText', ROOT_TAG, {
            text: binding.getProp('text'),
          })
        } else {
          UIManager.createView(binding.id, rawViewClass.type, ROOT_TAG, {})
        }

        break
      }
      case 'setProp': {
        if (binding.type == '#text') {
          updateTextNode(id)
        }
        updateNodeProps(id)
        break
      }
      case 'updateChildren': {
        const oldChildren = params[1]
        const nextSet = params[2]

        const toDelete = []
        const toCreate = []
        const moveFrom = []
        const moveTo = []

        nextSet.forEach((nodeChild, ind) => {
          const exists = oldChildren.findIndex(isSameChild, nodeChild)
          if (exists == -1) {
            toCreate.push([nodeChild[BINDING].id, ind])
          }
        })

        oldChildren.forEach((nodeChild, ind) => {
          const oldPos = ind
          const newPos = nextSet.findIndex(isSameChild, nodeChild)
          if (newPos == -1) {
            toDelete.push(ind)
          } else if (newPos !== oldPos) {
            moveFrom.push(oldPos)
            moveTo.push(newPos)
          }
        })

        let parentTag = id

        if (binding.type === '#document') {
          parentTag = ROOT_TAG
        }

        UIManager.manageChildren(
          parentTag, // containerID
          moveFrom, // moveFromIndices
          moveTo, // moveToIndices
          toCreate.map(x => x[0]), // addChildReactTags
          toCreate.map(x => x[1]), // addAtIndices
          toDelete // removeAtIndices
        )

        break
      }
      case 'event': {
        bridge.handleEvent('event', params)
        break
      }
    }
  },
  enqueue(method, params) {
    // FIXME: add handling to avoid consecutive duplicate
    // processes in the queue while letting repositioning work
    if (
      renderQ.push({
        method,
        params,
      }) === 1
    ) {
      if (typeof ROOT_TAG != null && !processing) {
        processing = true
        pChain = pChain.then(process)
      }
    }
  },
  handleEvent(method, params) {
    const targetId = params[0]
    switch (method) {
      case 'event':
        // separated into 3 for further handling
        // down the road
        // since clicks can have double taps
        // gestures etc
        // and keyboards can have edit events, selection events
        // etc
        if (isClickEvent(params[1])) {
          bridge.handleClickEvent(targetId, params[2])
        }

        if (isKeyboardEvent(params[1])) {
          bridge.handleKeyboardEvent(targetId, params[2])
        }

        if (isGenericEvent(params[1])) {
          bridge.handleGenericEvent(targetId, params[1], params[2])
        }

        break
    }
  },
  handleClickEvent(targetId, nativeEvent) {
    const target = BINDINGS.get(targetId)
    if (target) {
      target.dispatchEvent({
        type: EVENT_TYPES.CLICK,
        event: nativeEvent,
      })
    }
  },
  handleKeyboardEvent(targetId, nativeEvent) {
    const target = BINDINGS.get(targetId)
    if (target) {
      target.dispatchEvent({
        type: EVENT_TYPES.CHANGE,
        event: nativeEvent,
      })
    }
  },
  handleGenericEvent(targetId, eventType, nativeEvent) {
    let _eventType

    if (isFocusEvent(eventType)) {
      _eventType = EVENT_TYPES.FOCUS
    }
    if (isBlurEvent(eventType)) {
      _eventType = EVENT_TYPES.BLUR
    }

    const target = BINDINGS.get(targetId)

    if (target) {
      target.dispatchEvent({
        type: _eventType,
        event: nativeEvent,
      })
    }
  },
}

class Node {
  children = []
  parent = null

  constructor(name, nodeType) {
    this._nodeType = nodeType
    this._nativeInstance = null
    this.localName = name
    const binding = createBinding(this)
    this[BINDING] = binding
    BINDINGS.set(binding.id, binding)
    NODES.set(binding, this)
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

class Element extends Node {
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

class Text extends Node {
  constructor(data) {
    super('#text', NODE_TYPES.TEXT_NODE)
    this[BINDING].create()
    this[BINDING].setProp('text', String(data))
  }

  set data(val) {
    this[BINDING].setProp('text', String(val))
  }

  get data() {
    return this[BINDING].getProp('text')
  }
  render() {
    return this.data
  }
}

export class Document extends Element {
  constructor(rootTag) {
    ROOT_TAG = rootTag
    super('#document', true, NODE_TYPES.DOCUMENT)
  }

  createElement(type) {
    return new Element(type)
  }

  createTextNode(data) {
    return new Text(data)
  }
}

export function registerHostElement(componentName, nativeComp, options = {}) {
  if (options.nativeHost) {
    TYPES[componentName] = {
      type: componentName,
      hostComponent: nativeComp,
    }
  } else {
    TYPES[componentName] = {
      type: nativeComp,
    }
  }
}

export function render(node) {
  return node.render()
}

function createBinding(node) {
  let nextId = ++bridge.currentId
  if (nextId === ROOT_TAG) {
    nextId = ++bridge.currentId
  }
  const id = nextId
  const props = new Map()
  return {
    id,
    props,
    type: node.localName,
    clear() {
      renderQ = []
      bridge.enqueue('clear', [id])
    },
    create() {
      bridge.enqueue('create', [id, node.localName])
    },
    setProp(key, val) {
      props.set(key, val)
      bridge.enqueue('setProp', [id, key, val])
    },
    getProp(key) {
      return props.get(key)
    },
    getAllProps() {
      const res = {}
      for (let [key, val] of Object.entries(props)) {
        res[key] = val
      }
      return res
    },
    moveChild(nodeId, from, to) {
      bridge.enqueue('moveChild', [id, from, to])
    },
    appendChild(nodeId) {
      bridge.enqueue('appendChild', [id, nodeId])
    },
    updateChildren(old, next) {
      bridge.enqueue('updateChildren', [id, old, next])
    },
    removeChild(atIndex) {
      bridge.enqueue('removeChild', [id, atIndex])
    },
    dispatchEvent(eventInfo) {
      // const [bubbles, cancelable, timestamp, extra] = eventInfo
      const type = eventInfo.type
      const timestamp = eventInfo.event.timestamp
      const bubbles = false
      const cancelable = false
      const event = new Event(type, bubbles, cancelable, timestamp)
      // if (extra !== undefined) Object.assign(event, extra)
      event[IS_TRUSTED] = true
      event.nativeEvent = eventInfo.event

      if (type == EVENT_TYPES.CHANGE) {
        event.data = event.nativeEvent.text
      }

      node.dispatchEvent(event)
    },
  }
}

function process() {
  let methodDef = renderQ.shift()
  if (methodDef) {
    dispatch(methodDef)
    setTimeout(() => {
      process()
    }, 10)
  } else {
    processing = false
  }
}

function dispatch(methodDef) {
  bridge.call(methodDef.method, methodDef.params)
}

function updateNodeProps(id) {
  const binding = BINDINGS.get(id)
  const instance = INSTANCES.get(binding)
  const props = Object.fromEntries(binding.props)

  if (instance) {
    instance.setNativeProps(props)
  }
  if (TYPES[binding.type]) {
    const managerName = TYPES[binding.type].type
    const viewConfig = getNativeComponentAttributes(managerName)
    const validProps = processProps(props, viewConfig.validAttributes)
    UIManager.updateView(id, viewConfig.uiViewClassName, validProps)
  }
}

function processProps(props, validAttributes) {
  const result = {}

  for (var key in props) {
    if (!validAttributes[key]) {
      continue
    }

    if (key == 'style') {
      normalizeStyle(props[key])
    }

    const propItem = props[key]
    const config = validAttributes[key]

    if (typeof propItem == 'undefined') {
      continue
    }
    result[key] = propItem

    if (typeof propItem == 'object' && typeof config == 'object') {
      result[key] = processProps(propItem, config)
    }

    if (typeof config.process == 'function') {
      result[key] = config.process(propItem)
    }
  }

  // flatten styles to the top level props
  Object.assign(result, result.style)

  return result
}

function normalizeStyle(styleProps) {
  for (let key in styleProps) {
    const old = styleProps[key]
    try {
      styleProps[key] = styleProps[key].replace(/(px)/g, '')
      if (!isNaN(styleProps[key])) {
        styleProps[key] = Number(styleProps[key])
      }
    } catch (err) {
      styleProps[key] = old
    }
  }
}

function updateTextNode(id) {
  const binding = BINDINGS.get(id)
  UIManager.updateView(id, 'RCTRawText', {
    text: binding.getProp('text'),
  })
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

function createStyleBinding(id) {
  let style = {}
  const binding = BINDINGS.get(id)
  Object.defineProperty(style, CURRENT_STYLE, { value: new Map() })
  Object.defineProperty(style, OWNER_NODE, {
    get: NODES.get.bind(NODES, binding),
  })
  return new Proxy(style, STYLE_PROXY)
}

export function createDOM(rootTag) {
  bridge.currentId = 0
  BINDINGS.clear()
  const rootNode = new Document(rootTag)
  return rootNode
}

class Event {
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

function isClickEvent(eventType) {
  if (eventType === 'topTouchEnd') {
    return true
  }
  return false
}

function isGenericEvent(eventType) {
  if (isFocusEvent(eventType) || isBlurEvent(eventType)) {
    return true
  }
  return false
}

function isFocusEvent(eventType) {
  return FOCUS_EVENTS.indexOf(eventType) > -1
}

function isBlurEvent(eventType) {
  return BLUR_EVENTS.indexOf(eventType) > -1
}

function isKeyboardEvent(eventType) {
  return KEYBOARD_EVENTS.indexOf(eventType) > -1
}

function receiveEvent(rootNodeID, topLevelType, nativeEventParam) {
  // TODO: need to handle other events
  let nodeId = nativeEventParam.target
  if (!nodeId) {
    return
  }

  if (isGenericEvent(topLevelType)) {
    executeGenericEvents(nodeId, topLevelType, nativeEventParam)
  }
  if (KEYBOARD_EVENTS.indexOf(topLevelType) > -1) {
    executeKeyboardEvent(nodeId, topLevelType, nativeEventParam)
  }
  // console.log({ rootNodeID, topLevelType, nativeEventParam })
}

function receiveTouches(eventTopLevelType, touches, changedIndices) {
  if (!touches.length) {
    return
  }

  const touch = touches[0]

  const nativeEvent = touch
  let nodeId = nativeEvent.target < 1 ? null : touch.target

  if (!nodeId) {
    return
  }

  executeTouchEvent(nodeId, eventTopLevelType, nativeEvent)
}

function executeTouchEvent(nodeId, eventTopLevelType, nativeEvent = {}) {
  bridge.enqueue('event', [nodeId, eventTopLevelType, nativeEvent])
}

function executeGenericEvents(nodeId, eventTopLevelType, nativeEvent = {}) {
  bridge.enqueue('event', [nodeId, eventTopLevelType, nativeEvent])
}

function executeKeyboardEvent(nodeId, eventTopLevelType, nativeEvent = {}) {
  bridge.enqueue('event', [nodeId, eventTopLevelType, nativeEvent])
}

ReactNativePrivateInterface.RCTEventEmitter.register({
  receiveEvent: receiveEvent,
  receiveTouches: receiveTouches,
})

function getChildIndex(parent, toFind) {
  return parent.children.findIndex(isSameChild, toFind)
}

function isSameChild(item) {
  return item[BINDING].id === this[BINDING].id
}
