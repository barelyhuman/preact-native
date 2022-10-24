// https://dom.spec.whatwg.org/#htmlcollection

export class HTMLCollection extends Array {
  item(index) {
    return this[index]
  }
  namedItem(_nullified) {
    return null
  }
}
