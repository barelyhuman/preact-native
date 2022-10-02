// TBD
// modify the preact render function to handle cases that
// the native DOM might not be able to provide directly.
// @developit has a possible solution to avoid this but
// just in case this is needed

function noop(){
    throw new Error("[preact-native] not yet implemented")
}

export const preactRenderer = noop