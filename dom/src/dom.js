import { registry } from './dom/registry'
import { Window } from './dom/window'

export function createDOM(rootTag) {
  registry.reset()
  registry.root = rootTag
  var window = new Window()
  return window.document
}
