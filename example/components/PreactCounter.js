/** @jsxImportSource preact */
import { SafeAreaView, Text, View } from '@barelyhuman/preact-native'
import { Component } from 'preact'

export default class PreactCounter extends Component {
  state = {
    count: 0,
  }

  constructor() {
    super()
    this.handleInc = this.handleInc.bind(this)
    this.handleDec = this.handleDec.bind(this)
  }

  handleInc(e) {
    console.log('function called')
    e.stopPropagation()
    this.setState({
      count: this.state.count + 1,
    })
  }

  handleDec(e) {
    e.stopPropagation()
    this.setState({
      count: this.state.count - 1,
    })
  }

  render() {
    const bg = 'black'
    const fg = bg == 'black' ? 'white' : 'black'
    return (
      <>
        <SafeAreaView
          backgroundColor={bg}
          height={'100%'}
          alignItems="center"
          justifyContent="center"
        >
          <View flexDirection="row" alignItems="center">
            <View flex={1} alignItems="center">
              <Text color={fg} fontSize={30}>
                {this.state.count}
              </Text>
            </View>
            <View flex={2} alignItems="center">
              <View
                width={150}
                padding={12}
                borderRadius={6}
                backgroundColor={'dodgerblue'}
                margin={12}
                justifyContent="center"
                alignItems="center"
                onClick={this.handleInc}
              >
                <Text fontSize={16} fontWeight={'bold'} color={fg}>
                  +
                </Text>
              </View>
              <View
                width={150}
                padding={12}
                borderRadius={6}
                backgroundColor={'dodgerblue'}
                margin={12}
                justifyContent="center"
                alignItems="center"
                onClick={this.handleDec}
              >
                <Text fontSize={16} fontWeight={'bold'} color={fg}>
                  -
                </Text>
              </View>
            </View>
          </View>
        </SafeAreaView>
      </>
    )
  }
}
