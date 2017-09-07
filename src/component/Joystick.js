import React from 'react';
import nipple from 'nipplejs';

class Joystick extends React.Component {
  componentDidMount() {
    this.manager = nipple.create({
      // zone: this.elem,
      ...this.props,
    });
    if (this.props.onMove) {
      this.manager.on('move', this.props.onMove);
    }
  }
  render() {
    return <div ref={(x) => {this.elem = x;}}/>;
  }
}

export default Joystick;
