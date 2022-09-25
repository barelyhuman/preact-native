import { Fragment, createElement, Component } from 'react'
import { preactRenderer } from './render'

export class RendererComponent extends Component {
  state = {
    nodeTree: createElement(Fragment),
  }

  constructor(props) {
    super(props)
  }

  componentDidMount() {
    if (this.props.rootNode) {
      const { tree, subscribe } = preactRenderer(this.props.rootNode)
      this.setState({
        nodeTree: tree,
      })

      subscribe(newTree => {
        this.setState({
          nodeTree: newTree,
        })
      })
    }
  }

  render() {
    return this.state.nodeTree
  }
}
