import { registerHostElement } from './dom'
import * as UIManager from 'react-native/Libraries/ReactNative/UIManager'

const ITEMS = []

export function registerNativeDOM() {
  const nativeComponents = Object.keys(UIManager.getConstants())
  nativeComponents.forEach(constName => {
    const withoutNativeName = constName.replace(/^RCT/, '')
    ITEMS.push([withoutNativeName, constName])
  })

  ITEMS.forEach(x => registerHostElement(x[0], x[1], x[2]))
}
