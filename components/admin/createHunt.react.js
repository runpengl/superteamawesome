var $ = require('jquery');
var React = require('react/addons');
var Folder = require('../driveFolder.react');
var Folders = require('../driveFolders.react');

module.exports = React.createClass({
  componentWillReceiveProps: function(newProps, oldProps){
    this.setState(this.getInitialState(newProps));
  },

  getInitialState: function(props) {
    props = props || this.props;
    return {
      hunt: props.hunt,
      breadcrumbs: [props.rootFolder],
      folders: props.folders,
      rootFolder: props.rootFolder
    };
  },

  openFolder: function(folder, index) {
    var _this = this;
    if (index !== undefined) {
      this.state.breadcrumbs.splice(index, this.state.breadcrumbs.length - index);
    }

    $.post("/data/folders", { fileId: folder.id }, function(folders) {
      _this.setState({
        breadcrumbs: _this.state.breadcrumbs.concat(folder),
        rootFolder: folder,
        folders: folders,
        selectedFolder: null
      });
    });
  },

  setHuntName: function(name) {
    var newState = React.addons.update(this.state, {
      hunt: {
        name: {
          $set: name
        }
      }
    });
    this.setState(newState);
  },

  handleNameChange: function(e) {
    this.setHuntName(e.target.value);
  },

  handleActiveChange: function(e) {
    var newState = React.addons.update(this.state, {
      hunt: {
        active: {
          $set: !!e.target.value
        }
      }
    });
    this.setState(newState);
  },

  handleSubmit: function(e) {
    e.preventDefault();
    var name = this.state.hunt.name.trim();
    if (!name) {
      return;
    }
    $.post("/admin/createhunt", { name: name }).success(function() {
      // TODO
    }.bind(this));
    this.setHuntName('');
  },

  render: function() {
    return (
      <div>
        <h3>Create New Hunt</h3>
        <form onSubmit={this.handleSubmit}>
          <div className='form-element'>
            <label htmlFor='name'>Name</label>
            <input type='text' name='name' value={this.state.hunt.name} onChange={this.handleNameChange} defaultValue="" />
          </div>
          <div className='form-element'>
            <input type='checkbox' onChange={this.state.handleActiveChange} defaultChecked="true" /> Active
          </div>
          <div className='form-element'>
            <input type="submit" value="Create Hunt" />
          </div>
          <div className='form-element'>
            <label htmlFor='folder'>Google Drive Folder</label>
            <span className='help-text'>Select the root Google Drive folder to work on this hunt from. Click to select, double click to open the folder:</span>
            <Folders breadcrumbs={this.state.breadcrumbs}
                     ref="createHuntFolders"
                     openFolder={this.openFolder}
                     selectHuntFolder={this.selectHuntFolder}
                     folders={this.state.folders}
                     rootFolder={this.state.rootFolder}>
              {this.state.folders.map(function(folder, index) {
                return (<Folder
                          folder={folder}
                          index={folder.id}
                          key={folder.id}/>);
              })}
            </Folders>
          </div>
        </form>
      </div>
    )
  }
});
