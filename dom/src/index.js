import {
  UIManager,
  AccessibilityInfo,
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Button,
  DrawerLayoutAndroid,
  FlatList,
  Image,
  ImageBackground,
  InputAccessoryView,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  RefreshControl,
  SafeAreaView as RSafeAreaView,
  ScrollView,
  SectionList,
  StatusBar,
  Switch,
  Text as RText,
  TextInput,
  Touchable,
  TouchableHighlight,
  TouchableNativeFeedback,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  VirtualizedList,
  VirtualizedSectionList,
} from 'react-native'
import { noop, onRefresh } from './utils'

const meta = {
  renderStarted: false,
}

let BINDINGS = new Map()
let NODES = new WeakMap()

const IS_TRUSTED = Symbol.for('is_trusted')
const BINDING = Symbol.for('binding')

const TYPES = {
  '#text': { type: 'Text' },
  '#document': { type: 'Document', hostComponent: View },
  'Text': { type: 'NATIVE_Text', hostComponent: RText },
  'SafeAreaView': { type: 'NATIVE_SafeAreaView', hostComponent: RSafeAreaView },
  'AccessibilityInfo': {
    type: 'NATIVE_AccessibilityInfo',
    hostComponent: AccessibilityInfo,
  },
  'ActivityIndicator': {
    type: 'NATIVE_ActivityIndicator',
    hostComponent: ActivityIndicator,
  },
  'Button': { type: 'NATIVE_Button', hostComponent: Button },
  'DrawerLayoutAndroid': {
    type: 'NATIVE_DrawerLayoutAndroid',
    hostComponent: DrawerLayoutAndroid,
  },
  'FlatList': { type: 'NATIVE_FlatList', hostComponent: FlatList },
  'Image': { type: 'NATIVE_Image', hostComponent: Image },
  'ImageBackground': {
    type: 'NATIVE_ImageBackground',
    hostComponent: ImageBackground,
  },
  'InputAccessoryView': {
    type: 'NATIVE_InputAccessoryView',
    hostComponent: InputAccessoryView,
  },
  'KeyboardAvoidingView': {
    type: 'NATIVE_KeyboardAvoidingView',
    hostComponent: KeyboardAvoidingView,
  },

  'Modal': { type: 'NATIVE_Modal', hostComponent: Modal },
  'Pressable': { type: 'NATIVE_Pressable', hostComponent: Pressable },

  'RefreshControl': {
    type: 'NATIVE_RefreshControl',
    hostComponent: RefreshControl,
  },
  'ScrollView': { type: 'NATIVE_ScrollView', hostComponent: ScrollView },
  'SectionList': { type: 'NATIVE_SectionList', hostComponent: SectionList },
  'StatusBar': { type: 'NATIVE_StatusBar', hostComponent: StatusBar },
  'Switch': { type: 'NATIVE_Switch', hostComponent: Switch },
  'TextInput': { type: 'NATIVE_TextInput', hostComponent: TextInput },
  'Touchable': { type: 'NATIVE_Touchable', hostComponent: Touchable },
  'TouchableHighlight': {
    type: 'NATIVE_TouchableHighlight',
    hostComponent: TouchableHighlight,
  },
  'TouchableNativeFeedback': {
    type: 'NATIVE_TouchableNativeFeedback',
    hostComponent: TouchableNativeFeedback,
  },
  'TouchableOpacity': {
    type: 'NATIVE_TouchableOpacity',
    hostComponent: TouchableOpacity,
  },
  'TouchableWithoutFeedback': {
    type: 'NATIVE_TouchableWithoutFeedback',
    hostComponent: TouchableWithoutFeedback,
  },
  'View': { type: 'NATIVE_View', hostComponent: View },
  'VirtualizedList': {
    type: 'NATIVE_VirtualizedList',
    hostComponent: VirtualizedList,
  },
  'VirtualizedSectionList': {
    type: 'NATIVE_VirtualizedSectionList',
    hostComponent: VirtualizedSectionList,
  },
  'ActionSheetIOS': {
    type: 'NATIVE_ActionSheetIOS',
    hostComponent: ActionSheetIOS,
  },
  'Alert': { type: 'NATIVE_Alert', hostComponent: Alert },
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
        _updateNodeProps(node, binding)
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

// TODO: Convert the queue to a passive one
// Something that could listen to additions
// and then start itself and not keep looping
// if nothing is there
function createProcess() {
  return function process() {
    if (meta.renderStarted && bridge.queue.length > 0) {
      const toProcess = bridge.queue.shift()
      bridge.call(toProcess.method, toProcess.params)
    }
    setTimeout(() => {
      process()
    }, 0)
  }
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
      bridge.enqueue('create', [id, config, props])
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
    removeProp(prop) {
      props.delete(prop)
    },
    getProp(prop) {
      return props.get(prop)
    },
    getAllProps() {
      return [...props.entries()]
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

function _updateNodeProps(node, binding) {
  if (!node.ref) {
    // TODO: throw an non render error
    return
  }
  const props = binding.getAllProps()
  const _props = Object.fromEntries(props)
  // Will be deprecated soon, have to switch to
  // writing our own
  node.ref.setNativeProps(_props)
}

const LISTENERS = Symbol.for('listeners')
const STYLE = Symbol.for('style')
const CURRENT_STYLE = Symbol.for('currentStyle')
const OWNER_NODE = Symbol.for('ownerNode')

const REACT_ELEMENT_TYPE =
  (typeof Symbol !== 'undefined' &&
    Symbol.for &&
    Symbol.for('react.element')) ||
  0xeac7

class Node {
  parent = null
  children = []
  constructor(localName) {
    this.localName = localName
    const binding = createBinding(this)
    this[BINDING] = binding
    NODES.set(binding, this)
  }

  get ref() {
    return this.nativeRef
  }

  set ref(val) {
    this.nativeRef = val
  }

  get parentNode() {
    return this.parent
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
    return this.getAttribute('id')
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

export function render(node) {
  const process = createProcess()
  process()

  // Only executes during development or to be specific
  //   when the __DEV__ flag is enabled
  onRefresh(noop)

  let renderTree = _buildRenderTree(node)
  return renderTree
}

function _buildRenderTree(node) {
  let tree
  let currentNode = node
  tree = currentNode.render()
  return tree
}
