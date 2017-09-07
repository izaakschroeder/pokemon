/* eslint-disable metalab/jsx-a11y/no-noninteractive-element-interactions */
/* eslint-disable metalab/jsx-a11y/no-noninteractive-tabindex */
import React from 'react';
import {Stage} from '/react-pixi';
import World from './World';
import Character from './Character';
import Camera from './Camera';
import {map} from 'ramda';
import p2 from 'p2';

const physics = new p2.World({
  gravity: [0, 0],
});

const playerBody = new p2.Body({
  mass: 5,
  position: [300, 300],
  damping: 0.4,
});
playerBody.addShape(new p2.Box({
  width: 10,
  height: 12,
}));

physics.addBody(playerBody);

physics.on('beginContact', (ev) => {
  console.log('CONTACT', ev);
  let playerBody;
  let layerBody;
  if (ev.bodyB.layer) {
    layerBody = ev.bodyB;
    playerBody = ev.bodyA;
  } else {
    layerBody = ev.bodyA;
    playerBody = ev.bodyB;
  }
  console.log("PLAYER TOUCHED", layerBody.layer.name);
  if (layerBody.layer.map) {
    layerBody.layer.map.onLOL();
    layerBody.layer.map.loadNext();
  }
});

const isLayerBody = (body, name) => {
  return body.layer && body.layer.name === name;
};
/* eslint-disable complexity */
physics.on('preSolve', (ev) => {
  for (let i = 0; i < ev.contactEquations.length; ++i) {
    const eq = ev.contactEquations[i];
    if (
      isLayerBody(eq.bodyA, 'Water') ||
      isLayerBody(eq.bodyB, 'Water') ||
      isLayerBody(eq.bodyA, 'Grass') ||
      isLayerBody(eq.bodyB, 'Grass')
    ) {
      eq.enabled = false;
    }

    // Ledge jumping.
    if (
      (isLayerBody(eq.bodyA, 'LedgesDown') && eq.normalA[1] < 0) ||
      (isLayerBody(eq.bodyB, 'LedgesDown') && eq.normalA[1] > 0)
    ) {
      eq.enabled = false;
    }

    if (
      (isLayerBody(eq.bodyA, 'LedgesLeft') && eq.normalA[0] > 0) ||
      (isLayerBody(eq.bodyB, 'LedgesLeft') && eq.normalA[0] < 0)
    ) {
      eq.enabled = false;
    }

    if (
      (isLayerBody(eq.bodyA, 'LedgesRight') && eq.normalA[0] < 0) ||
      (isLayerBody(eq.bodyB, 'LedgesRight') && eq.normalA[0] > 0)
    ) {
      eq.enabled = false;
    }
  }
});

class Game extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      x: 10,
      y: 28,
      direction: 'left',
      bounds: {
        top: 0,
        left: 0,
        width: 0,
        height: 0,
      },
    };
  }
  componentDidMount() {
    const fixedTimeStep = 1 / 60;
    const maxSubSteps = 10;
    let lastTimeMilliseconds;
    const animloop = (timeMilliseconds) => {
      const raf = requestAnimationFrame(animloop);
      let timeSinceLastCall = 0;
      if (timeMilliseconds !== undefined && lastTimeMilliseconds !== undefined) {
        timeSinceLastCall = (timeMilliseconds - lastTimeMilliseconds) / 1000;
      }

      // HACK: WEEEEE.
      // playerBody.force[0] = 0;
      // playerBody.force[1] = 0;
      if (this.state.active) {
        if (this.state.direction === 'left') {
          playerBody.velocity[0] = -60;
          playerBody.velocity[1] = 0;
        } else if (this.state.direction === 'right') {
          playerBody.velocity[0] = 60;
          playerBody.velocity[1] = 0;
        } else if (this.state.direction === 'down') {
          playerBody.velocity[1] = 60;
          playerBody.velocity[0] = 0;
        } else if (this.state.direction === 'up') {
          playerBody.velocity[1] = -60;
          playerBody.velocity[0] = 0;
        }
      }

      physics.step(fixedTimeStep, timeSinceLastCall, maxSubSteps);
      lastTimeMilliseconds = timeMilliseconds;
      this.setState({
        x: playerBody.position[0],
        y: playerBody.position[1],
        raf,
      });
    };
    animloop();
  }
  componentWillUnmount() {
    if (this.state.raf) {
      cancelAnimationFrame(this.state.raf);
    }
  }
  render() {
    const {direction, x, y, bounds} = this.state;
    const characters = [
      {xid: 0, x: x - 11, y: y - 15, direction},
      {xid: 1, x: 13 * 16, y: 40 * 16, direction: 'down', id: 3},
      {xid: 2, x: 16 * 16, y: 16 * 16, direction: 'left', id: 6},
    ].sort(({y: y1}, {y: y2}) => y1 - y2);
    return (
      <div
        tabIndex='0'
        onKeyUp={() => {
          this.setState({active: false});
        }}
        onKeyDown={(ev) => {
          ev.preventDefault();
          switch (ev.keyCode) {
          case 37:
            this.setState({direction: 'left', active: true});
            break;
          case 38:
            this.setState({direction: 'up', active: true});
            break;
          case 39:
            this.setState({direction: 'right', active: true});
            break;
          case 40:
            this.setState({direction: 'down', active: true});
            break;
          default:
            break;
          }
        }}
        role='application'
      >
        <Stage width={800} height={900}>
          <Camera target={{x, y}} bounds={bounds} viewport={{width: 800, height: 900}}>
            <World
              x={0}
              y={0}
              onUnload={(map) => {
                map.bodies.forEach((body) => {
                  physics.removeBody(body);
                });
              }}
              onLoad={(map) => {
                map.onLOL = () => {
                  this.setState({
                    bounds: {
                      left: map.offsetX,
                      top: map.offsetY,
                      width: map.width * map.tileWidth,
                      height: map.height * map.tileHeight,
                    },
                  });
                };
                map.bodies = [];
                map.layers.forEach((layer) => {
                  if (!/Collisions|Water|Grass|Ledges/.test(layer.name)) {
                    return;
                  }
                  layer.polygons.forEach((polygon) => {
                    const body = new p2.Body({
                      mass: 0,
                      position: [map.offsetX, map.offsetY],
                    });
                    body.fromPolygon(polygon.slice());
                    body.type = p2.Body.STATIC;
                    body.layer = layer;
                    map.bodies.push(body);
                    physics.addBody(body);
                  });
                });
                const shape = new p2.Box({
                  width: map.width * map.tileWidth,
                  height: map.height * map.tileHeight,
                });
                const body = new p2.Body({
                  mass: 0,
                  position: [
                    map.offsetX + shape.width / 2,
                    map.offsetY + shape.height / 2,
                  ],
                });
                shape.sensor = true;
                body.addShape(shape);
                body.type = p2.Body.STATIC;
                body.layer = {name: `map-${map.name}`, map};
                physics.addBody(body);
                map.bodies.push(body);
              }}
            >
              {map((char) => (
                <Character
                  x={char.x}
                  y={char.y}
                  direction={char.direction}
                  id={char.id}
                  key={char.xid}
                  velocity={1}
                />
              ), characters)}
            </World>
          </Camera>
        </Stage>
      </div>
    );
  }
}

export default () => (
  <div>
    <Game/>
  </div>
);

/*
if on grass then draw grass overlay (loop through all layers check if tile is
active and has "Grass" === "true")

draw reflections is necessary

*/
