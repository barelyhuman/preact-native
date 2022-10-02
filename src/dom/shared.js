import {
  AccessibilityInfo,
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Button,
  DrawerLayoutAndroid,
  FlatList,
  Image,
  ImageBackground,
  InputAccessoryView,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  RefreshControl,
  SafeAreaView as RSafeAreaView,
  ScrollView,
  SectionList,
  StatusBar,
  Switch,
  Text as RText,
  TextInput,
  Touchable,
  TouchableHighlight,
  TouchableNativeFeedback,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  VirtualizedList,
  VirtualizedSectionList,
} from 'react-native'

export const meta = {
  renderStarted: false,
}

export let BINDINGS = new Map()
export let NODES = new WeakMap()

export const IS_TRUSTED = Symbol.for('is_trusted')
export const BINDING = Symbol.for('binding')

export const TYPES = {
  '#text': { type: 'Text' },
  '#document': { type: 'Document', hostComponent: View },
  'Text': { type: 'NATIVE_Text', hostComponent: RText },
  'SafeAreaView': { type: 'NATIVE_SafeAreaView', hostComponent: RSafeAreaView },
  'AccessibilityInfo': {
    type: 'NATIVE_AccessibilityInfo',
    hostComponent: AccessibilityInfo,
  },
  'ActivityIndicator': {
    type: 'NATIVE_ActivityIndicator',
    hostComponent: ActivityIndicator,
  },
  'Button': { type: 'NATIVE_Button', hostComponent: Button },
  'DrawerLayoutAndroid': {
    type: 'NATIVE_DrawerLayoutAndroid',
    hostComponent: DrawerLayoutAndroid,
  },
  'FlatList': { type: 'NATIVE_FlatList', hostComponent: FlatList },
  'Image': { type: 'NATIVE_Image', hostComponent: Image },
  'ImageBackground': {
    type: 'NATIVE_ImageBackground',
    hostComponent: ImageBackground,
  },
  'InputAccessoryView': {
    type: 'NATIVE_InputAccessoryView',
    hostComponent: InputAccessoryView,
  },
  'KeyboardAvoidingView': {
    type: 'NATIVE_KeyboardAvoidingView',
    hostComponent: KeyboardAvoidingView,
  },

  'Modal': { type: 'NATIVE_Modal', hostComponent: Modal },
  'Pressable': { type: 'NATIVE_Pressable', hostComponent: Pressable },

  'RefreshControl': {
    type: 'NATIVE_RefreshControl',
    hostComponent: RefreshControl,
  },
  'ScrollView': { type: 'NATIVE_ScrollView', hostComponent: ScrollView },
  'SectionList': { type: 'NATIVE_SectionList', hostComponent: SectionList },
  'StatusBar': { type: 'NATIVE_StatusBar', hostComponent: StatusBar },
  'Switch': { type: 'NATIVE_Switch', hostComponent: Switch },
  'TextInput': { type: 'NATIVE_TextInput', hostComponent: TextInput },
  'Touchable': { type: 'NATIVE_Touchable', hostComponent: Touchable },
  'TouchableHighlight': {
    type: 'NATIVE_TouchableHighlight',
    hostComponent: TouchableHighlight,
  },
  'TouchableNativeFeedback': {
    type: 'NATIVE_TouchableNativeFeedback',
    hostComponent: TouchableNativeFeedback,
  },
  'TouchableOpacity': {
    type: 'NATIVE_TouchableOpacity',
    hostComponent: TouchableOpacity,
  },
  'TouchableWithoutFeedback': {
    type: 'NATIVE_TouchableWithoutFeedback',
    hostComponent: TouchableWithoutFeedback,
  },
  'View': { type: 'NATIVE_View', hostComponent: View },
  'VirtualizedList': {
    type: 'NATIVE_VirtualizedList',
    hostComponent: VirtualizedList,
  },
  'VirtualizedSectionList': {
    type: 'NATIVE_VirtualizedSectionList',
    hostComponent: VirtualizedSectionList,
  },
  'ActionSheetIOS': {
    type: 'NATIVE_ActionSheetIOS',
    hostComponent: ActionSheetIOS,
  },
  'Alert': { type: 'NATIVE_Alert', hostComponent: Alert },
}
