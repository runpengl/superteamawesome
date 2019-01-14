import * as React from "react";
import AllPuzzles from "./AllPuzzles";

export default class PopupRoot extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            sortBy: "rounds"
        };
    }

    render() {
        var props = this.props;
        return <div className="Popup">
            <div className="Popup-toolbar">
                <img
                    className="Popup-userImage"
                    src={props.currentUser.photoURL}
                />
                <div className="Popup-userName">{props.currentUser.displayName}</div>
                <div
                    className="Popup-signOutButton"
                    onClick={function() {
                        chrome.runtime.sendMessage({ msg: "signOut" });
                    }}
                >Sign out</div>
            </div>
            {props.slackConnectionStatus === "error"
                ? <div
                    className="Popup-slackConnectionErrorBanner"
                    onClick={function() {
                        chrome.runtime.sendMessage({ msg: "authorizeSlack" });
                    }}
                >Couldn't connect to Slack. Try again</div>
                : null}
            <div className="Popup-contents">
                {props.currentHunt
                    ? <div className="Popup-currentHuntInfo">
                        Current Hunt: <a
                            href={`http://${props.currentHunt.domain}`}
                            onClick={function(event) {
                                if (event.shiftKey || event.metaKey) {
                                    return;
                                }
                                chrome.tabs.update({ url: "http://" + props.currentHunt.domain });
                            }}
                        ><strong>{props.currentHunt.name}</strong></a>
                        {props.puzzles
                            ? <div>
                                Puzzles Solved: <strong>
                                    {props.puzzlesByStatus.solved.length}
                                    /
                                    {props.puzzles.length}
                                </strong> (<a
                                    href={chrome.extension.getURL("dashboard/dashboard.html")}
                                    onClick={function() {
                                        chrome.tabs.create({
                                            url: chrome.extension.getURL("dashboard/dashboard.html")
                                        });
                                    }}
                                >Dashboard</a>)
                              </div>
                            : null}
                        <div
                            className="Popup-sortToggle"
                            onClick={this.handleSortToggleClick.bind(this)}
                        >
                            {this.state.sortBy}
                            <SortIcon className="Popup-sortIcon" />
                        </div>
                    </div>
                    : (!props.permissionDenied ? null : <>
                        <KeyIcon className="Popup-permissionDeniedIcon" />
                        <div className="Popup-permissionDeniedPrompt">
                            Please ask an admin for access to this tool!
                        </div>
                    </>)}
                {props.currentHunt && props.puzzles
                    ? <AllPuzzles
                        huntDomain={props.currentHunt.domain}
                        puzzles={props.puzzles}
                        sortBy={this.state.sortBy}
                        puzzleGroups={props.puzzleGroups}
                        puzzlesByStatus={props.puzzlesByStatus}
                        puzzleViewers={props.puzzleViewers}
                    />
                    : null}
            </div>
        </div>;
    }

    handleSortToggleClick() {
        switch (this.state.sortBy) {
            case "rounds":
                this.setState({ sortBy: "status" });
                break;
            case "status":
                this.setState({ sortBy: "rounds" });
                break;
        }
    }
}

function KeyIcon(props) {
    return <svg
        className={`KeyIcon${props.className ? " " + props.className : ""}`}
        viewBox="0 0 24 24"
    >
        <path d="M14.5,4C11.5,4,9,6.5,9,9.5c0,1,0.3,1.9,0.7,2.8L4,18v2h4v-2h2v-2h2l1.2-1.2c0.4,0.1,0.9,0.2,1.3,0.2c3,0,5.5-2.5,5.5-5.5  S17.5,4,14.5,4z M16,9c-0.8,0-1.5-0.7-1.5-1.5S15.2,6,16,6c0.8,0,1.5,0.7,1.5,1.5S16.8,9,16,9z" />
    </svg>;
}

function SortIcon(props) {
    return <svg
        className={`SortIcon${props.className ? " " + props.className : ""}`}
        viewBox="0 -256 1792 1792"
    >
        <g transform="matrix(1,0,0,-1,387.25424,1293.0169)">
            <path d="m 1024,448 q 0,-26 -19,-45 L 557,-45 q -19,-19 -45,-19 -26,0 -45,19 L 19,403 q -19,19 -19,45 0,26 19,45 19,19 45,19 h 896 q 26,0 45,-19 19,-19 19,-45 z m 0,384 q 0,-26 -19,-45 -19,-19 -45,-19 H 64 q -26,0 -45,19 -19,19 -19,45 0,26 19,45 l 448,448 q 19,19 45,19 26,0 45,-19 l 448,-448 q 19,-19 19,-45 z" />
        </g>
    </svg>;
}
