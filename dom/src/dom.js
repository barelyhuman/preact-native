import { UIManager } from 'react-native'
import getNativeComponentAttributes from 'react-native/Libraries/ReactNative/getNativeComponentAttributes'

/**
 * @todo: figure out a way to handle refresh based renders
 * for things like safe area and text appends
 */

let ROOT_TAG

const BINDING = Symbol.for('binding')
const CURRENT_STYLE = Symbol.for('current')
const OWNER_NODE = Symbol.for('owner')

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

const bridge = {
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
      case 'moveChild': {
        const fromIndex = params[1]
        const toIndex = params[2]
        UIManager.manageChildren(
          id, // containerID
          [fromIndex], // moveFromIndices
          [toIndex], // moveToIndices
          [], // addChildReactTags
          [], // addAtIndices
          [] // removeAtIndices
        )
        break
      }
      case 'appendChild': {
        let parentTag = id
        const toAdd = params[1]
        if (binding.type === '#document') {
          parentTag = ROOT_TAG
          console.log('appending to root', ROOT_TAG)
        }
        UIManager.setChildren(parentTag, [toAdd])
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
    }
  },
  enqueue(method, params) {
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
      this[BINDING].moveChild(existingChild, this.children.length - 1)
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

  addEventListener(type, fn) {
    const eventUpperText = type[0].toUpperCase() + type.slice(1)
    this.setAttribute('on' + eventUpperText, fn)
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
    this[BINDING].setProp('text', data)
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
    moveChild(x, y) {
      bridge.enqueue('moveChild', [id, x, y])
    },
    appendChild(nodeId) {
      bridge.enqueue('appendChild', [id, nodeId])
    },
    removeChild(atIndex) {
      bridge.enqueue('removeChild', [id, atIndex])
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
