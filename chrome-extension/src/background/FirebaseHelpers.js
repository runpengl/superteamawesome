import * as firebase from "firebase";

//
// Firebase Query Helpers
// ----------------------------------------------------------------------------

/**
 * Takes two firebase refs and attaches `value` event listeners on them, calling
 * the given callback when both are resolved and for every update after. The caller
 * is responsible for calling the returned detach function.
 */
export function onValue2(ref1, ref2, callback) {
    var snap1 = null;
    var snap2 = null;
    function update() {
        if (snap1 && snap1.val() &&
            snap2 && snap2.val()) {
            callback(snap1, snap2);
        }
    }
    function on1(snap) { snap1 = snap; update(); }
    function on2(snap) { snap2 = snap; update(); }
    ref1.on("value", on1);
    ref2.on("value", on2);

    return function detach() {
        ref1.off("value", on1);
        ref2.off("value", on2);
    };
}

export function selectAllWhereChildEquals(path, childKey, childValue, callback) {
    firebase.database().ref(path)
        .orderByChild(childKey)
        .equalTo(childValue)
        .once("value", callback);
}

export function selectOnlyWhereChildEquals(path, childKey, childValue, callback) {
    firebase.database().ref(path)
        .orderByChild(childKey)
        .equalTo(childValue)
        .limitToFirst(1)
        .once("value", function(snapshot) {
            if (snapshot.numChildren()) {
                snapshot.forEach(function(puzzle) {
                    callback(puzzle);
                });
            } else {
                callback(null);
            }
        });
}
