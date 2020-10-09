import React from "react";
import ReactDOM from "react-dom";
import Matter from "matter-js";

const Engine = Matter.Engine,
      Render = Matter.Render,
      World = Matter.World,
      Bodies = Matter.Bodies,
      Body = Matter.Body,
      Events = Matter.Events,
      Composite = Matter.Composite,
      Composites = Matter.Composites,
      Constraint = Matter.Constraint,
      Vector = Matter.Vector;

class Game extends React.Component {
  
  // Default game settings. Any of them can be changed as it pleases by passing gameSettings prop
  gameSettings = {
    palette: {
      textColor: "orange",
      background: '#32343E',
      ball: '#ff502f',
      seesaw: '#004d61',
      goalAreaInactive: '#348498',
      goalAreaActive: '#5bd1d7',
    },
    roundTime: 120,
    canvasHeigth: 600,
    canvasWidth: 600,
    seesawBlockSize: 50,
    seesawPosY: 400,
    seesawAngularVelocity: Math.PI/180,
    ballSize: 20,
    ballDensity: 0.002,
    ballRestitution: 0.3,
    ballPosY: 100,
    ballSpawnOffset: 70,
    showTimeLeft: true,
    showTimeOnSpot: false,
    showBallsLost: false,
    keyCodeBlow: 85,  // 'w' key
    keyCodeStartBall: 32, // 'space' key

    pipePosY: 300,
    pipeWallWidth: 10,
    pipeHeight: 525,
    ballFriction: 0,
    ballAirFriction: 0.05,
    blowForce: 0.03,
    restartTime: 2

  }

  gameState = {
    currentLevel: 1,
    currentTimeSpentOnSpot: 0,
    currentTimeLeft: null,
    currentBallsLost: 0,
    currentStartTimestamp: 0,
    ballActivationTimestamp: 0,
    currentLevelHasStarted: false,
    currentTimerHasStarted: false,
    results: [],
    goalBlockIndex: null,
    measureTimeStart: null,
    measureTimeEnd: null,
    engine: null,
    render: null
  }

  gameObjects = {
    pipe: null,
    ball: null
  }

  constructor(props) {
    super(props);
    this.state = {};
    this.gameSettings = Object.assign(this.gameSettings, props.gameSettings);
  }

  componentDidMount() {
    this.initializeMatterJS();

    // Setup game objects
    // this.gameObjects.seesaw = this.createSeesaw();
    this.gameObjects.ball = this.createBall();
    this.gameObjects.pipe = this.createPipe();

    // Add game objects to world
    World.add(this.gameState.engine.world, [
      this.gameObjects.pipe.pipeWallLeft,
      this.gameObjects.pipe.pipeWallRight,
    ]);
    
    // Initialize event handlers
    // this.initDisplayResult();
    this.initControl(this.gameObjects.ball);
    this.initRandomBlows(this.gameObjects.ball)
    // this.initBallOnSpotDetection(this.gameObjects.seesaw);
    this.initBallLossHandling(this.gameObjects.ball);
    // this.initTimerHandling();

    Engine.run(this.gameState.engine);
    Render.run(this.gameState.render);
  }

  initializeMatterJS() {
    this.gameState.engine = Engine.create();
    this.gameState.render = Render.create({
      element: this.refs.game,
      engine: this.gameState.engine,
      options: {
        width: this.gameSettings.canvasWidth,
        height: this.gameSettings.canvasHeigth,
        wireframes: false,
        background: this.gameSettings.palette.background
      }
    });
  }

  createPipe() {
    const pipeWidth = this.gameSettings.ballSize + this.gameSettings.pipeWallWidth / 2;
    const pipeWallLeft = Bodies.rectangle(
      this.gameSettings.canvasWidth / 2 - pipeWidth, 
      this.gameSettings.pipePosY, 
      this.gameSettings.pipeWallWidth,
      this.gameSettings.pipeHeight,
      {
        isStatic: true,
        render: {
          fillStyle: this.gameSettings.palette.seesaw
      }
    });

    const pipeWallRight = Bodies.rectangle(
      this.gameSettings.canvasWidth / 2 + pipeWidth, 
      this.gameSettings.pipePosY, 
      this.gameSettings.pipeWallWidth,
      this.gameSettings.pipeHeight,
      {
        isStatic: true,
        render: {
          fillStyle: this.gameSettings.palette.seesaw
      }
    });

    return {pipeWallLeft, pipeWallRight};
  }

  initControl(ball) {
    // const position = Vector.create(this.gameSettings.canvasWidth / 2, 0)
    // const force = Vector.create(this.gameSettings.canvasWidth / 2, -this.gameSettings.blowForce);
    document.addEventListener('keydown', (event) => {
      if (event.keyCode === this.gameSettings.keyCodeBlow) {
        Body.applyForce(ball, ball.position, {x: 0, y: -this.gameSettings.blowForce});
      }
      if (event.keyCode === this.gameSettings.keyCodeStartBall) {
        this.startBall(ball);
      }
    });
  }

  initRandomBlows(ball) {
    const lastBlowTimestamp = 0;
    Events.on(this.gameState.render, "afterRender", (event) => {
      if (false) {
          const randomDirection = Math.round(Math.random()) ? -1 : 1;
          const randomForce = Math.round(Math.random() * 3);
          Body.applyForce(ball, ball.position, {x: 0, y: randomDirection * randomForce});
      };
    });
  }

  setGoalBlockIndex(seesaw) {
    switch(this.gameState.currentLevel) {
      case 1: {
        this.gameState.goalBlockIndex= 5;
        break;
      }
      case 2: {
        this.gameState.goalBlockIndex = 4;
        break;
      }
      case 3: {
        this.gameState.goalBlockIndex = 6;
        break;
      }
      case 4: {
        this.gameState.goalBlockIndex = 3;
        break;
      }
      case 5: {
        this.gameState.goalBlockIndex = 7;
        break;
      }
      case 6: {
        this.gameState.goalBlockIndex = 2;
        break;
      }
      case 7: {
        this.gameState.goalBlockIndex = 8;
        break;
      }
      default: {
        break;
      }
    }
    seesaw.parts.forEach( part => part.render.fillStyle = this.gameSettings.palette.seesaw);
    seesaw.parts[this.gameState.goalBlockIndex].render.fillStyle = this.gameSettings.palette.goalAreaInactive;
  }

  createBall() {
    return Bodies.circle(
      this.gameSettings.canvasWidth / 2,
      this.gameSettings.pipePosY,
      this.gameSettings.ballSize, 
      { 
        friction: this.gameSettings.ballFriction,
        frictionAir: this.gameSettings.ballAirFriction,
        restitution: this.gameSettings.ballRestitution,
        density: this.gameSettings.ballDensity,
        render: {
          fillSytle: this.gameSettings.palette.ball 
        }
      }
    );
  }

  initDisplayResult() {
    // Don't set event listener if there's nothing to display at all
    if (!this.gameSettings.showTimeLeft && !this.gameSettings.showTimeOnSpot && !this.gameSettings.showBallsLost) { return; }
    const ctx = this.gameState.render.context;
    Events.on(this.gameState.render, "afterRender", (event) => {
      ctx.font = "30px Arial";
      ctx.fillStyle = this.gameSettings.palette.textColor;
      ctx.textAlign = "center";
      const timerText = `${this.gameState.currentTimeLeft}`;
      const onSpotTimerText = `${this.gameState.currentTimeSpentOnSpot.toFixed()} millisec`;
      const ballsLostText = `${this.gameState.currentBallsLost} balls lost`;
      if (this.gameSettings.showTimeLeft) {
        ctx.fillText(timerText, this.gameSettings.canvasWidth/2, this.gameSettings.canvasHeigth/10);
      }
      if (this.gameSettings.showTimeOnSpot) { 
        ctx.fillText(onSpotTimerText, this.gameSettings.canvasWidth/2, this.gameSettings.canvasHeigth/10 + 40);
      }
      if (this.gameSettings.showBallsLost) { 
        ctx.fillText(ballsLostText, this.gameSettings.canvasWidth/2, this.gameSettings.canvasHeigth/10 + 80);
      }
    });
  }

  initBallOnSpotDetection(seesaw) {
    const palette = this.gameSettings.palette;

    // Change color when collision starts
    Events.on(this.gameState.engine, 'collisionStart', (event) => {
        const goalBlock = seesaw.parts[this.gameState.goalBlockIndex];
        const pairs = event.pairs;
        for (var i = 0; i < pairs.length; i++) {
          if (pairs[i].bodyA === goalBlock ||
          pairs[i].bodyB === goalBlock) {
            goalBlock.render.fillStyle = palette.goalAreaActive;
          }
        }
    });

    // Detect time spent on the spot
    Events.on(this.gameState.engine, 'collisionActive', (event) => {
        const goalBlock = seesaw.parts[this.gameState.goalBlockIndex];
        const pairs = event.pairs;
        for (var i = 0; i < pairs.length; i++) {
          if (pairs[i].bodyA == goalBlock || 
          pairs[i].bodyB === goalBlock) {
            this.gameState.measureTimeEnd = event.source.timing.timestamp;
            if (this.gameState.measureTimeStart && this.gameState.measureTimeEnd) {
              
              this.gameState.currentTimeSpentOnSpot += this.gameState.measureTimeEnd - this.gameState.measureTimeStart;
            }
            this.gameState.measureTimeStart = this.gameState.measureTimeEnd;
          }
        }
    }); 

    // Reset measureTime values when leaving goal area
    Events.on(this.gameState.engine, 'collisionEnd', (event) => {
        const goalBlock = seesaw.parts[this.gameState.goalBlockIndex];
        const pairs = event.pairs;
        for (var i = 0; i < pairs.length; i++) {
          if (pairs[i].bodyA === goalBlock || pairs[i].bodyB === goalBlock) {
            this.gameState.measureTimeStart = null;
            this.gameState.measureTimeEnd = null;
          }
        }
    });

    // Change color when collision ends
    Events.on(this.gameState.engine, 'collisionEnd', (event) => {
        const goalBlock = seesaw.parts[this.gameState.goalBlockIndex];
        const pairs = event.pairs;
        for (var i = 0; i < pairs.length; i++) {
          if (pairs[i].bodyA == goalBlock ||
          pairs[i].bodyB == goalBlock) {
            goalBlock.render.fillStyle = palette.goalAreaInactive;
          }
        }
    });
  }

  initBallLossHandling(ball) {
    const outOfScreenBottomPosY = this.gameSettings.pipePosY + this.gameSettings.pipeHeight / 2 + this.gameSettings.ballSize;
    const outOfScreenTopPosY = this.gameSettings.pipePosY - this.gameSettings.pipeHeight / 2 - this.gameSettings.ballSize;
    Events.on(this.gameState.render, "afterRender", (event) => {
      if (ball && (ball.position.y > outOfScreenBottomPosY || ball.position.y < outOfScreenTopPosY)) {
          this.resetBall(ball);
          this.gameState.currentBallsLost++;
      };
    });
  }

  initTimerHandling() {
    Events.on(this.gameState.render, "afterRender", (event) => {
      if (this.gameState.currentTimerHasStarted) {
        this.gameState.currentTimeLeft = Math.round(this.gameSettings.roundTime - ((event.timestamp - this.gameState.currentStartTimestamp) / 1000));
        if (this.gameState.currentTimeLeft <= 0) {
          this.gameState.currentTimeLeft = 0;
          this.endLevel();
        }
      }
    });
  }

  resetBall(ball) {
    console.log('Ball resetting');
    World.remove(this.gameState.engine.world, ball);
    Body.setPosition(ball, {
      x: this.gameSettings.canvasWidth / 2,
      y: this.gameSettings.pipePosY
    });
    Body.setAngle(ball, 0);
    Body.setVelocity(ball, {x: 0, y: 0});
    Body.setAngularVelocity(ball, 0);
  }

  // resetBalls() {
  //   this.gameObjects.balls.forEach( ball => this.resetBall(ball) );
  // }

  // resetSeesaw(seesaw) {
  //   Body.setAngle(seesaw, 0);
  //   Body.setAngularVelocity(seesaw, 0);
  // }

  startBall(ball) {
    if (this.gameState.currentLevelHasStarted && ball) {
      World.add(this.gameState.engine.world, ball);
      if (!this.gameState.currentTimerHasStarted) {
        this.gameState.currentTimerHasStarted = true;
        this.gameState.currentStartTimestamp = this.gameState.engine.timing.timestamp;
        this.gameState.ballActivationTimestamp = this.gameState.engine.timing.timestamp + this.gameSettings.restartTime;
      }
    }
  }

  startGame() {
    Object.assign(this.gameState, {
      currentTimeSpentOnSpot: 0,
      currentTimeLeft: this.gameSettings.roundTime,
      currentBallsLost: 0,
      currentStartTimestamp: 0,
      currentLevelHasStarted: true,
      currentTimerHasStarted: false,
      goalBlockIndex: null,
      measureTimeStart: null,
      measureTimeEnd: null,
    })
    this.resetBall(this.gameObjects.ball);
    // this.resetSeesaw(this.gameObjects.seesaw);
    // this.setGoalBlockIndex(this.gameObjects.seesaw);
  }

  endLevel() {
    this.gameState.currentLevelHasStarted = false;
    this.gameState.currentTimerHasStarted = false;
    this.gameState.results.push({
      level: this.gameState.currentLevel,
      timeSpentOnSpot: this.gameState.currentTimeSpentOnSpot,
      ballsLost: this.gameState.currentBallsLost
    });
    this.onAfterLevelEnd();
  }

  onAfterLevelEnd() {
    typeof this.props.onLevelEnd === 'function' && this.props.onLevelEnd(this.gameState.results[this.gameState.results.length - 1]);
    if (this.gameState.currentLevel < 7) {
      this.startLevel(this.gameState.currentLevel + 1);
    } else {
      typeof this.props.onGameEnd === 'function' && this.props.onGameEnd(this.gameState.results);
    }
  }

  render() {
    return <div ref="game" />;
  }
}
export default Game;