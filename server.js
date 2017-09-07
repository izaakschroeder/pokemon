var midori = require('midori');

const createApp = midori.serve({root: __dirname});
const app = createApp();

app.listen(8881);
