// referenced implementation as it's required by VueJS
// https://github.com/Shopify/remote-ui/blob/d3dc666f9d02bdbb5dfa3b3913e009af2de96d81/packages/webcompat/src/dom/SVGElement.ts

import { NS } from './constants'
import { Element } from './element'

export class SVGElement extends Element {
  [NS] = 'http://www.w3.org/2000/svg'

  constructor(localName) {
    super(localName)
  }

  get ownerSVGElement() {
    let root = null
    let parent = this.parentNode
    while (parent instanceof SVGElement) {
      root = parent
      parent = parent.parentNode
    }
    return root
  }
}
