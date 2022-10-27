/**@jsxImportSource preact */
import { SafeAreaView, View, Text } from '@barelyhuman/preact-native'
import { Component } from 'preact'

const textStyle = {
  color: 'dodgerblue',
}

export default class MultiPage extends Component {
  state = {
    page: 1,
  }

  constructor() {
    super()
  }

  render() {
    return (
      <SafeAreaView>
        {this.state.page == 1 && (
          <Page1 onNext={() => this.setState({ page: 2 })} />
        )}
        {this.state.page == 2 && (
          <Page2 onBack={() => this.setState({ page: 1 })} />
        )}
      </SafeAreaView>
    )
  }
}

class Page1 extends Component {
  render({ onNext }) {
    return (
      <View>
        <Text style={textStyle}>Hello Page 1</Text>
        <View onClick={onNext}>
          <Text style={textStyle}>Page 2 →</Text>
        </View>
      </View>
    )
  }
}
class Page2 extends Component {
  render({ onBack }) {
    return (
      <View>
        <Text style={textStyle}>Hello Page 2</Text>
        <View onClick={onBack}>
          <Text style={textStyle}>← Page 1</Text>
        </View>
      </View>
    )
  }
}
