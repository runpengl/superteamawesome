var _ = require('lodash'),
    $ = require('jquery'),
    Q = require('q'),
    debug = require('debug')('superteamawesome:server'),
    React = require('react'),
    update = require('react-addons-update'),
    CreateRound = require('./createRound.react');

module.exports = React.createClass({
  componentWillReceiveProps: function(newProps, oldProps) {
    this.setState(this.getInitialState(newProps));
  },

  componentDidMount: function() {
    $.get("/hunt/rounds", { huntID: this.state.hunt.id }, function(rounds) {
      if (this.isMounted()) {
        var newState = update(this.state, {
          rounds: {
            $set: rounds
          }
        });
        this.setState(newState);
      }
    }.bind(this));
  },

  getFolderIcon: function() {
    return this.state.driveFolder.shared ? "shared folder info" : "folder info";
  },

  getFolderUrl: function(id) {
    return "https://drive.google.com/drive/folders/" + id;
  },

  getInitialState: function(props) {
    props = props || this.props;

    return {
      driveFolder: _.find(props.folders, {"id": props.hunt.folderID}),
      folders: props.folders,
      hunt: props.hunt,
      rounds: []
    };
  },

  getParentRound: function(roundID) {
    var round = _.find(this.state.rounds, { id: roundID });
    if (round != null) {
      return round.name;
    }
    return "";
  },

  render: function() {
    var _this = this;
    return (
      <div>
        <h3>Edit {this.state.hunt.name}</h3>
        <ul className='sub-tab-content'>
          <li className={(this.props.activeTab == "edit" ? "active": "")}>
            <div className='card'>
              <div className='header'>
                <h4>Basic Info</h4>
              </div>
              <div className='details'>
                <ul>
                  <li>
                    <div className='label'>Name</div>
                    <div className='info'>{this.state.hunt.name}</div>
                  </li>
                  <li>
                    <div className='label'>Active</div>
                    <div className='info'>{(this.state.hunt.isActive ? "Yes" : "No")}</div>
                  </li>
                  <li>
                    <div className='label'>Google Drive</div>
                    <div className={this.getFolderIcon()}><a target="blank" href={this.getFolderUrl(this.state.driveFolder.id)}>{this.state.driveFolder.title}</a></div>
                  </li>
                </ul>
              </div>
            </div>
            <div className='card'>
              <div className='header'>
                <h4>Rounds</h4>
              </div>
              <div className='details'>
                <table cellSpacing="0" cellPadding="0">
                  <thead>
                    <tr>
                      <th>Round Name</th>
                      <th>Parent Round</th>
                      <th>Drive Folder</th>
                      <th>Solved Folder</th>
                      <th># Puzzles</th>
                      <th>Meta Solved</th>
                    </tr>
                  </thead>
                  <tbody>
                    {_this.state.rounds.map(function(round) {
                      return (
                        <tr key={"round-row-" + round.id}>
                          <td>{round.name}</td>
                          <td>{_this.getParentRound(round.parentID)}</td>
                          <td>
                            <div className='folder'>
                              <a href={_this.getFolderUrl(round.folderID)} target='blank'>{round.name}</a>
                            </div>
                          </td>
                          <td>
                            <div className='folder'>
                              <a href={_this.getFolderUrl(round.solvedFolderID)} target='blank'>Solved Folder</a>
                            </div>
                          </td>
                          <td>
                            {round.Puzzles.length}
                          </td>
                          <td>
                            No
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </li>
          <li className={(this.props.activeTab == "round" ? "active": "")}>
            <CreateRound rounds={this.state.rounds} hunt={this.state.hunt} />
          </li>
          <li className={(this.props.activeTab == "puzzle" ? "active": "")}>
            <h4>Add Puzzle</h4>
          </li>
          <li className={(this.props.activeTab == "settings" ? "active": "")}>
            Edit Settings
          </li>
        </ul>
      </div>
    )
  }
});
