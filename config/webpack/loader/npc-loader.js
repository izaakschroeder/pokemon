/* eslint-disable metalab/babel/no-invalid-this */
import fs from 'fs';
import path from 'path';

export default function(js) {
  const cb = this.async();
  const context = this.context;
  const name = this.resourcePath.replace(/\.[^/.]+$/, '');
  fs.readFile(path.join(context, `${name}.txt`), 'utf8', (err, _data) => {
    if (err) {
      cb(null, js);
      return;
    }
    cb(null, js);
  });
}
