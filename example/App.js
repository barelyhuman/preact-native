import { createDOM, registerNativeDOM } from '@barelyhuman/preact-native/dom'

let document

function App({ rootTag }) {
  registerNativeDOM()
  document = createDOM(rootTag)
  global.document = document
  onRender()
  return null
}

function onRender() {
  const saView = document.createElement('SafeAreaView')
  const el = document.createElement('Text')
  el.textContent = 'hello world'
  saView.appendChild(el)
  setTimeout(() => {
    el.textContent = 'hello reaper'
  }, 2500)
  document.appendChild(saView)
}

export default App
