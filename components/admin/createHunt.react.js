var $ = require('jquery');
var React = require('react');
var update = require('react-addons-update');
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
      selectedFolder: props.rootFolder,
      folders: props.folders,
      rootFolder: props.rootFolder
    };
  },

  getSelectedFolderIcon: function() {
    var isShared = false;
    if (this.state.selectedFolder.props == null) {
      isShared = this.state.selectedFolder.shared;
    } else {
      isShared = this.state.selectedFolder.props.folder.shared;
    }
    return isShared ? "shared folder-title" : "folder-title";
  },

  getSelectedFolderName: function() {
    if (this.state.selectedFolder.props == null) {
      return this.state.selectedFolder.title;
    } else {
      return this.state.selectedFolder.props.folder.title;
    }
  },

  openFolder: function(folder, index) {
    var _this = this;
    if (index !== undefined) {
      this.state.breadcrumbs.splice(index, this.state.breadcrumbs.length - index);
    }

    $.post("/data/folders", { fileId: folder.id }, function(folders) {
      var newState = update(_this.state, {
        breadcrumbs: { $set: _this.state.breadcrumbs.concat(folder) },
        driveFolder: { $set: null },
        rootFolder: { $set: folder },
        folders: { $set: folders },
        selectedFolder: { $set: folder }
      });
      _this.setState(newState);
    });
  },

  selectHuntFolder: function(folder) {
    var newState;
    if (folder == null) {
      newState = update(this.state, {
        selectedFolder: {
          $set: this.state.breadcrumbs[this.state.breadcrumbs.length - 1]
        }
      });
    } else {
      newState = update(this.state, {
        selectedFolder: {
          $set: folder
        }
      });
    }
    this.setState(newState);
  },

  setHuntName: function(name) {
    var newState = update(this.state, {
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
    var newState = update(this.state, {
      hunt: {
        active: {
          $set: e.checked
        }
      }
    });
    this.setState(newState);
  },

  handleCreateNewFolderChange: function(e) {
    this.setState(update(this.state, {
      hunt: {
        createNewFolder: {
          $set: e.checked
        }
      }
    }));
  },

  handleTemplateChange: function(e) {
    this.setState(update(this.state, {
      hunt: {
        template: {
          $set: e.target.value
        }
      }
    }));
  },

  handleSubmit: function(e) {
    e.preventDefault();
    var name = this.state.hunt.name.trim();
    if (!name) {
      return;
    }
    var folder = this.state.selectedFolder;
    var folderID = (folder.props == null) ? folder.id : folder.props.folder.id;
    $.post("/admin/create/hunt",
      {
        name: name,
        active: this.state.hunt.active,
        parentID: folderID,
        templateSheet: this.state.hunt.template
      }
    ).success(function(hunt) {
      if (hunt.error) {
        console.error(hunt.error);
      } else {
        window.location.href="/admin/edit";
      }
    }.bind(this));
    this.setHuntName('');
  },

  render: function() {
    return (
      <div>
        <h3>Create New Hunt</h3>
        <form className='create-hunt-form' onSubmit={this.handleSubmit}>
          <div className='form-element'>
            <label htmlFor='active'>
              <input type='checkbox' onChange={this.state.handleActiveChange} defaultChecked="true" /> Active
            </label>
            <label htmlFor='createNewFolder'>
              <input type='checkbox' onChange={this.state.handleCreateNewFolderChange} defaultChecked={false} /> Create New Folder
            </label>
          </div>
          <div className='form-element'>
            <label htmlFor='name'>Name</label>
            <input type='text' name='name' value={this.state.hunt.name} onChange={this.handleNameChange} defaultValue="" />
          </div>
          <div className='form-element'>
            <label htmlFor='template'>Template Puzzle Sheet</label>
            <input type='text' name='template' value={this.state.hunt.template} onChange={this.handleTemplateChange} defaultvalue="" />
          </div>
          <div className='form-element'>
            <label htmlFor='googleDrive'>Parent Folder</label>
            <div className={this.getSelectedFolderIcon()}>
              {this.getSelectedFolderName()}
            </div>
          </div>
          <div className='form-element'>
            <input type="submit" value="Create Hunt" />
          </div>
          <div className='form-element'>
            <label htmlFor='folder'>Select Google Drive Folder</label>
            <span className='help-text'>Select the root Google Drive folder to work on this hunt from. Click to select, double click to open the folder:</span>
            <Folders breadcrumbs={this.state.breadcrumbs}
                     ref="createHuntFolders"
                     openFolder={this.openFolder}
                     selectHuntFolder={this.selectHuntFolder}
                     folders={this.state.folders}
                     rootFolder={this.state.rootFolder}
                     selectedFolder={this.state.selectedFolder}>
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
