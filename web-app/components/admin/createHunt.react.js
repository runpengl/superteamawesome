var $ = require('jquery'),
    React = require('react'),
    update = require('react-addons-update');

var Folder = require('../driveFolder.react');
var Folders = require('../driveFolders.react');

// Module for creating a hunt
module.exports = React.createClass({

  // life cycle methods
  getInitialState: function(props) {
    props = props || this.props;
    return {
      breadcrumbs: [props.rootFolder],
      folders: props.folders,
      hunt: props.hunt,
      rootFolder: props.rootFolder,
      selectedFolder: props.rootFolder,
    };
  },

  componentWillReceiveProps: function(newProps, oldProps){
    this.setState(this.getInitialState(newProps));
  },

  // getters
  _getSelectedFolderIcon: function() {
    var isShared = false;
    if (this.state.selectedFolder.props == null) {
      isShared = this.state.selectedFolder.shared;
    } else {
      isShared = this.state.selectedFolder.props.folder.shared;
    }
    return isShared ? "shared folder-title" : "folder-title";
  },

  _getSelectedFolderName: function() {
    if (this.state.selectedFolder.props == null) {
      return this.state.selectedFolder.title;
    } else {
      return this.state.selectedFolder.props.folder.title;
    }
  },

  // setters
  _setHuntName: function(name) {
    var newState = update(this.state, {
      hunt: {
        name: {
          $set: name
        }
      }
    });
    this.setState(newState);
  },

  // event handlers
  _handleActiveChange: function(e) {
    var newState = update(this.state, {
      hunt: {
        active: {
          $set: e.target.checked
        }
      }
    });
    this.setState(newState);
  },

  _handleCreateNewFolderChange: function(e) {
    this.setState(update(this.state, {
      hunt: {
        createNewFolder: {
          $set: e.target.checked
        }
      }
    }));
  },

  _handleFolderOpen: function(folder, index) {
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

  _handleHuntFolderSelect: function(folder) {
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

  _handleNameChange: function(e) {
    this._setHuntName(e.target.value);
  },

  _handleSubmit: function(e) {
    e.preventDefault();
    var name = this.state.hunt.name.trim();
    if (!name) {
      return;
    }
    var folder = (this.state.selectedFolder.props != null) ? this.state.selectedFolder.props.folder : this.state.selectedFolder;
    var folderId = null;
    var parentId = null;

    // set parent ID, which depends on whether the folder is the root folder or not
    if (this.state.hunt.createNewFolder == null || !this.state.hunt.createNewFolder) {
      if (folder.parents.length > 0) {
        parentId = folder.parents[0].id;
      }
    } else {
      parentId = folder.id;
    }

    $.post("/admin/create/hunt",
      {
        name: name,
        active: this.state.hunt.active,
        createNewFolder: this.state.hunt.createNewFolder,
        folderId: folderId,
        parentId: parentId,
        templateSheet: this.state.hunt.template
      }
    ).success(function(hunt) {
      if (hunt.error) {
        console.error(hunt.error);
      } else {
        window.location.href="/admin/edit";
      }
    }.bind(this));
    this._setHuntName('');
  },

  _handleTemplateChange: function(e) {
    this.setState(update(this.state, {
      hunt: {
        template: {
          $set: e.target.value
        }
      }
    }));
  },

  render: function() {
    // TODO: error validation. conditionals are hard :(
    return (
      <div>
        <h3>Create New Hunt</h3>
        <form className='create-hunt-form' onSubmit={this._handleSubmit}>
          <div className="form-column input-column">
            <div className='form-element'>
              <label htmlFor='active'>
                <input name='active' type='checkbox' onChange={this._handleActiveChange} defaultChecked="true" /> Active
              </label>
              <label htmlFor='createNewFolder'>
                <input name='createNewFolder' type='checkbox' onChange={this._handleCreateNewFolderChange} defaultChecked="" /> Create New Folder
              </label>
            </div>
            <div className='form-element'>
              <label htmlFor='name'>Name</label>
              <input type='text' name='name' value={this.state.hunt.name} onChange={this._handleNameChange} defaultValue="" />
            </div>
            <div className='form-element'>
              <label htmlFor='template'>Template Puzzle Sheet</label>
              <input type='text' name='template' value={this.state.hunt.template} onChange={this._handleTemplateChange} defaultvalue="" />
            </div>
            <div className='form-element'>
              <label htmlFor='googleDrive'>Parent Folder</label>
              <div className={this._getSelectedFolderIcon()}>
                {this._getSelectedFolderName()}
              </div>
            </div>
            <div className='form-element'>
              <input type="submit" value="Create Hunt" />
            </div>
          </div>
          <div className="form-column drive-column">
            <div className='form-element'>
              <label htmlFor='folder'>Select Google Drive Folder</label>
              <span className='help-text'>Select the root Google Drive folder to work on this hunt from. Click to select, double click to open the folder:</span>
              <Folders breadcrumbs={this.state.breadcrumbs}
                       folders={this.state.folders}
                       rootFolder={this.state.rootFolder}
                       ref="createHuntFolders"
                       selectedFolder={this.state.selectedFolder}
                       handleFolderOpen={this._handleFolderOpen}
                       handleHuntFolderSelect={this._handleHuntFolderSelect}>
                {this.state.folders.map(function(folder, index) {
                  return (<Folder
                            folder={folder}
                            index={folder.id}
                            key={folder.id}/>);
                })}
              </Folders>
            </div>
          </div>
        </form>
      </div>
    )
  }
});
