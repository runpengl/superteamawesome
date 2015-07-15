var React = require('react');

module.exports = React.createClass({
  getInitialState: function(props) {
    props = props || this.props;
    return {
      folders: props.folders,
      rootFolder: props.rootFolder
    };
  },

  componentWillReceiveProps: function(newProps, oldProps){
    this.setState(this.getInitialState(newProps));
  },

  render: function() {
    return (
      <div className='folder-list-container'>
        <div className={(this.state.rootFolder.shared ? 'shared folder-title': 'folder-title')}>{this.state.rootFolder.title}</div>
        <ul className='folder-list'>
          {this.state.folders.map(function(folder) {
            return <li className={(folder.shared ? 'shared': '')}>{folder.title}</li>;
          })}
        </ul>
      </div>
    )
  }
});