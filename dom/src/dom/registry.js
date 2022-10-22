export const TYPES = {
  '#text': {
    type: 'RCTRawText',
  },
  '#document': {
    type: 'Document',
  },
}

class Registry {
  currentBindingId = 0
  bindings
  _rootTag

  constructor() {
    this.currentBindingId = 0
    this.bindings = new Map()
  }

  set root(tag) {
    this._rootTag = tag
  }

  get root() {
    return this._rootTag
  }

  reset() {
    this.currentBindingId = 0
    this.clearBindings()
  }

  addBinding(binding) {
    this.bindings.set(binding.id, binding)
  }

  getBinding(id) {
    return this.bindings.get(id)
  }

  clearBindings() {
    this.bindings.clear()
  }

  allocateNewTag() {
    let nextTag = (this.currentBindingId += 1)
    if (nextTag === this._rootTag) {
      nextTag += 1
    }
    return nextTag
  }
  registerHostElement(componentName, nativeComp, options = {}) {
    if (options.nativeHost) {
      TYPES[componentName] = {
        type: componentName,
        hostComponent: nativeComp,
      }
    } else {
      TYPES[componentName] = {
        type: nativeComp,
      }
    }
  }
}

export const registry = new Registry()
