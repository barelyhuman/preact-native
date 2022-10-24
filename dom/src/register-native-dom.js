import * as UIManager from 'react-native/Libraries/ReactNative/UIManager'
import { registry } from './dom/registry'

const ITEMS = []

export function registerNativeDOM() {
  const nativeComponents = Object.keys(UIManager.getConstants())
  nativeComponents.forEach(constName => {
    const withoutNativeName = constName.replace(/^RCT/, '')
    ITEMS.push([withoutNativeName, constName])
  })

  ITEMS.forEach(hostComponentDef =>
    registry.registerHostElement(
      hostComponentDef[0],
      hostComponentDef[1],
      hostComponentDef[2]
    )
  )
}
