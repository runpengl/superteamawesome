var _ = require('lodash'),
    $ = require('jquery'),
    debug = require('debug')('superteamawesome:server'),
    React = require('react'),
    update = require('react-addons-update');

module.exports = React.createClass({
  componentWillReceiveProps: function(newProps, oldProps){
    this.setState(this.getInitialState(newProps));
  },

  getFolderIcon: function() {
    return this.state.driveFolder.shared ? "shared folder info" : "folder info";
  },

  getFolderUrl: function() {
    return "https://drive.google.com/drive/folders/" + this.state.driveFolder.id;
  },

  getInitialState: function(props) {
    props = props || this.props;
    console.log(_.find(props.folders, {"id": props.hunt.folderID}));
    return {
      driveFolder: _.find(props.folders, {"id": props.hunt.folderID}),
      folders: props.folders,
      hunt: props.hunt
    };
  },

  render: function() {
    return (
      <div>
        <h3>Edit {this.state.hunt.name}</h3>
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
      </div>
    )
  }
});
