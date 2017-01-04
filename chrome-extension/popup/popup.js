var currentHunt = null;
var currentHuntPuzzles = [];
var puzzleViewersSnapshot = null;
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
        if (!userOrNull) {
            return;
        }

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
                        puzzles.push(Object.assign({}, puzzle.val(), {
                            key: puzzle.key
                        }))
                    });
                    currentHuntPuzzles = puzzles;
                    renderPopup();
                });
        });

        db.ref("puzzleViewers").on("value", function(snap) {
            puzzleViewersSnapshot = snap;
            renderPopup();
        });
    });
    renderPopup(/*initialRender=*/true);
}

/**
 * Start the auth flow (Google & Firebase).
 * @param{boolean} interactive True if the OAuth flow should request with an interactive mode.
 */
function startAuth(interactive) {
    renderPopup(/*initialRender=*/true);

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

var PUZZLE_STATUSES = ["new", "stuck", "inProgress", "solved"];

function renderPopup(initialRender) {
    var puzzlesByStatus = {
        "new": [],
        inProgress: [],
        stuck: [],
        solved: []
    };
    if (currentHuntPuzzles) {
        currentHuntPuzzles.forEach(function(puzzle) {
            puzzlesByStatus[puzzle.status].push(puzzle);
        });
    }
    ReactDOM.render(
        React.createElement(Popup, {
            initialRender: !!initialRender,
            currentUser: firebase.auth().currentUser,
            currentHunt: currentHunt,
            numPuzzles: currentHuntPuzzles ? currentHuntPuzzles.length : 0,
            puzzleViewersSnapshot: puzzleViewersSnapshot,
            puzzlesByStatus: puzzlesByStatus
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
                            href: "http://" + props.currentHunt.domain,
                            onClick: function(event) {
                                if (event.shiftKey || event.metaKey) {
                                    return;
                                }
                                chrome.tabs.update({ url: "http://" + props.currentHunt.domain });
                            }
                        }, r.strong(null, props.currentHunt.name)),
                        props.numPuzzles
                            ? r.div(null,
                                "Puzzles Solved: ",
                                r.strong(null,
                                    props.puzzlesByStatus.solved.length,
                                    "/", props.numPuzzles
                                )
                            )
                            : null
                    )
                    : r.img({ className: "Popup-loading", src: "../ripple.svg" }),
                PUZZLE_STATUSES.map(function(status) {
                    var puzzles = props.puzzlesByStatus[status];
                    if (puzzles.length === 0) {
                        return;
                    }
                    return React.createElement(PuzzleList, {
                        key: status,
                        huntDomain: props.currentHunt.domain,
                        puzzles: puzzles,
                        puzzleViewersSnapshot: props.puzzleViewersSnapshot
                    });
                })
            )
            : r.div({ className: "Popup-loginPrompt" + (props.isLoading ? " isLoading" : "") },
                props.initialRender
                    ? r.img({ className: "Popup-loading", src: "../ripple.svg" })
                    : r.div({
                        className: "Popup-signInButton",
                        onClick: function() { startAuth(true); }
                    }, "Sign in with Google")
            )
    );
}

function PuzzleList(props) {
    return r.ul({ className: "PuzzleList" },
        props.puzzles.map(function(puzzle) {
            var numActiveViewers = 0;
            props.puzzleViewersSnapshot
                .child(puzzle.key).forEach(function(viewer) {
                    viewer.forEach(function(tab) {
                        if (!tab.val().idle) {
                            numActiveViewers++;
                            return true; // stop iterating
                        }
                    });
                });
            return r.li({
                key: puzzle.key,
                className: "PuzzleList-puzzle " + puzzle.status
            },
                r.a({
                    className: "PuzzleList-puzzleLink",
                    href: "http://" + props.huntDomain + puzzle.path,
                    onClick: function(event) {
                        if (event.shiftKey || event.metaKey) {
                            return;
                        }
                        chrome.tabs.update({
                            url: "http://" + props.huntDomain + puzzle.path
                        });
                    }
                }, puzzle.name),
                numActiveViewers === 0 ? null : r.div({
                    className: "PuzzleList-puzzleViewerCount"
                },
                    React.createElement(PersonIcon),
                    numActiveViewers
                )
            );
        })
    );
}

function PersonIcon() {
    return r.svg({ className: "PersonIcon", viewBox: "0 0 24 24" },
        r.circle({ cx: 12, cy: 8, r: 4 }),
        r.path({
            d: "M12,14c-6.1,0-8,4-8,4v2h16v-2C20,18,18.1,14,12,14z"
        })
    );
}
