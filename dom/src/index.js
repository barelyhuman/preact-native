import { createDOM as cDOM } from './dom'
import { registerNativeDOM } from './register-native-dom'

function initEnvironment(rootTag) {
  registerNativeDOM()
  return cDOM(rootTag)
}

export { initEnvironment as createDOM }
