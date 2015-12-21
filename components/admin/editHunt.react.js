var _ = require('lodash'),
    $ = require('jquery'),
    Q = require('q'),
    debug = require('debug')('superteamawesome:server'),
    React = require('react'),
    update = require('react-addons-update');

module.exports = React.createClass({
  addRoundName: function() {
    var newState = update(this.state, {
      newRound: {
        names: {
          $set: this.state.newRound.names.concat({val: '', key: this.state.newRound.names.length})
        }
      }
    });
    this.setState(newState);
  },

  componentWillReceiveProps: function(newProps, oldProps) {
    this.setState(this.getInitialState(newProps));
  },

  componentDidMount: function() {
    $.get("/hunt/puzzles", { huntID: this.state.hunt.id }, function(puzzles) {
      if (this.isMounted()) {
        var newState = update(this.state, {
          puzzles: {
            $set: puzzles
          }
        });
        this.setState(newState);
      }
    }.bind(this));
  },

  createRound: function(event) {
    var newRound = this.state.newRound;
    if (newRound.parentRound === "None") {
      newRound.parentRound = {
        folderID: this.props.hunt.folderID
      };
    }

    $.post("/admin/create/round",
      {
        newRound: newRound
      }
    ).success(function(rounds) {
      window.location.href = "/admin/edit";
    }.bind(this));
    event.preventDefault();
  },

  getFolderIcon: function() {
    return this.state.driveFolder.shared ? "shared folder info" : "folder info";
  },

  getFolderUrl: function() {
    return "https://drive.google.com/drive/folders/" + this.state.driveFolder.id;
  },

  getInitialState: function(props) {
    props = props || this.props;

    return {
      driveFolder: _.find(props.folders, {"id": props.hunt.folderID}),
      folders: props.folders,
      hunt: props.hunt,
      newRound: {
        meta: '',
        names: [{
          val: '',
          key: 0 // static key that doesn't rely on position in array for React rendering
        }],
        parentRound: "None"
      },
      puzzles: []
    };
  },

  handleParentRoundChange: function(event) {
    this.setState(update(this.state, {
      newRound: {
        parentRound: {
          $set: event.target.value
        }
      }
    }));
  },

  handleRoundMetaLinkChange: function(event) {
    var newState = update(this.state, {
      newRound: {
        meta: {
          $set: event.target.value
        }
      }
    });
    this.setState(newState);
  },

  handleRoundNameChange: function(index, event) {
    var names = this.state.newRound.names;
    names[index].val = event.target.value;
    var newState = update(this.state, {
      newRound: {
        names: {
          $set: names
        }
      }
    });
    this.setState(newState);
  },

  removeRoundName: function(index) {
    var names = this.state.newRound.names;
    names.splice(index, 1);
    var newState = update(this.state, {
      newRound: {
        names: {
          $set: names
        }
      }
    });
    this.setState(newState);
  },

  render: function() {
    var _this = this;
    return (
      <div>
        <h3>Edit {this.state.hunt.name}</h3>
        <ul className='sub-tab-content'>
          <li className={(this.props.activeTab == "edit" ? "active": "")}>
            <div className='card'>
              <div className='header'>
                <h4>Basic Info</h4>
              </div>
              <div className='details'>
                <ul>
                  <li>
                    <div className='label'>Name</div>
                    <div className='info'>{this.state.hunt.name}</div>
                  </li>
                  <li>
                    <div className='label'>Active</div>
                    <div className='info'>{(this.state.hunt.isActive ? "Yes" : "No")}</div>
                  </li>
                  <li>
                    <div className='label'>Google Drive</div>
                    <div className={this.getFolderIcon()}><a target="blank" href={this.getFolderUrl()}>{this.state.driveFolder.title}</a></div>
                  </li>
                </ul>
              </div>
            </div>
            <div className='card'>
              <div className='header'>
                <h4>Puzzles</h4>
              </div>
              <div className='details'>
                <table cellSpacing="0" cellPadding="0">
                  <thead>
                    <tr>
                      <th>Puzzle Name</th>
                      <th>Created By</th>
                      <th>Created At</th>
                    </tr>
                  </thead>
                </table>
              </div>
            </div>
          </li>
          <li className={(this.props.activeTab == "round" ? "active": "")}>
            <h4>Add Rounds</h4>
            <form onSubmit={this.createRound}>
              <div className='form-element'>
                <label htmlFor='parent-round'>Parent Round</label>
                <select value={this.state.newRound.parentRound} onChange={this.handleParentRoundChange}>
                  <option value="None">None</option>
                </select>
              </div>
              <div className='form-element'>
                <label htmlFor='meta-link'>Meta Puzzle Link</label>
                <input defaultValue='' type='text' onChange={_this.handleRoundMetaLinkChange} />
              </div>
              <div className='form-element'>
                <label htmlFor='name'>Round Name</label>
              </div>
              {this.state.newRound.names.map(function(name, index) {
                var deleteButton = '';
                if (index > 0) {
                  deleteButton = <span className='delete' onClick={_this.removeRoundName.bind(_this, index)}>-</span>
                }
                return (
                  <div className='form-element' key={"add.round." + name.key} >
                    <input defaultValue='' type='text' onChange={_this.handleRoundNameChange.bind(_this, index)} />
                    {deleteButton}
                  </div>
                );
              })}
              <div className='form-element'>
                <div className='extra-text' onClick={this.addRoundName}>Add Another..</div>
              </div>
              <div className='form-element'>
                <input type='submit' value={(this.state.newRound.names.length > 1) ? "Create Rounds" : "Create Round"} />
              </div>
            </form>
          </li>
          <li className={(this.props.activeTab == "puzzle" ? "active": "")}>
            Add Puzzle
          </li>
          <li className={(this.props.activeTab == "settings" ? "active": "")}>
            Edit Settings
          </li>
        </ul>
      </div>
    )
  }
});
