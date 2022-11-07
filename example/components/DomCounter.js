import { Platform } from 'react-native'

export default function DomApp() {
  let count = 0
  let saView
  if (Platform.OS === 'android') {
    saView = document.createElement('View')
  } else {
    saView = document.createElement('SafeAreaView')
  }

  const view = document.createElement('View')
  const text = document.createElement('Text')
  text.textContent = count

  Object.assign(text.style, {
    color: 'white',
    fontSize: 24,
  })

  Object.assign(view.style, {
    backgroundColor: 'dodgerblue',
    padding: 16,
    borderRadius: 6,
    margin: 10,
    justifyContent: 'center',
    alignItems: 'center',
  })

  view.addEventListener('click', e => {
    e.stopPropagation()
    text.textContent = ++count
  })

  view.appendChild(text)
  saView.appendChild(view)
  document.appendChild(saView)

  return null
}
