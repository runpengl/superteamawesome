var React = require('react');

var CreateHunt = require('./admin/createHunt.react'),
    EditHunt = require('./admin/editHunt.react');

// Overall module for the admin page
module.exports = React.createClass({

  // lifecycle methods
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
        folderId: 'root'
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

  // getter methods
  getActiveState: function(tab) {
    if (tab === "edit") {
      if (this.state.activeTab === "edit" ||
          this.state.activeTab === "round" ||
          this.state.activeTab === "puzzle" ||
          this.state.activeTab === "settings") {
        return "active";
      }
    } else {
      return this.state.activeTab === tab ? "active" : "";
    }
    return "";
  },

  // Render the component
  render: function() {
    var editHunt;
    if (this.state.hunt.folderId) {
      editHunt = <EditHunt folders={this.state.folders} hunt={this.state.hunt} activeTab={this.state.activeTab}/>;
    } else {
      editHunt = <h3>{(this.state.hunt.folderId ? "Edit " + this.state.hunt.name : "No hunt to edit")}</h3>;
    }

    return (
      <div className='content admin-content'>
        <nav className="side-nav">
          <h3>ADMIN PANEL</h3>
          <h4>
            Current Hunt:<br />
            <em>{this.state.hunt.name}</em>
          </h4>
          <ul className="tabs">
            <li className={this.getActiveState("edit")}><a href="/admin/edit">Edit Hunt</a>
              <ul className='submenu'>
                <li className={this.getActiveState("round")}><a href="/admin/edit/round">Add Round</a></li>
                <li className={this.getActiveState("puzzle")}><a href="/admin/edit/puzzle">Add Puzzles</a></li>
                <li className={this.getActiveState("settings")}><a href="/admin/edit/settings">Settings</a></li>
              </ul>
            </li>
            <li className={this.getActiveState("create")}><a href="/admin/create">Create Hunt</a></li>
            <li className={this.getActiveState("add")}><a href="/admin/add">Add Puzzlers</a></li>
            <li className={this.getActiveState("announcement")}><a href="/admin/announcement">Make Announcement</a></li>
            <li className={this.getActiveState("switch")}><a href="/admin/switch">Switch Hunt</a></li>
          </ul>
        </nav>
        <div className="side-content">
          <ul className="tab-content">
            <li className={this.getActiveState("edit")}>
              {editHunt}
            </li>
            <li className={this.getActiveState("create")}>
              <CreateHunt hunt={this.state.createHunt}
                  folders={this.state.folders}
                  rootFolder={this.state.rootFolder}
              ></CreateHunt>
            </li>
            <li className={this.getActiveState("add")}>
              Puzzlers
            </li>
            <li className={this.getActiveState("announcement")}>
              Announcements
            </li>
            <li className={this.getActiveState("switch")}>
              Switch Current Hunt
            </li>
          </ul>
        </div>
      </div>
    )
  }
});

