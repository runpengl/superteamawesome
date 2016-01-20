var React = require('react');
var classNames = require('classnames');

module.exports = React.createClass({
  getClass: function() {
    if (this.props.folder.shared) {
      if (this.state.selected) {
        return 'shared selected';
      }
      return 'shared';
    } else if (this.state.selected) {
      return 'selected';
    }
    return '';
  },

  openFolder: function() {
    this.props.openFolder(this);
  },

  selectFolder: function() {
    this.props.selectFolder(this);
  },

  render: function() {
    var selected = this.props.isSelected;
    var classes = classNames({
      'selected': selected,
      'shared': this.props.folder.shared
    });
    return (
      <li className={classes}
          onClick={this.selectFolder}
          onDoubleClick={this.openFolder}>
          <span onClick={this.openFolder}>{this.props.folder.title}</span>
      </li>
    )
  }
});