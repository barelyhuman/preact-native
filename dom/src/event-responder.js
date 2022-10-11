import ReactNativePrivateInterface from 'react-native/Libraries/ReactPrivate/ReactNativePrivateInterface'
import { bridge } from './dom'

function receiveEvent(rootNodeID, topLevelType, nativeEventParam) {
  // TODO: need to handle other events
  console.log({ rootNodeID, topLevelType, nativeEventParam })
}

function receiveTouches(eventTopLevelType, touches, changedIndices) {
  if (!touches.length) {
    return
  }

  const touch = touches[0]

  const nativeEvent = touch
  let nodeId = nativeEvent.target < 1 ? null : touch.target

  if (!nodeId) {
    return
  }

  executeTouchEvent(nodeId, eventTopLevelType, nativeEvent)
}

function executeTouchEvent(nodeId, eventTopLevelType, nativeEvent = {}) {
  bridge.enqueue('event', [nodeId, eventTopLevelType, nativeEvent])
}

ReactNativePrivateInterface.RCTEventEmitter.register({
  receiveEvent: receiveEvent,
  receiveTouches: receiveTouches,
})
