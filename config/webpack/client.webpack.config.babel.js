import {compose} from 'ramda';
import base from './partial/base';

const createConfig = compose(
  base({name: 'client', target: 'web'})
);

export default createConfig();
