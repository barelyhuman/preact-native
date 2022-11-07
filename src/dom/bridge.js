/**
 *
 * Bridge is responsible for handling and queuing the tasks
 * that are to be sent to the React Native SDK
 *
 * This involves, creation, removal , addition and repositioning
 * of elements on the device which is handled by the SDK
 * but the tasks as queued as to execute in an order instead
 * of going haywire.
 *
 */

import getNativeComponentAttributes from 'react-native/Libraries/ReactNative/getNativeComponentAttributes'
import * as ReactNativePrivateInterface from 'react-native/Libraries/ReactPrivate/ReactNativePrivateInterface'

import {
  BINDING,
  BINDING_NODE,
  BLUR_EVENTS,
  EVENT_TYPES,
  FOCUS_EVENTS,
  KEYBOARD_EVENTS,
} from './constants'
import { FALSE_TYPES, registry, TYPES } from './registry'
import { isSameChild } from './utils'

class Bridge {
  queue = []
  processChain
  processing = false
  emitter

  constructor() {
    this.processChain = Promise.resolve()
    this.emitter = ReactNativePrivateInterface.RCTEventEmitter

    this.initEmitter()
  }

  initEmitter() {
    this.emitter.register({
      receiveEvent: receiveEvent.bind(this),
      receiveTouches: receiveTouches.bind(this),
    })
  }

  enqueue(method, params) {
    // FIXME: add handling to avoid consecutive duplicate
    // processes in the queue while letting repositioning work
    if (
      this.queue.push({
        method,
        params,
      }) === 1
    ) {
      const rootTag = registry.root
      if (typeof rootTag != null && !this.processing) {
        this.processing = true
        this.processChain = this.processChain.then(process.bind(this))
      }
    }
  }

  call(method, params) {
    console.log({ method, params })
    const id = params[0]
    const binding = registry.getBinding(id)
    const node = binding[BINDING_NODE]
    let ROOT_TAG = registry.root

    switch (method) {
      case 'clear': {
        const childIndices = (node.childNodes || []).map((_, i) => i)
        try {
          ReactNativePrivateInterface.UIManager.manageChildren(
            ROOT_TAG,
            [],
            [],
            [],
            [],
            childIndices
          )
        } catch (err) {}
        break
      }
      case 'create': {
        const type = params[1]
        if (Object.keys(FALSE_TYPES).indexOf(type) > -1) {
          break
        }

        const rawViewClass = TYPES[type]
        if (type === '#text') {
          ReactNativePrivateInterface.UIManager.createView(
            binding.id,
            'RCTRawText',
            ROOT_TAG,
            {
              text: binding.getProp('text'),
            }
          )
        } else {
          ReactNativePrivateInterface.UIManager.createView(
            binding.id,
            rawViewClass.type,
            ROOT_TAG,
            {}
          )
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
        const toCreateAt = []
        const moveFrom = []
        const moveTo = []

        nextSet.forEach((nodeChild, ind) => {
          const exists = oldChildren.findIndex(isSameChild, nodeChild)
          if (exists == -1) {
            toCreate.push(nodeChild[BINDING].id)
            toCreateAt.push(ind)
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

        ReactNativePrivateInterface.UIManager.manageChildren(
          parentTag, // containerID
          moveFrom, // moveFromIndices
          moveTo, // moveToIndices
          toCreate, // addChildReactTags
          toCreateAt, // addAtIndices
          toDelete // removeAtIndices
        )

        break
      }
      case 'event': {
        const targetId = params[0]
        this.handleEvent('event', params)
        break
      }
    }
  }
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
          this.handleClickEvent(targetId, params[2])
        }

        if (isKeyboardEvent(params[1])) {
          this.handleKeyboardEvent(targetId, params[2])
        }

        if (isGenericEvent(params[1])) {
          this.handleGenericEvent(targetId, params[1], params[2])
        }

        break
    }
  }
  handleClickEvent(targetId, nativeEvent) {
    const target = registry.getBinding(targetId)
    if (target) {
      target.dispatchEvent({
        type: EVENT_TYPES.CLICK,
        event: nativeEvent,
      })
    }
  }
  handleKeyboardEvent(targetId, nativeEvent) {
    const target = registry.getBinding(targetId)
    if (target) {
      target.dispatchEvent({
        type: EVENT_TYPES.CHANGE,
        event: nativeEvent,
      })
    }
  }
  handleGenericEvent(targetId, eventType, nativeEvent) {
    let _eventType

    if (isFocusEvent(eventType)) {
      _eventType = EVENT_TYPES.FOCUS
    }
    if (isBlurEvent(eventType)) {
      _eventType = EVENT_TYPES.BLUR
    }

    const target = registry.getBinding(targetId)

    if (target) {
      target.dispatchEvent({
        type: _eventType,
        event: nativeEvent,
      })
    }
  }
}

function updateTextNode(id) {
  const binding = registry.getBinding(id)
  ReactNativePrivateInterface.UIManager.updateView(id, 'RCTRawText', {
    text: binding.getProp('text'),
  })
}

function updateNodeProps(id) {
  const binding = registry.getBinding(id)
  const props = Object.fromEntries(binding.props)

  if (TYPES[binding.type]) {
    const managerName = TYPES[binding.type].type
    const viewConfig = getNativeComponentAttributes(managerName)
    const validProps = processProps(props, viewConfig.validAttributes)
    ReactNativePrivateInterface.UIManager.updateView(
      id,
      viewConfig.uiViewClassName,
      validProps
    )
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
    executeGenericEvents.call(this, nodeId, topLevelType, nativeEventParam)
  }
  if (KEYBOARD_EVENTS.indexOf(topLevelType) > -1) {
    executeKeyboardEvent.call(this, nodeId, topLevelType, nativeEventParam)
  }
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

  if (nodeId === registry.root) {
    return
  }
  executeTouchEvent.call(this, nodeId, eventTopLevelType, nativeEvent)
}

function executeTouchEvent(nodeId, eventTopLevelType, nativeEvent = {}) {
  this.enqueue('event', [nodeId, eventTopLevelType, nativeEvent])
}

function executeGenericEvents(nodeId, eventTopLevelType, nativeEvent = {}) {
  this.enqueue('event', [nodeId, eventTopLevelType, nativeEvent])
}

function executeKeyboardEvent(nodeId, eventTopLevelType, nativeEvent = {}) {
  this.enqueue('event', [nodeId, eventTopLevelType, nativeEvent])
}

// TODO: if used somewhere else, add to
// a shared folder
const microTask = fn => setTimeout(fn, 1)

function process() {
  const q = this.queue || []
  let methodDef = q.shift()
  if (methodDef) {
    dispatch.call(this, methodDef)
    microTask(() => {
      process.call(this)
    })
  } else {
    this.processing = false
  }
}

function dispatch(methodDef) {
  this.call(methodDef.method, methodDef.params)
}

export const bridge = new Bridge()
