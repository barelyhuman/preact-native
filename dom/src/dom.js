import { Document } from './dom/document'
import { registry } from './dom/registry'

export function createDOM(rootTag) {
  registry.reset()
  registry.root = rootTag
  const rootNode = new Document()
  return rootNode
}
