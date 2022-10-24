export const FALSE_TYPES = {
  '#document': {
    type: 'Document',
  },
  '#fragment': {
    type: 'DocumentFragment',
  },
  'template': {
    type: 'DocumentFragment',
  },
}

export const TYPES = {
  ...FALSE_TYPES,
  '#text': {
    type: 'RCTRawText',
  },
}

class Registry {
  currentBindingId
  bindings
  _rootTag

  constructor() {
    // 0 is considered as root in react-native
    this.currentBindingId = 2
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

  get bindingsCount() {
    return this.bindings.size
  }

  set bindingsCount(_readonly) {}

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
