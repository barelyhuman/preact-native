import { AppRegistry } from 'react-native'
import App from './App'
import { name as appName } from './app.json'
import { withPreact } from '@barelyhuman/preact-native'
import { render } from 'preact'

AppRegistry.registerComponent(appName, () => withPreact(App, render))
