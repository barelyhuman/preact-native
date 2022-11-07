import { Platform } from 'react-native'
import { h } from 'preact'

export function SafeAreaView({ ...props }) {
  let compName = 'SafeAreaView'
  if (Platform.OS === 'android') {
    compName = 'View'
  }
  return h(compName, props)
}

export function View({ ...props }) {
  return h('View', props)
}

export function Text({ ...props }) {
  return h('Text', props)
}

export function TextInput({ ...props }) {
  const text = props.value
  const baseComponentName = props.multiline
    ? 'MultilineTextInputView'
    : 'SinglelineTextInputView'
  return h(baseComponentName, { ...props, text })
}
