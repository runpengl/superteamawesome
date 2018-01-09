import * as firebase from "firebase";

export function logEvent(event) {
    firebase.database().ref("eventLogs").push(
        Object.assign({}, event, {
            timestampMs: Date.now(),
            userId: firebase.auth().currentUser &&
            firebase.auth().currentUser.uid
        }));
}
