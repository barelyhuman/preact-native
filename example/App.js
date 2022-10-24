/** @jsxImportSource preact */

import { TextInput, Text, View, SafeAreaView } from '@barelyhuman/preact-native'
import { Component } from 'preact'
import { signal } from '@preact/signals'
import { Alert } from 'react-native'
import { createApp, h as vueJSX } from 'vue'

function App() {
  // VueCounter()
  return <Counter />
}

// FIXME: event handlers compat for vue
function VueCounter() {
  const saView = document.createElement('SafeAreaView')
  document.appendChild(saView)

  const app = createApp({
    data() {
      return {
        count: 0,
      }
    },
    render() {
      return vueJSX(
        'View',
        {
          style: {
            backgroundColor: '#333',
            height: 52,
            justifyContent: 'center',
            alignItems: 'center',
            borderRadius: 6,
          },
        },
        vueJSX('Text', { style: { color: 'white' } }, this.count)
      )
    },
  })
  app.mount(saView)
}

const count = signal(0)

function Counter() {
  const handleClick = e => {
    e.stopPropagation()
    count.value += 1
  }

  return (
    <>
      <SafeAreaView>
        <View alignItems="center" justifyContent="center">
          <Text fontSize={30} margin={10} color="white">
            {count.value}
          </Text>
          {/* Additional view to force check bubbling */}
          <View>
            <View
              onClick={handleClick}
              borderRadius={6}
              width={250}
              backgroundColor={'#333'}
              alignItems="center"
              justifyContent="center"
            >
              <Text fontSize={30} margin={10} color="white">
                Inc
              </Text>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </>
  )
}

class TestRenderable extends Component {
  state = { email: '' }
  constructor(props) {
    super(props)
  }

  render() {
    return (
      <>
        <SafeAreaView backgroundColor="#181819">
          <View
            height="100%"
            width="100%"
            padding={10}
            alignItems="center"
            justifyContent="center"
          >
            <TextInput
              width={'100%'}
              height={52}
              marginBottom={8}
              padding={10}
              placeholder="email"
              borderRadius={10}
              borderWidth={1}
              borderColor="slategray"
              color="white"
              value={this.state.email}
              backgroundColor="transparent"
              onFocus={e => {
                console.log('focus')
              }}
              onBlur={e => {
                console.log('blur')
              }}
              onChange={e => {
                this.setState({ email: e.data })
              }}
            />
            <TextInput
              width={'100%'}
              height={52}
              marginBottom={8}
              padding={10}
              placeholder="password"
              secureTextEntry={true}
              borderRadius={10}
              borderWidth={1}
              borderColor="slategray"
              color="white"
              backgroundColor="transparent"
            />
            <View
              height={52}
              padding={15}
              width={'100%'}
              borderRadius={6}
              justifyContent="center"
              alignItems="center"
              backgroundColor="white"
              onClick={e => {
                e.stopPropagation()
                Alert.alert(`Oh hey, ${this.state.email}`)
              }}
            >
              <Text fontSize={16} fontWeight="bold">
                Login
              </Text>
            </View>
          </View>
        </SafeAreaView>
      </>
    )
  }
}

export default App
