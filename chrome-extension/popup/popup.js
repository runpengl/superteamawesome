firebase.initializeApp(config.firebase);

var authButton = document.getElementById("google_auth_button");

/**
 * initApp handles setting up the Firebase context and registering
 * callbacks for the auth status.
 */
function initApp() {
    firebase.auth().onAuthStateChanged(function(user) {
        if (user) {
            document.getElementById("user_photo").src = user.photoURL;
            document.getElementById("user_name").textContent = user.displayName;
            authButton.textContent = "Sign out";
        } else {
            authButton.textContent = "Sign in with Google";
        }
        authButton.disabled = false;
    });

    firebase.database().ref("hunts").orderByChild("isCurrent").equalTo(true).limitToFirst(1)
        .on("value", function(snapshot) {
            snapshot.forEach(function(child) {
                document.getElementById("current_hunt_name").textContent = child.val().name;
            });
        });

    authButton.addEventListener("click", startSignIn);
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

/**
 * Starts the sign-in process.
 */
function startSignIn() {
    authButton.disabled = true;
    if (firebase.auth().currentUser) {
        firebase.auth().signOut();
    } else {
        startAuth(true);
    }
}

window.onload = function() {
    initApp();
};
