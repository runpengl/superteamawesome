var React = require('react');
var Folders = require('./driveFolders.react');
var $ = require('jquery');

module.exports = React.createClass({

  getInitialState: function(props) {
    props = props || this.props;
    return {
      hunt: props.hunt,
      activeTab: props.activeTab,
      folders: props.folders,
      userFirstName: props.userFirstName,
      rootFolder: props.rootFolder
    };
  },

  getDefaultProps: function() {
    return {
      hunt: {name: 'None'},
      activeTab: 'create',
      folders: []
    };
  },

  componentWillReceiveProps: function(newProps, oldProps){
    this.setState(this.getInitialState(newProps));
  },

  switchTab: function(tab) {
    this.setState({activeTab: tab});
  },

  // Render the component
  render: function(){
    return (
      <div className='content admin-content'>
        <nav className="side-nav">
          <h3>ADMIN PANEL</h3>
          <h4>
            Current Hunt:<br />
            <em>{this.state.hunt.name}</em>
          </h4>
          <ul className="tabs">
            <li onClick={this.switchTab.bind(this, 'edit')}>Edit Hunt</li>
            <li onClick={this.switchTab.bind(this, 'create')}>Create Hunt</li>
            <li onClick={this.switchTab.bind(this, 'puzzlers')}>Add Puzzlers</li>
            <li onClick={this.switchTab.bind(this, 'announcement')}>Make Announcement</li>
            <li onClick={this.switchTab.bind(this, 'switch')}>Switch Hunt</li>
          </ul>
        </nav>
        <div className="side-content">
          <ul className="tab-content">
            <li id="edit" className={(this.state.activeTab == "edit" ? "active": "")}>
              {(this.state.hunt.id ? "Edit " + this.state.hunt.name : "No hunt to edit")}
            </li>
            <li id="create" className={(this.state.activeTab == "create" ? "active": "")}>
              <h3>Create New Hunt</h3>
              <form>
                <div className='form-element'>
                  <label htmlFor='name'>Name</label>
                  <input type='text' name='name' />
                </div>
                <div className='form-element'>
                  <input type='checkbox' checked='checked' /> Active
                </div>
                <div className='form-element'>
                  <label htmlFor='folder'>Google Drive Folder</label>
                  <span className='help-text'>Select the root Google Drive folder to work on this hunt from. Click to select, double click to open the folder:</span>
                  <Folders folders={this.state.folders} rootFolder={this.state.rootFolder} />
                </div>
              </form>
            </li>
            <li id="puzzlers" className={(this.state.activeTab == "puzzlers" ? "active": "")}>
              Puzzlers
            </li>
            <li id="announcement" className={(this.state.activeTab == "announcement" ? "active": "")}>
              Announcements
            </li>
            <li id="switch" className={(this.state.activeTab == "switch" ? "active": "")}>
              Switch Current Hunt
            </li>
          </ul>
        </div>
      </div>
    )
  }
});

