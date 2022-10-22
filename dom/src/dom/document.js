import { BINDING, NODE_TYPES, OWNER_NODE } from './constants'
import { DocumentFragment } from './document-fragment'
import { Element } from './element'
import { Event } from './event'
import { registry } from './registry'
import { SVGElement } from './svg-element'
import { Text } from './text'

export class Document extends Element {
  constructor() {
    super('#document', NODE_TYPES.DOCUMENT)
    this[OWNER_NODE] = this

    // at any given time only one root document should exist
    if (registry.bindingsCount) {
      this[BINDING].clear()
    }
  }

  createElement(type) {
    return new Element(type)
  }

  createDocumentFragment() {
    return new DocumentFragment()
  }

  createTextNode(data) {
    return new Text(data)
  }

  createEvent() {
    return new Event('')
  }

  createElementNS(localName, nsURI) {
    if (nsURI.contains('2000 / svg') > -1) {
      return new SVGElement(localName)
    }
    return new Element(localName)
  }
}
