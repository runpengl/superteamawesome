var _ = require('lodash'),
    $ = require('jquery'),
    Q = require('q'),
    debug = require('debug')('superteamawesome:server'),
    React = require('react'),
    update = require('react-addons-update');

module.exports = React.createClass({
  componentWillReceiveProps: function(newProps, oldProps) {
    this.setState(this.getInitialState(newProps));
  },

  componentDidMount: function() {
    $.get("/hunt/puzzles", { huntID: this.state.hunt.id }, function(puzzles) {
      if (this.isMounted()) {
        var newState = update(this.state, { puzzles: puzzles });
        this.setState(newState);
      }
    }.bind(this));
  },

  getFolderIcon: function() {
    return this.state.driveFolder.shared ? "shared folder info" : "folder info";
  },

  getFolderUrl: function() {
    return "https://drive.google.com/drive/folders/" + this.state.driveFolder.id;
  },

  getInitialState: function(props) {
    props = props || this.props;

    return {
      driveFolder: _.find(props.folders, {"id": props.hunt.folderID}),
      folders: props.folders,
      hunt: props.hunt,
      puzzles: []
    };
  },

  render: function() {
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
                    <div className={this.getFolderIcon()}><a target="blank" href={this.getFolderUrl()}>{this.state.driveFolder.title}</a></div>
                  </li>
                </ul>
              </div>
            </div>
            <div className='card'>
              <div className='header'>
                <h4>Puzzles</h4>
              </div>
              <div className='details'>
                <table cellSpacing="0" cellPadding="0">
                  <thead>
                    <tr>
                      <th>Puzzle Name</th>
                      <th>Created By</th>
                      <th>Created At</th>
                    </tr>
                  </thead>
                </table>
              </div>
            </div>
          </li>
          <li className={(this.props.activeTab == "round" ? "active": "")}>
            Add Rounds
          </li>
          <li className={(this.props.activeTab == "puzzle" ? "active": "")}>
            Add Puzzle
          </li>
          <li className={(this.props.activeTab == "settings" ? "active": "")}>
            Edit Settings
          </li>
        </ul>
      </div>
    )
  }
});
