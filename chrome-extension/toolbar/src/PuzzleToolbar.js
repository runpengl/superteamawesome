import * as React from "react";
import { CSSTransitionGroup } from "react-transition-group";

import Avatar from "./Avatar";
import PuzzleStatusPicker from "./PuzzleStatusPicker";

export default function PuzzleToolbar(props) {
    return <div className="Toolbar">
        <PuzzleStatusPicker puzzle={props.puzzle} />
        <div className="Toolbar-puzzleName">{props.puzzle.name}</div>

        {props.location === "puzzle" ? null : <a
            className="Toolbar-link"
            target="_blank"
            href={`http://${props.hunt.domain}${props.puzzle.path}`}
        >puzzle</a>}

        {props.location === "spreadsheet" ? null : <a
            className="Toolbar-link"
            target="_blank"
            href={`https://docs.google.com/spreadsheets/d/${props.puzzle.spreadsheetId}`}
        >spreadsheet</a>}

        {props.location === "slack"
            ? <a
                  className="Toolbar-link"
                  href={`slack://channel?team=T03A0NUTH&id=${props.puzzle.slackChannelId}`}
              >open in app</a>
            : <div className="Toolbar-slackInfo">
                  <a
                      className="Toolbar-link"
                      target="_blank"
                      href={`https://superteamawesome.slack.com/messages/${props.puzzle.slackChannel}`}
                      onClick={function() {
                          if (props.slackChannel && !props.slackChannel.is_member) {
                              chrome.runtime.sendMessage({
                                  msg: "joinChannel",
                                  name: props.puzzle.slackChannel
                              });
                          }
                      }}
                  >slack</a>

                  {props.puzzle.status === "solved" || !props.slackChannel || props.slackChannel.is_member
                      ? null
                      : <div className="Toolbar-linkTooltip">
                            Working on this puzzle? Join the Slack channel.
                        </div>}

                  {props.slackChannel && props.slackChannel.unread_count_display > 0
                      ? <span className="Toolbar-slackUnreadCount">
                            {props.slackChannel.unread_count_display}
                        </span>
                      : null}

                  {props.slackConnectionStatus === "error"
                      ? <div
                            className="Toolbar-linkTooltip Toolbar-clickableTooltip"
                            onClick={function() {
                                chrome.runtime.sendMessage({ msg: "authorizeSlack" });
                            }}
                        >Couldn't connect to Slack. Try again?</div>
                      : null}
              </div>}

        <CSSTransitionGroup
            className="Toolbar-right"
            transitionName="Avatar"
            transitionEnterTimeout={500}
            transitionLeaveTimeout={300}
        >
            {props.viewers && props.viewers.map(function(user) {
                return <Avatar
                    key={user.id}
                    displayName={user.displayName}
                    photoUrl={user.photoUrl}
                    isIdle={user.isIdle}
                    isInvisible={!user.isPuzzleVisible}
                />;
            })}
        </CSSTransitionGroup>
    </div>;
}
