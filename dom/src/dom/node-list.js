// https://dom.spec.whatwg.org/#interface-nodelist

export class NodeList extends Array {
  item(index) {
    return this[index]
  }
}
