import { UIManager, DevSettings } from 'react-native'

/**
 * @todo: figure out a way to handle refresh based renders
 * for things like safe area and text appends
 */

let ROOT_TAG

const BINDING = Symbol.for('binding')
const CURRENT_STYLE = Symbol.for('current')
const OWNER_NODE = Symbol.for('owner')

const BINDINGS = new Map()
const INSTANCES = new WeakMap()
const NODES = new WeakMap()

let VIEWS_RENDERED = false
let pChain = Promise.resolve()
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
        if (binding.type === '#document') {
          UIManager.setChildren(
            ROOT_TAG,
            node.children.map(x => x[BINDING].id)
          )
        } else {
          UIManager.setChildren(
            binding.id,
            node.children.map(x => x[BINDING].id)
          )
        }
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
      pChain.then(process)
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
    this.children.push(node)
    this[BINDING].updateChildren()
  }

  removeChild(node) {
    this.children.filter(x => x[BINDING].id === node[BINDING].id)
    this[BINDING].updateChildren()
  }

  get ref() {
    return this._nativeInstance
  }
  set ref(node) {
    this._nativeInstance = node
  }
}

class Element extends Node {
  constructor(type) {
    super(type)
    this.style = createStyleBinding(this[BINDING].id)
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
          pChain.then(process)
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
    super('#document')
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
  const id = ++bridge.currentId
  const props = new Map()
  return {
    id,
    props,
    type: node.localName,
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
    updateChildren() {
      bridge.enqueue('updateChildren', [id])
    },
  }
}

function process() {
  let toProcess
  while ((toProcess = renderQ.shift())) {
    bridge.call(toProcess.method, toProcess.params)
  }
}

function updateNodeProps(id) {
  const binding = BINDINGS.get(id)
  const instance = INSTANCES.get(binding)
  const props = Object.fromEntries(binding.props)
  if (instance) {
    instance.setNativeProps(props)
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

function onRefresh(cb) {
  if (__DEV__) {
    let oldRefresh = DevSettings.onFastRefresh
    DevSettings.onFastRefresh = () => {
      cb && cb()
      oldRefresh && oldRefresh()
    }
  }
}

function noop() {}

export function createDOM(rootTag) {
  onRefresh(noop)
  return new Document(rootTag)
}
