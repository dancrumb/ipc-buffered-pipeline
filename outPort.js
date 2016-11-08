
const OP = require('./src/Port').default;
const ipc = require('node-ipc');

ipc.config.id = 'outProc';

ipc.serve();
ipc.server.start();

const o = new OP('outProc', 'port');