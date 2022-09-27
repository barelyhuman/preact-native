// Original Source https://github.com/developit/undom/blob/master/src/util.js
// MIT Copyright (c) 2016 Jason Miller
// The original source has been modified to suit the the needs of this project

export function assign(obj, props) {
  for (let i in props) obj[i] = props[i]
}

export function toLower(str) {
  return String(str).toLowerCase()
}

export function splice(arr, item, add, byValue) {
  let i = arr ? findWhere(arr, item, true, byValue) : -1
  if (~i) add ? arr.splice(i, 0, add) : arr.splice(i, 1)
  return i
}

export function findWhere(arr, fn, returnIndex, byValue) {
  let i = arr.length
  while (i--) if (byValue ? arr[i] === fn : fn(arr[i])) break
  return returnIndex ? i : arr[i]
}

export function createAttributeFilter(ns, name) {
  return o => o.ns === ns && toLower(o.name) === toLower(name)
}
