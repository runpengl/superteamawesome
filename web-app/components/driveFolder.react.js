var classNames = require('classnames'),
    React = require('react');

// Displays a single Google Drive Folder
module.exports = React.createClass({

  _handleFolderOpen: function() {
    this.props.handleFolderOpen(this);
  },

  _handleFolderSelect: function() {
    this.props.handleFolderSelect(this);
  },

  render: function() {
    var selected = this.props.isSelected;
    var classes = classNames({
      'selected': selected,
      'shared': this.props.folder.shared
    });

    return (
      <li className={classes}
          onClick={this._handleFolderSelect}
          onDoubleClick={this._handleFolderOpen}>
          <span onClick={this._handleFolderOpen}>{this.props.folder.title}</span>
      </li>
    )
  }
});