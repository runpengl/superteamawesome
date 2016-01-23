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

  createRound: function(event) {
    var newRound = this.state.newRound;
    if (newRound.parentRound === "None") {
      newRound.parentRound = {
        folderId: this.props.hunt.folderId
      };
    } else {
      var roundIndex = parseInt(newRound.parentRound.split("-")[1]);
      newRound.parentRound = this.props.rounds[roundIndex];
    }

    // TODO: add meta links
    $.post("/admin/create/round",
      {
        newRound: newRound,
        huntId: this.props.hunt.name.replace(" ", "").toLowerCase(),
        puzzleTemplate: this.props.hunt.template
      }
    ).success(function(rounds) {
      if (rounds.error == null) {
        window.location.href = "/admin/edit";
      } else {
        console.error(rounds.error);
      }
    }.bind(this));
    event.preventDefault();
  },

  getInitialState: function(props) {
    props = props || this.props;

    return {
      newRound: {
        meta: '',
        names: [{
          val: '',
          key: 0 // static key that doesn't rely on position in array for React rendering
        }],
        parentRound: "None"
      },
      newPuzzle: {
        names: [{
          val: '',
          key: 0
        }],
        links: [{
          val: '',
          key: 0
        }],
        parentRound: null
      }
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
        <h4>Add Rounds</h4>
        <form onSubmit={this.createRound}>
          <div className='form-element'>
            <label htmlFor='parent-round'>Parent Round</label>
            <select value={this.state.newRound.parentRound} onChange={this.handleParentRoundChange}>
              <option value="None">None</option>
              {Object.keys(this.props.rounds).map(function(roundId) {
                return (
                  <option key={roundId} value={_this.props.rounds[roundId]}>{_this.props.rounds[roundId].name}</option>
                );
              })}
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
      </div>
    );
  }
});
