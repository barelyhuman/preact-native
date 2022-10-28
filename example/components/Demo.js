/**@jsxImportSource preact*/
import { Component } from 'preact'
import { SafeAreaView, Text, View } from '@barelyhuman/preact-native'
import { StyleSheet } from 'react-native'

export class Demo extends Component {
  state = {
    activeTab: 0,
  }
  render() {
    return (
      <>
        <SafeAreaView height={'100%'} backgroundColor={'#673ab8'}>
          <View
            padding={12}
            flexDirection={'row'}
            backgroundColor={'#673ab8'}
            alignItems={'baseline'}
            justifyContent={'space-between'}
          >
            <View>
              <Text fontSize={24} style={styles.primaryText}>
                Preact Native
              </Text>
            </View>
            <View flexDirection={'row'} alignItems={'baseline'}>
              <View
                style={styles.tabView}
                borderColor={
                  this.state.activeTab === 0 ? '#ad80ff' : 'transparent'
                }
                onClick={() => {
                  this.setState({
                    activeTab: 0,
                  })
                }}
              >
                <Text style={styles.primaryText}>About</Text>
              </View>
              <View
                style={styles.tabView}
                borderColor={
                  this.state.activeTab === 1 ? '#ad80ff' : 'transparent'
                }
                onClick={() => {
                  this.setState({
                    activeTab: 1,
                  })
                }}
              >
                <Text style={styles.primaryText}>Counter</Text>
              </View>
            </View>
          </View>
          <View style={styles.tabPageContainer}>
            <About show={this.state.activeTab === 0} />
            <Counter show={this.state.activeTab === 1} />
          </View>
        </SafeAreaView>
      </>
    )
  }
}

function About({ show }) {
  if (!show) {
    return null
  }
  return (
    <>
      <Text color={'#ccc'}>
        Preact Native, as of now is an experimental approach at connecting the
        react-native SDK to the preact web UI library
      </Text>
    </>
  )
}

class Counter extends Component {
  state = {
    count: 0,
    focused: false,
  }

  render({ show }) {
    if (!show) {
      return null
    }
    return (
      <View justifyContent="center" alignItems="center">
        <Text style={styles.primaryText} fontSize={24}>
          {this.state.count}
        </Text>
        <View
          style={styles.button}
          backgroundColor={this.state.focused ? 'white' : 'transparent'}
          marginTop={20}
          onClick={() => {
            this.setState(() => ({
              focused: true,
              count: this.state.count + 1,
            }))
            setTimeout(() => {
              this.setState(() => ({
                focused: false,
              }))
            }, 250)
          }}
        >
          <Text
            style={styles.buttonText}
            color={this.state.focused ? 'black' : 'white'}
          >
            Inc
          </Text>
        </View>
      </View>
    )
  }
}

const styles = StyleSheet.create({
  tabView: {
    marginHorizontal: 2,
    padding: 4,
    borderTopWidth: 4,
  },
  primaryText: {
    color: '#fff',
  },
  secondaryText: {
    color: '#ccc',
  },
  tabPageContainer: {
    marginTop: 12,
    padding: 12,
    height: '100%',
    backgroundColor: '#1c2027',
  },
  button: {
    borderRadius: 6,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    borderColor: '#fff',
    marginHorizontal: 16,
    minWidth: 200,
    paddingHorizontal: 32,
    paddingVertical: 12,
  },
  buttonText: {
    fontSize: 18,
  },
})
