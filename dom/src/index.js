import { UIManager } from 'react-native'

const BINDING = Symbol.for('binding')
const CURRENT_STYLE = Symbol.for('current')
const OWNER_NODE = Symbol.for('owner')

const BINDINGS = new Map()
const INSTANCES = new WeakMap()
const NODES = new WeakMap()

let VIEWS_RENDERED = false

export const REACT_ELEMENT_TYPE =
  (typeof Symbol != 'undefined' && Symbol.for && Symbol.for('react.element')) ||
  0xeac7

const TYPES = {
  '#text': {
    type: '#text',
  },
  '#document': {
    type: 'Document',
  },
}

let renderQ = []

const pChain = Promise.resolve()

const bridge = {
  currentId: 0,
  call(method, params) {
    if (method === 'empty') {
      return
    }
    const id = params[0]
    const binding = BINDINGS.get(id)
    switch (method) {
      case 'setProp': {
        if (binding.type == '#text') {
          updateTextNode(id)
        }
        updateNodeProps(id)
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
      if (VIEWS_RENDERED) {
        pChain.then(process)
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

  appendChild(node) {
    node.parent = this
    this.children.push(node)
  }

  removeChild(node) {
    this.children.filter(x => x[BINDING].id === node[BINDING].id)
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
  constructor() {
    super('#document')
  }

  createElement(type) {
    return new Element(type)
  }

  createTextNode(data) {
    return new Text(data)
  }
}

export function registerHostElement(type, host) {
  TYPES[type] = {
    type: type,
    hostComponent: host,
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
  const node = NODES.get(binding)
  if (!node.parent) {
    return
  }

  const parentBinding = BINDINGS.get(node.parent[BINDING].id)
  const parentInstance = INSTANCES.get(parentBinding)
  const nativeTextNode = parentInstance._children[0]

  if (typeof nativeTextNode === 'number') {
    UIManager.updateView(nativeTextNode, 'RCTRawText', {
      text: binding.getProp('text'),
    })
  }
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
