var React = require('react');
var CreateHunt = require('./admin/createHunt.react');

module.exports = React.createClass({

  getInitialState: function(props) {
    props = props || this.props;
    return {
      hunt: props.hunt,
      activeTab: props.activeTab,
      folders: props.folders,
      userFirstName: props.userFirstName,
      rootFolder: props.rootFolder,
      createHunt: {
        name: '',
        active: true,
        folderID: 'root'
      }
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

  // Render the component
  render: function() {
    return (
      <div className='content admin-content'>
        <nav className="side-nav">
          <h3>ADMIN PANEL</h3>
          <h4>
            Current Hunt:<br />
            <em>{this.state.hunt.name}</em>
          </h4>
          <ul className="tabs">
            <li className={(this.state.activeTab == "edit" ? "active": "")}><a href="/admin/edit">Edit Hunt</a>
              <ul className='submenu'>
                <li><a href="/admin/edit/round">Add Round</a></li>
                <li><a href="/admin/edit/puzzle">Add Puzzles</a></li>
              </ul>
            </li>
            <li className={(this.state.activeTab == "create" ? "active": "")}><a href="/admin/create">Create Hunt</a></li>
            <li className={(this.state.activeTab == "add" ? "active": "")}><a href="/admin/add">Add Puzzlers</a></li>
            <li className={(this.state.activeTab == "announcement" ? "active": "")}><a href="/admin/announcement">Make Announcement</a></li>
            <li className={(this.state.activeTab == "switch" ? "active": "")}><a href="/admin/switch">Switch Hunt</a></li>
          </ul>
        </nav>
        <div className="side-content">
          <ul className="tab-content">
            <li id="edit" className={(this.state.activeTab == "edit" ? "active": "")}>
              {(this.state.hunt.id ? "Edit " + this.state.hunt.name : "No hunt to edit")}
            </li>
            <li id="create" className={(this.state.activeTab == "create" ? "active": "")}>
              <CreateHunt hunt={this.state.createHunt}
                  folders={this.state.folders}
                  rootFolder={this.state.rootFolder}
              ></CreateHunt>
            </li>
            <li id="add" className={(this.state.activeTab == "add" ? "active": "")}>
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

