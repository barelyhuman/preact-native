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

export const findKeyPath = (obj, toMatch, path = '') => {
  if (typeof obj[toMatch] !== 'undefined') {
    return path
  }

  for (let key of Object.keys(obj)) {
    if (key === toMatch) {
      return path
    }

    if (typeof obj[key] === 'object') {
      const _path = findKeyPath(obj[key], toMatch, path + '.' + key)
      if (!_path) {
        continue
      }
      if (_path.length > 0) {
        return _path
      }
    }
  }
}
