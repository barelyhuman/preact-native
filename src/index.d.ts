// TODO

type Options = {
  noConstructor: boolean
}

/**
 * @description takes in a react native component  based node and returns a react native tree to render
 */
export function makeComponent(node: any, name: string, options?: Options):any 

/**
 * @description takes in a preact based node and returns a react native tree to render
 */
export function renderer(node:any): any
