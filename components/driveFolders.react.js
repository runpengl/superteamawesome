var React = require('react');
var update = require('react-addons-update');
var _ = require('lodash');
var $ = require('jquery');

module.exports = React.createClass({
  componentWillReceiveProps: function(newProps, oldProps){
    this.setState(this.getInitialState(newProps));
  },

  getInitialState: function(props) {
    props = props || this.props;
    return {
      folders: props.folders,
      rootFolder: props.rootFolder,
      selectedFolder: props.selectedFolder
    };
  },

  openFolder: function(folder) {
    this.props.openFolder(folder.props.folder);
  },

  // selects a folder from the breadcrumb
  openBreadcrumbFolder: function(index) {
    this.props.openFolder(this.props.breadcrumbs[index], index);
  },

  selectFolder: function(folder) {
    if (this.state.selectedFolder && this.state.selectedFolder.props.index === folder.props.index) {
      this.props.selectHuntFolder(null);
    } else {
      this.props.selectHuntFolder(folder);
    }
  },

  render: function() {
    var selectedKey = (this.state.selectedFolder && this.state.selectedFolder.props.index) || null;
    var children = this.props.children.map(function(folder, key) {
      var isSelected = folder.props.index === selectedKey;
      return React.cloneElement(folder, {
        isSelected: isSelected,
        openFolder: this.openFolder,
        selectFolder: this.selectFolder,
        key: folder.props.key
      });
    }, this);
    var _this = this;

    return (
      <div className='folder-list-container'>
        <ul className='breadcrumbs'>
          {this.props.breadcrumbs.map(function(folder, index) {
            return (
              <li onClick={_this.openBreadcrumbFolder.bind(_this, index)}
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