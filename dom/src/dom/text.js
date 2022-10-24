import { BINDING, NODE_TYPES } from './constants'
import { EventTarget } from './event-target'

export class Text extends EventTarget {
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
}
