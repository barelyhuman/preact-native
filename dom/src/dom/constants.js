export const BINDING_NODE = Symbol.for('binding_node')
export const BINDING = Symbol.for('binding')
export const STYLE = Symbol.for('style')
export const CURRENT_STYLE = Symbol.for('current')
export const OWNER_NODE = Symbol.for('owner')
export const IS_TRUSTED = Symbol.for('isTrusted')
export const LISTENERS = Symbol.for('listeners')

export const KEYBOARD_EVENTS = ['topFocus', 'topEndEditing']
export const FOCUS_EVENTS = ['topFocus']
export const BLUR_EVENTS = ['topBlur']

export const EVENTPHASE_NONE = 0
export const EVENTPHASE_CAPTURE = 1
export const EVENTPHASE_AT_TARGET = 2
export const EVENTPHASE_BUBBLE = 3

export const NODE_TYPES = {
  ELEMENT: 1,
  TEXT_NODE: 3,
  DOCUMENT: 9,
}

export const EVENT_TYPES = {
  CLICK: 'Click',
  CHANGE: 'Change',
  FOCUS: 'Focus',
  BLUR: 'Blur',
}

// Not used anymore, leaving for reference later on
//
// export const REACT_ELEMENT_TYPE =
//   (typeof Symbol != 'undefined' && Symbol.for && Symbol.for('react.element')) ||
//   0xeac7
