import { NODE_TYPES } from './constants'
import { Node } from './node'

export class DocumentFragment extends Node {
  constructor() {
    super('#fragment', NODE_TYPES.DOCUMENT_FRAGMENT)
  }
}
