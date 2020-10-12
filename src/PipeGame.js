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

class PipeGame extends React.Component {
  
  // Default game settings. Any of them can be changed as it pleases by passing gameSettings prop
  gameSettings = {
    palette: {
      textColor: "orange",
      background: '#32343E',
      ball: '#ff502f',
      pipe: '#004d61',
      goalAreaInactive: '#348498',
      goalAreaActive: '#5bd1d7',
    },
    gameTime: 60,
    canvasHeigth: 600,
    canvasWidth: 600,
    ballSize: 20,
    ballDensity: 0.002,
    ballPosY: 100,
    showTimeLeft: true,
    showTimeOnSpot: false,
    showBallsLost: false,
    keyCodeBlow: 85,  // 'u' key
    pipePosY: 300,
    pipeWallWidth: 10,
    pipeHeight: 525,
    ballFriction: 0,
    ballAirFriction: 0.05,
    blowForce: 0.03,
    randomBlowForceMin: 0.02,
    randomBlowForceMax: 0.08,
    ballSpawnTime: 5000,
    randomBlowDelay: 2000,
    goalAreaHeight: 50,   
  }

  gameState = {
    currentTimeSpentOnSpot: 0,
    currentTimeLeft: null,
    currentBallsLost: 0,
    currentStartTimestamp: 0,
    ballActivationTime: 0,
    lastRandomBlowTime: 0,
    gameHasStarted: false,
    currentTimerHasStarted: false,
    results: null,
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
    this.gameObjects.ball = this.createBall();
    this.gameObjects.pipe = this.createPipe();

    // Add game objects to world
    World.add(this.gameState.engine.world, this.gameObjects.pipe);
    
    // Initialize event handlers
    this.initDisplayResult();
    this.initControl(this.gameObjects.ball);
    this.initRandomBlows(this.gameObjects.ball)
    this.initBallOnSpotDetection(this.gameObjects.pipe);
    this.initBallLossHandling(this.gameObjects.ball);
    this.initTimerHandling();
    this.initBallSpawner(this.gameObjects.ball)

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
          fillStyle: this.gameSettings.palette.pipe
      }
    });

    const spotLeft = Bodies.rectangle(
      this.gameSettings.canvasWidth / 2 - pipeWidth, 
      this.gameSettings.pipePosY, 
      this.gameSettings.pipeWallWidth,
      this.gameSettings.goalAreaHeight,
      {
        isStatic: true,
        render: {
          fillStyle: this.gameSettings.palette.goalAreaInactive
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
          fillStyle: this.gameSettings.palette.pipe
        }
    });

    const spotRight = Bodies.rectangle(
      this.gameSettings.canvasWidth / 2 + pipeWidth, 
      this.gameSettings.pipePosY, 
      this.gameSettings.pipeWallWidth,
      this.gameSettings.goalAreaHeight,
      {
        isStatic: true,
        render: {
          fillStyle: this.gameSettings.palette.goalAreaInactive
      }
    });
    
    return Body.create({parts: [pipeWallLeft, pipeWallRight, spotLeft, spotRight], isStatic: true});
  }
  
  createBall() {
    return Bodies.circle(
      this.gameSettings.canvasWidth / 2,
      this.gameSettings.pipePosY,
      this.gameSettings.ballSize, 
      { 
        friction: this.gameSettings.ballFriction,
        frictionAir: this.gameSettings.ballAirFriction,
        density: this.gameSettings.ballDensity,
        render: {
          fillSytle: this.gameSettings.palette.ball 
        }
      }
    );
  }
  
  initControl(ball) {
    document.addEventListener('keydown', (event) => {
      if (!this.gameState.ballActivationTime) { return; }
      if (event.keyCode === this.gameSettings.keyCodeBlow) {
        Body.applyForce(ball, ball.position, {x: 0, y: -this.gameSettings.blowForce});
      }
    });
  }

  initRandomBlows(ball) {
    Events.on(this.gameState.render, "afterRender", (event) => {
      if (!this.gameState.ballActivationTime) { return; }
      const itsRandomBlowTime = this.gameState.lastRandomBlowTime ?
        event.timestamp - this.gameState.lastRandomBlowTime >= this.gameSettings.randomBlowDelay :
        event.timestamp - this.gameState.ballActivationTime >= this.gameSettings.randomBlowDelay;
      if (itsRandomBlowTime) {
          const randomDirection = Math.round(Math.random()) ? -1 : 1;
          const precision = this.precision(this.gameSettings.randomBlowForceMax);
          const precisionOffset = Math.pow(10, precision);
          const randomForce = Math.round(
            (Math.random() * (this.gameSettings.randomBlowForceMax - this.gameSettings.randomBlowForceMin) + this.gameSettings.randomBlowForceMin) * precisionOffset
          ) / precisionOffset;
          console.log('Random push with:', randomDirection * randomForce);
          Body.applyForce(ball, ball.position, {x: 0, y: randomDirection * randomForce});
          this.gameState.lastRandomBlowTime = event.timestamp;
      };
    });
  }

  initDisplayResult() {
    // Don't set event listener if there's nothing to display at all
    if (!this.gameSettings.showTimeLeft && !this.gameSettings.showTimeOnSpot && !this.gameSettings.showBallsLost) { return; }
    const ctx = this.gameState.render.context;
    ctx.font = "30px Arial";
    ctx.textAlign = "center";
    Events.on(this.gameState.render, "afterRender", (event) => {
      ctx.fillStyle = this.gameSettings.palette.textColor;
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

  initBallSpawner(ball) {
    let ballLostTimestamp;
    const ctx = this.gameState.render.context;
    ctx.font = "30px Arial";
    ctx.textAlign = "center";
    Events.on(this.gameState.render, "afterRender", (event) => {
      // Early return of ball is active
      if (!this.gameState.gameHasStarted || this.gameState.ballActivationTime) { return; }
      ctx.fillStyle = this.gameSettings.palette.textColor;
      if (!ballLostTimestamp) {
        ballLostTimestamp = event.timestamp;
      }
      const deltaTime = event.timestamp - ballLostTimestamp;
      if (deltaTime < this.gameSettings.ballSpawnTime) {  
        const timer = Math.ceil((this.gameSettings.ballSpawnTime - deltaTime) / 1000);
        ctx.fillText(timer, this.gameSettings.canvasWidth/2, this.gameSettings.pipePosY + 12); // offset with some magic number depending on fontsize
      } else {
        this.gameState.ballActivationTime = this.gameState.engine.timing.timestamp;
        this.gameState.lastRandomBlowTime = 0;
        ballLostTimestamp = 0;
        this.startBall(ball);
      }

    });
  }

  initBallOnSpotDetection(pipe) {
    const palette = this.gameSettings.palette;
    const areaTopEdge = this.gameSettings.pipePosY - this.gameSettings.goalAreaHeight / 2 - this.gameSettings.ballSize;
    const areaBottomEdge = this.gameSettings.pipePosY + this.gameSettings.goalAreaHeight / 2 + this.gameSettings.ballSize;
    let wasOnSpot = false;
    
    const measureTimeInArea = (event) => {
      this.gameState.measureTimeEnd = event.timestamp;
      if (this.gameState.measureTimeStart && this.gameState.measureTimeEnd) {  
        this.gameState.currentTimeSpentOnSpot += this.gameState.measureTimeEnd - this.gameState.measureTimeStart;
      }
      this.gameState.measureTimeStart = this.gameState.measureTimeEnd;
    }

    const resetTimerOnLeave = () => {
      this.gameState.measureTimeStart = null;
      this.gameState.measureTimeEnd = null;
    }

    Events.on(this.gameState.render, "afterRender", (event) => {
      if (!this.gameState.gameHasStarted || !this.gameState.ballActivationTime) { return; }
      const ballInGoalArea = this.gameObjects.ball.position.y > areaTopEdge && this.gameObjects.ball.position.y < areaBottomEdge; 
      // Ball enters goal area
      if (ballInGoalArea && !wasOnSpot) { 
        pipe.parts[3].render.fillStyle = palette.goalAreaActive;
        pipe.parts[4].render.fillStyle = palette.goalAreaActive;
        wasOnSpot = true;
      // Ball leaves goal area
      } else if (!ballInGoalArea && wasOnSpot) {
        pipe.parts[3].render.fillStyle = palette.goalAreaInactive;
        pipe.parts[4].render.fillStyle = palette.goalAreaInactive;
        resetTimerOnLeave();
        wasOnSpot = false;
      }
      if (ballInGoalArea) {
        measureTimeInArea(event);
      }
    });
  }

  initBallLossHandling(ball) {
    const outOfScreenBottomPosY = this.gameSettings.pipePosY + this.gameSettings.pipeHeight / 2 + this.gameSettings.ballSize;
    const outOfScreenTopPosY = this.gameSettings.pipePosY - this.gameSettings.pipeHeight / 2 - this.gameSettings.ballSize;
    Events.on(this.gameState.render, "afterRender", (event) => {
      if (!this.gameState.gameHasStarted) { return; }
      if (ball && (ball.position.y > outOfScreenBottomPosY || ball.position.y < outOfScreenTopPosY)) {
          this.resetBall(ball);
          this.gameState.currentBallsLost++;
      };
    });
  }

  initTimerHandling() {
    Events.on(this.gameState.render, "afterRender", (event) => {
      if (this.gameState.currentTimerHasStarted) {
        this.gameState.currentTimeLeft = Math.round(this.gameSettings.gameTime - ((event.timestamp - this.gameState.currentStartTimestamp) / 1000));
        if (this.gameState.currentTimeLeft <= 0) {
          this.gameState.currentTimeLeft = 0;
          this.endLevel();
        }
      }
    });
  }

  resetBall(ball) {
    World.remove(this.gameState.engine.world, ball);
    this.gameState.ballActivationTime = 0;
    this.gameState.lastRandomBlowTime = 0;
    Body.setPosition(ball, {
      x: this.gameSettings.canvasWidth / 2,
      y: this.gameSettings.pipePosY
    });
    Body.setAngle(ball, 0);
    Body.setVelocity(ball, {x: 0, y: 0});
    Body.setAngularVelocity(ball, 0);
  }

  startGame() {
    Object.assign(this.gameState, {
      currentTimeSpentOnSpot: 0,
      currentTimeLeft: this.gameSettings.gameTime,
      currentBallsLost: 0,
      currentStartTimestamp: 0,
      gameHasStarted: true,
      currentTimerHasStarted: false,
      measureTimeStart: null,
      measureTimeEnd: null,
    })
    this.resetBall(this.gameObjects.ball);
  }

  startBall(ball) {
    if (this.gameState.gameHasStarted && ball) {
      World.add(this.gameState.engine.world, ball);
      if (!this.gameState.currentTimerHasStarted) {
        this.gameState.currentTimerHasStarted = true;
        this.gameState.currentStartTimestamp = this.gameState.engine.timing.timestamp;
      }
    }
  }

  endLevel() {
    this.gameState.gameHasStarted = false;
    this.gameState.currentTimerHasStarted = false;
    this.gameState.result = {
      timeSpentOnSpot: this.gameState.currentTimeSpentOnSpot,
      ballsLost: this.gameState.currentBallsLost
    };
    this.onAfterLevelEnd();
  }

  onAfterLevelEnd() {
    typeof this.props.onGameEnd === 'function' && this.props.onGameEnd(this.gameState.result);
  }

  precision(num) {
    if (!isFinite(num)) return 0;
    var e = 1, p = 0;
    while (Math.round(num * e) / e !== num) { e *= 10; p++; }
    return p;
  }

  render() {
    return <div ref="game" />;
  }
}
export default PipeGame;