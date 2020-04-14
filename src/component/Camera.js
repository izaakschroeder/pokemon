import React from 'react';
import {Motion} from 'react-motion';
import {DisplayObjectContainer as Container} from '/react-pixi';

const clamp = (min, max, value) => {
  return Math.max(min, Math.min(max, value));
};

export default class Camera extends React.Component {
  componentShouldUpdate(nextProps) {
    return (
      nextProps.target.x !== this.props.target.x ||
      nextProps.target.y !== this.props.target.y ||
      nextProps.bounds.top !== this.props.bounds.top ||
      nextProps.bounds.left !== this.props.bounds.left ||
      nextProps.bounds.width !== this.props.bounds.width ||
      nextProps.bounds.height !== this.props.bounds.height ||
      nextProps.viewport.width !== this.props.viewport.width ||
      nextProps.viewport.height !== this.props.viewport.height ||
      nextProps.zoom !== this.props.zoom
    );
  }
  render() {
    const {children, viewport, bounds, target, zoom: baseZoom = 1} = this.props;
    const minZoom = bounds.width === 0 || bounds.height === 0 ? 0 : Math.max(
      0,
      (viewport.width /  bounds.width),
      (viewport.height / bounds.height),
    );
    const zoom = Math.max(minZoom, baseZoom);
    const xMin = bounds.left * zoom;
    const xMax = -bounds.left * zoom;
    const yMin = bounds.top * zoom;
    const yMax = -bounds.top * zoom;
    const x = clamp(
      xMin,
      xMax,
      -target.x * zoom + viewport.width / 2,
    );
    const y = clamp(
      yMin,
      yMax,
      -target.y * zoom  + viewport.height / 2
    );
    return (
      <Motion
        style={{
          zoom: zoom, // spring(zoom),
          x: x, // spring(x),
          y: y, // spring(y),
        }}
      >
        {({x, y, zoom}) => (
          <Container
            scale={[zoom, zoom]}
            yMin={yMin}
            yMax={yMax}
            xMin={xMin}
            xMax={xMax}
            x={x}
            y={y}
          >
            {children}
          </Container>
        )}
      </Motion>
    );
  }
}
