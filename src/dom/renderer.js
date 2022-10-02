import { createProcess, noop, onRefresh } from 'dom-native'

export function render(node) {
  const process = createProcess()
  process()

  // Only executes during development or to be specific
  //   when the __DEV__ flag is enabled
  onRefresh(noop)

  let renderTree = _buildRenderTree(node)
  return renderTree
}

function _buildRenderTree(node) {
  let tree
  let currentNode = node
  tree = currentNode.render()
  return tree
}
