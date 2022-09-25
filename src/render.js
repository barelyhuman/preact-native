import { options, h, render as preactRender } from 'preact'
import React from 'react'
import dom from 'undom'
import mitt from 'mitt'
import { COMPONENT_MAP } from './component-map'

const VNODE_REF = '__vnode_ref__'
const commitEmitter = mitt()
const debouncedEmitter = createDebouncedEmitter(commitEmitter)

export function preactRenderer(node) {
  global.document = createDOM()
  injectPreactHooks()
  return render(node)
}

function createDOM() {
  const document = dom()
  let oldDocCreate = document.createElement
  document.createElement = type => {
    const elm = oldDocCreate(type)
    return _attachNativeElement(elm)
  }
  return document
}

function createDebouncedEmitter(emitter) {
  let tid
  return (msg, payload) => {
    if (tid) {
      clearTimeout(tid)
    }
    tid = setTimeout(() => {
      emitter.emit(msg, payload)
    }, 0)
  }
}

function injectPreactHooks() {
  // @ts-expect-error unexported type, internal mangled hook
  let oldCommit = options.__c

  // @ts-expect-error unexported type, internal mangled hook
  options.__c = (vnode, commitQueue) => {
    oldCommit && oldCommit(vnode, commitQueue)
    debouncedEmitter('redraw')
  }
}

function render(node) {
  preactRender(h(node, {}), document.body)
  const _node = build(document.body.childNodes[0])

  return {
    tree: _node,
    subscribe: cb => {
      commitEmitter.on('redraw', () => {
        cb(build(document.body.childNodes[0]))
      })
    },
  }
}

function _attachNativeElement(el) {
  let selectedMod = COMPONENT_MAP[el.nodeName]
  let nativeModule = selectedMod.mod
  try {
    if (selectedMod.options && selectedMod.options.noConstructor) {
      nativeModule = selectedMod.mod()
    } else {
      nativeModule = new selectedMod.mod()
    }
  } catch (err) {
    nativeModule = selectedMod.mod
  }
  el[VNODE_REF] = nativeModule
  return el
}

function build(baseNode) {
  if (!baseNode) return React.createElement(React.Fragment)
  const nodeTree = convert(baseNode)
  return nodeTree
}

function convert(node) {
  const vnode = node[VNODE_REF]

  // textual node to send back data or value
  if (node.nodeType === 3) {
    if (typeof node.data !== 'undefined') {
      return node.data
    }
    return node.nodeValue
  }

  const props = {}

  for (let i of node.attributes) {
    props[i.name] = i.value
  }

  props.style = getStylesFromNode(node)

  const handlers = getEventHandlersFromNode(node)
  Object.assign(props, handlers)

  return React.createElement(
    vnode,
    props,
    ...(node.childNodes || []).map(x => convert(x))
  )
}

function getEventHandlersFromNode(node) {
  const handlers = {}

  const KEY_MAP = {
    press: {
      type: 'Press',
      method: 'onPress',
    },
    change: {
      type: 'Change',
      method: 'onChange',
    },
  }

  Object.keys(node.__handlers).forEach(key => {
    const actionable = KEY_MAP[key]
    handlers[actionable.method] = ev => {
      ev.type = actionable.type
      node.__handlers[key][0].bind(node)(ev)
    }
  })
  return handlers
}

function getStylesFromNode(node) {
  const style = Object.fromEntries(
    Object.entries(node.style).map(([k, v]) => {
      let val = v
      if (typeof val === 'string' && /px$/.test(val)) {
        val = Number(val.replace('px', ''))
      }
      return [k, val]
    })
  )

  return style
}
