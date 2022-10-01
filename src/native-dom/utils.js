import { DevSettings } from 'react-native'

export function noop() {}

export const onRefresh = cb => {
  let oldRefresh = DevSettings.onFastRefresh
  // @ts-expect-error global value
  if (__DEV__) {
    DevSettings.onFastRefresh = () => {
      cb && cb()
      oldRefresh && oldRefresh()
    }
  }
}
