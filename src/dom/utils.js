import { BINDING } from './constants'

export function getChildIndex(parent, toFind) {
  return parent.children.findIndex(isSameChild, toFind)
}

export function isSameChild(item) {
  return item[BINDING].id === this[BINDING].id
}
