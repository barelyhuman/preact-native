import { h } from 'preact'

export function SafeAreaView({ ...props }) {
  return h('SafeAreaView', props)
}

export function View({ ...props }) {
  return h('View', props)
}

export function Text({ ...props }) {
  return h('Text', props)
}
