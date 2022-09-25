import { h } from 'preact'
import { COMPONENT_MAP } from './component-map'

/**
 * @type {import("./index").makeComponent}
 */
export const makeComponent = (nativeModule, name, opts) => {
  function ComponentWrapper({ children, ...props }) {
    // @ts-ignore
    return h(name, props, children)
  }
  ComponentWrapper.displayName = name
  COMPONENT_MAP[name.toUpperCase()] = { mod: nativeModule, options: opts }
  return ComponentWrapper
}
