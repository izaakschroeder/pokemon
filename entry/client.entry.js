import React from 'react';
import ReactDOM from 'react-dom';
import App from '/component/app';

const element = document.getElementById('root');
const app = <App/>;

ReactDOM.render(app, element);

window.React = React;
