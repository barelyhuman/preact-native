import { createDOM, registerNativeDOM } from '@barelyhuman/preact-native/dom'
import { Alert } from 'react-native'

// /** @jsxImportSource preact */
import { render } from 'preact'

let document

function App({ rootTag }) {
  // Register native components as dom compatible elements
  registerNativeDOM()
  // create a dom with the root container from react native
  document = createDOM(rootTag)
  global.document = document

  createApp()
  return null
  return (
    <View
      onTouchStart={() => {
        console.log('touch start')
      }}
      style={{
        backgroundColor: 'black',
        padding: 10,
        margin: 10,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text></Text>
    </View>
  )
}

function createApp() {
  let saView, view, tNode
  document.appendChild((saView = document.createElement('SafeAreaView')))
  saView.appendChild((view = document.createElement('View')))
  view.appendChild((tNode = document.createElement('Text')))
  tNode.textContent = 'hello'
  Object.assign(view.style, {
    backgroundColor: 'black',
    padding: 10,
    margin: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  })
  Object.assign(tNode.style, {
    color: 'white',
  })
  view.setAttribute('pointerEvents', 'auto')
  view.addEventListener('click', e => {
    Alert.alert('Yo, we work, like, glitchy, but we work')
    return false
  })
}

export default App
