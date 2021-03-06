import React, { Component } from 'react';
import { render } from 'react-dom';
import PipeGame from './PipeGame'
import './style.css';

class App extends Component {
  myGameSettings = {
    showBallsLost: true,
    showTimeOnSpot: true,
    roundTime: 10
  }

  constructor() {
    super();
    this.state = {
      name: 'React'
    };
  }

  componentDidMount() {
    // Don't copy this it's just for testing usage of refs.game for child function call
    document.addEventListener('keydown', (event) => {
      if (event.keyCode === 13) {
        this.refs.game.startGame();
      }
    });
  }


  myOnGameEndFunction(results) {
    console.log('End game results:', results);
  }

  render() {
    return (
      <div>
        <PipeGame ref="game" 
          gameSettings={this.myGameSettings}
          onGameEnd={this.myOnGameEndFunction}
        />
      </div>
    );
  }
}

render(<App />, document.getElementById('root'));
