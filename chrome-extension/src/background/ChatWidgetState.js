// "closed" | "collapsed" | "expanded"
let _state = "expanded";

export function state() {
    return _state;
}

export function setState(state) {
    _state = state;
}
