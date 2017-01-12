import React, { Component } from 'react';
import './css/style.css';

class App extends Component {
  render() {
    return (
      <div className="App">
        <div>
          <h1 id="header">Super Team Awesome</h1>
          <h2 id="subheader">Super Tired Asians</h2>
        </div>
        <Clock></Clock>
        <p id="puzzles">
          puzzles go here
        </p>
      </div>
    );
  }
}

class Clock extends Component {
  constructor(props) {
    super(props);
    this.state = {date: new Date()};
  }

  componentDidMount() {
    this.timerID = setInterval(
      () => this.tick(),
      1000
    );
  }

  componentWillUnmount() {
    clearInterval(this.timerID);
  }

  tick() {
    this.setState({
      date: new Date()
    });
  }

  render() {
    return (
      <div className="Clock" id="clock">
        {this.state.date.toLocaleTimeString()}
      </div>
    );
  }
}

export default App;
