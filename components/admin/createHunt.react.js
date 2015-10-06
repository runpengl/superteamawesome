var $ = require('jquery');
var React = require('react');
var Folder = require('../driveFolder.react');
var Folders = require('../driveFolders.react');

module.exports = React.createClass({
  componentWillReceiveProps: function(newProps, oldProps){
    this.setState(this.getInitialState(newProps));
  },

  getInitialState: function(props) {
    props = props || this.props;
    return {
      breadcrumbs: [props.rootFolder],
      folders: props.folders,
      hunt: props.hunt,
      rootFolder: props.rootFolder,
      huntFolder: null
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

  render: function() {
    return (
      <div>
        <h3>Create New Hunt</h3>
        <form>
          <div className='form-element'>
            <label htmlFor='name'>Name</label>
            <input type='text' name='name' value={this.state.hunt.name} />
          </div>
          <div className='form-element'>
            <input type='checkbox' checked={this.state.hunt.active} /> Active
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
