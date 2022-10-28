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
  defaultBindingId = 4
  defaultIncrementCount = 4

  constructor() {
    // 0 is considered as root in react-native
    this.currentBindingId = this.defaultBindingId
    this.bindings = new Map()
  }

  set root(tag) {
    this._rootTag = tag
  }

  get root() {
    return this._rootTag
  }

  reset() {
    this.currentBindingId = this.defaultBindingId
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
    // 2 and 10 are used to identify views in react and the tags
    // could clash so we use 4, would use a hash but then the SDK doesn't
    // allow strings
    const inc = this.defaultIncrementCount
    let nextTag = (this.currentBindingId += inc)
    if (nextTag === this._rootTag) {
      nextTag += inc
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
