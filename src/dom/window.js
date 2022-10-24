import { HTMLCollection } from './html-collection'
import { NodeList } from './node-list'

import { SVGElement } from './svg-element'
import { Element } from './element'
import { EventTarget } from './event-target'
import { Node } from './node'
import { Document } from './document'
import { DocumentFragment } from './document-fragment'

export class Window {
  NodeList = NodeList
  HTMLCollection = HTMLCollection
  DocumentFragment = DocumentFragment
  SVGElement = SVGElement
  Element = Element
  EventTarget = EventTarget
  Node = Node
  document = new Document()
}
