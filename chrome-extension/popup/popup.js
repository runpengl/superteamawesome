var currentHunt = null;
var currentHuntPuzzles = [];
window.onload = function() {
    initApp();
};

/**
 * initApp handles setting up the Firebase context and registering
 * callbacks for the auth status.
 */
function initApp() {
    firebase.initializeApp(config.firebase);
    firebase.auth().onAuthStateChanged(function(userOrNull) {
        renderPopup();
    });
    renderPopup(/*initialRender=*/true);

    var db = firebase.database();
    db.ref("currentHunt").once("value", function(snap) {
        var huntKey = snap.val();
        db.ref("hunts/" + huntKey).on("value", function(hunt) {
            currentHunt = hunt.val();
            renderPopup();
        });
        db.ref("puzzles")
            .orderByChild("hunt")
            .equalTo(huntKey)
            .on("value", function(snapshot) {
                var puzzles = [];
                snapshot.forEach(function(puzzle) {
                    puzzles.push(puzzle.val())
                });
                currentHuntPuzzles = puzzles;
                renderPopup();
            });
    });
}

/**
 * Start the auth flow (Google & Firebase).
 * @param{boolean} interactive True if the OAuth flow should request with an interactive mode.
 */
function startAuth(interactive) {
    // Request an OAuth token from the Chrome Identity API.
    chrome.identity.getAuthToken({interactive: !!interactive}, function(token) {
        if (chrome.runtime.lastError) {
            // TODO surface this better
            console.error(chrome.runtime.lastError);
        } else if (token) {
            // Authrorize Firebase with the OAuth Access Token.
            var credential = firebase.auth.GoogleAuthProvider.credential(null, token);
            firebase.auth().signInWithCredential(credential).catch(function(error) {
                // The OAuth token might have been invalidated. Let's remove it from cache.
                chrome.identity.removeCachedAuthToken({token: token}, function() {
                    // Try logging into Google from scratch.
                    startAuth(interactive);
                });
            });
        } else {
            console.error("The OAuth Token was unexpectedly null.");
        }
    });
}

//
// Rendering
// ----------------------------------------------------------------------------

function renderPopup(initialRender) {
    ReactDOM.render(
        React.createElement(Popup, {
            initialRender: !!initialRender,
            currentUser: firebase.auth().currentUser,
            currentHunt: currentHunt,
            currentHuntPuzzles: currentHuntPuzzles
        }),
        document.getElementById("popup")
    );
}

var r = React.DOM;
function Popup(props) {
    return r.div({ className: "Popup" },
        props.currentUser
            ? r.div({ className: "Popup-contents" },
                r.div({ className: "Popup-toolbar" },
                    r.img({
                        className: "Popup-userImage",
                        src: props.currentUser.photoURL
                    }),
                    r.div({ className: "Popup-userName" }, props.currentUser.displayName),
                    r.div({
                        className: "Popup-signOutButton",
                        onClick: function() { firebase.auth().signOut(); }
                    }, "Sign out")
                ),
                props.currentHunt
                    ? r.div({ className: "Popup-currentHuntInfo" },
                        "Current Hunt: ", r.a({
                            onClick: function() {
                                chrome.tabs.update({ url: "http://" + props.currentHunt.domain });
                            }
                        }, r.strong(null, props.currentHunt.name)),
                        props.currentHuntPuzzles
                            ? r.div(null,
                                "Puzzles Solved: ",
                                r.strong(null,
                                    numPuzzlesSolved(props.currentHuntPuzzles),
                                    "/", props.currentHuntPuzzles.length
                                )
                            )
                            : null
                    )
                    : r.img({ className: "Popup-loading", src: "ripple.svg" }),
                props.currentHuntPuzzles.map(function(puzzle) {
                    return null;
                })
            )
            : r.div({ className: "Popup-loginPrompt" + (props.isLoading ? " isLoading" : "") },
                props.initialRender
                    ? r.img({ className: "Popup-loading", src: "ripple.svg" })
                    : r.button({
                        className: "Popup-button",
                        onClick: function() { startAuth(true); }
                    }, "Sign in with Google")
            )
    );
}

function numPuzzlesSolved(puzzles) {
    var n = 0;
    puzzles.forEach(function(puzzle) {
        if (puzzle.status === "solved") n++;
    });
    return n;
}
