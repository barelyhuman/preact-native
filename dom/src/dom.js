import { UIManager } from 'react-native'
import getNativeComponentAttributes from 'react-native/Libraries/ReactNative/getNativeComponentAttributes'
import ReactNativePrivateInterface from 'react-native/Libraries/ReactPrivate/ReactNativePrivateInterface'

let ROOT_TAG

const BINDING = Symbol.for('binding')
const CURRENT_STYLE = Symbol.for('current')
const OWNER_NODE = Symbol.for('owner')
const IS_TRUSTED = Symbol.for('isTrusted')
const LISTENERS = Symbol.for('listeners')

const KEYBOARD_EVENTS = ['topFocus', 'topEndEditing']
const FOCUS_EVENTS = ['topFocus']
const BLUR_EVENTS = ['topBlur']

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
      case 'appendChild': {
        let parentTag = id
        const toAdd = params[1]

        if (binding.type === '#document') {
          parentTag = ROOT_TAG
        }

        UIManager.setChildren(parentTag, [toAdd])

        // TODO: benchmark between this and setting and fetching from a Map
        // and change accordingly, slowing this down could cause a glitchy interface
        const repositionExists = renderQ.findIndex(
          x => x.method === 'repositionChildren' && x.params[0] == id
        )

        if (repositionExists > -1) {
          renderQ.splice(repositionExists, 1)
        }

        // setChildren adds to the end but Native seems to be
        // rendering in the bottom-up direction, reposition
        // will just reverse the order and doesn't need to executed
        // a hundered times or on each append so the above
        // checks if there's already a task for this id in the queue
        bridge.enqueue('repositionChildren', [id])

        break
      }
      case 'repositionChildren': {
        const from = []
        const to = []
        node.children.forEach((_, i) => {
          const nextIndex = node.children.length - 1 - i
          from.push(i)
          to.push(nextIndex)
        })
        UIManager.manageChildren(
          id, // containerID
          from, // moveFromIndices
          to, // moveToIndices
          [], // addChildReactTags
          [], // addAtIndices
          [] // removeAtIndices
        )
        break
      }
      case 'moveChild': {
        const moveFrom = params[1]
        const moveTo = params[2]
        // FIXME: breaks existing repositioning
        // UIManager.manageChildren(
        //   id, // containerID
        //   [moveFrom], // moveFromIndices
        //   [moveTo], // moveToIndices
        //   [], // addChildReactTags
        //   [], // addAtIndices
        //   [] // removeAtIndices
        // )
        break
      }
      case 'removeChild': {
        const removeAt = params[1]
        UIManager.manageChildren(
          id, // containerID
          [], // moveFromIndices
          [], // moveToIndices
          [], // addChildReactTags
          [], // addAtIndices
          [removeAt] // removeAtIndices
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

  constructor(name) {
    this._nativeInstance = null
    this.localName = name
    const binding = createBinding(this)
    this[BINDING] = binding
    BINDINGS.set(binding.id, binding)
    NODES.set(binding, this)
  }

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

  get lastChild() {
    return this.children.length > 0
      ? this.children[this.children.length - 1]
      : null
  }

  appendChild(node) {
    node.parent = this
    const existingChild = this.children.findIndex(
      x => x[BINDING].id === node[BINDING].id
    )
    if (existingChild > -1) {
      this.children.splice(existingChild, 1)
      this.children.push(node)
      this[BINDING].moveChild(
        node[BINDING].id,
        existingChild,
        this.children.length - 1
      )
    } else {
      this.children.push(node)
      this[BINDING].appendChild(node[BINDING].id)
    }
  }

  removeChild(node) {
    let index = -1
    this.children.filter((x, i) => {
      if (x[BINDING].id === node[BINDING].id) {
        index = i
      }
      return x[BINDING].id !== node[BINDING].id
    })
    if (index > -1) {
      this[BINDING].removeChild(index)
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
  constructor(type, reset) {
    super(type)
    this.style = createStyleBinding(this[BINDING].id)
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

  setAttribute(key, value) {
    this[BINDING]?.setProp(key, value)
  }

  getAttribute(key) {
    return this[BINDING]?.getProp(key)
  }

  removeAttribute(key) {
    this[BINDING].removeProp(key)
  }

  addEventListener(type, fn, options = {}) {
    const all = this[LISTENERS]
    let list = all.get(type)
    if (!list) {
      all.set(type, (list = []))
    }
    list.push({
      _listener: fn,
      _flags: getListenerFlags(options),
    })
  }

  removeEventListener(type, listener, options) {
    const list = this[LISTENERS].get(type)
    if (!list) return false
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
    while ((target = target.parentNode)) path.push(target)
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
    const component = TYPES[this.localName].hostComponent
    const _self = this
    const reactElement = {
      type: component,
      props: {},
      ref: x => {
        if (!VIEWS_RENDERED) {
          VIEWS_RENDERED = true
        }
        _self.ref = x
        INSTANCES.set(this[BINDING], x)
      },
    }

    reactElement.props.children = (this.children || []).map(x => x.render())
    Object.assign(reactElement.props, Object.fromEntries(this[BINDING].props))
    reactElement.$$typeof = REACT_ELEMENT_TYPE
    return reactElement
  }
}

class Text extends Node {
  constructor(data) {
    super('#text')
    this[BINDING].create()
    this[BINDING].setProp('text', String(data))
  }

  get nodeType() {
    return 3
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
    super('#document', true)
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
  constructor(type, bubbles, cancelable, timeStamp) {
    Object.defineProperty(this, IS_TRUSTED, { value: false })
    this.type = type
    this.bubbles = bubbles
    this.cancelable = cancelable
    this.target = null
    this.nativeEvent = null
    this.currentTarget = null
    this.inPassiveListener = false
    this.defaultPrevented = false
    this.cancelBubble = false
    this.immediatePropagationStopped = false
    this.data = undefined
  }
  get isTrusted() {
    return this[IS_TRUSTED]
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
const EVENTPHASE_AT_TARGET = 5
const EVENTOPT_ONCE = 8

// Flags are easier to compare for listener lookups
function getListenerFlags(options) {
  if (typeof options === 'object' && options) {
    let flags = options.capture ? EVENTPHASE_CAPTURE : EVENTPHASE_BUBBLE
    if (options.passive) flags &= EVENTPHASE_PASSIVE
    if (options.once) flags &= EVENTOPT_ONCE
    return flags
  }
  return options ? EVENTPHASE_CAPTURE : EVENTPHASE_BUBBLE
}

function fireEvent(event, target, phase) {
  const list = target[LISTENERS].get(event.type)
  if (!list) return
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
    // FIXME: the binary shift is always going to be true, need to
    // handle based on options
    if (item._flags & (EVENTOPT_ONCE !== 0)) {
      // list.splice(list.indexOf(item), 1)
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
