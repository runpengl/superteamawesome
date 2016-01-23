var _ = require('lodash'),
    $ = require('jquery'),
    React = require('react'),
    update = require('react-addons-update');

// Displays a list of Google Drive Folders
module.exports = React.createClass({

  // lifecycle methods
  getInitialState: function(props) {
    props = props || this.props;
    return {
      folders: props.folders,
      rootFolder: props.rootFolder,
      selectedFolder: props.selectedFolder
    };
  },

  componentWillReceiveProps: function(newProps, oldProps){
    this.setState(this.getInitialState(newProps));
  },

  // event handlers

  // selects a folder from the breadcrumb
  _handleBreadcrumbFolderOpen: function(index) {
    this.props.handleFolderOpen(this.props.breadcrumbs[index], index);
  },

  _handleFolderOpen: function(folder) {
    this.props.handleFolderOpen(folder.props.folder);
  },

  _handleFolderSelect: function(folder) {
    if (this.state.selectedFolder.props && this.state.selectedFolder.props.index === folder.props.index) {
      this.props.handleHuntFolderSelect(null);
    } else {
      this.props.handleHuntFolderSelect(folder);
    }
  },

  render: function() {
    var selectedKey = (this.state.selectedFolder.props && this.state.selectedFolder.props.index) || null;
    var children = this.props.children.map(function(folder, key) {
      var isSelected = folder.props.index === selectedKey;
      return React.cloneElement(folder, {
        isSelected: isSelected,
        key: folder.props.key,
        handleFolderOpen: this._handleFolderOpen,
        handleFolderSelect: this._handleFolderSelect
      });
    }, this);
    var _this = this;

    return (
      <div className='folder-list-container'>
        <ul className='breadcrumbs'>
          {this.props.breadcrumbs.map(function(folder, index) {
            return (
              <li onClick={_this._handleBreadcrumbFolderOpen.bind(_this, index)}
                  key={'breadcrumb' + folder.id}
                  className={(folder.shared ? 'shared folder-title': 'folder-title')}>
                  <span>{folder.title}</span>
              </li>
            );
          })}
        </ul>
        <ul className='folder-list'>
          {children}
        </ul>
      </div>
    )
  }
});