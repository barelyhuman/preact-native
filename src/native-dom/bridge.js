import { UIManager } from 'react-native'
import { Event } from './element'
import { BINDINGS, IS_TRUSTED, meta, NODES, TYPES } from './shared'

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
export function createProcess() {
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

export function createBinding(node) {
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
