import { NODE_TYPES } from './constants'
import { Element } from './element'
import { Text } from './text'

export class Document extends Element {
  constructor() {
    super('#document', true, NODE_TYPES.DOCUMENT)
  }

  createElement(type) {
    return new Element(type)
  }

  createTextNode(data) {
    return new Text(data)
  }
}
