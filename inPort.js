/**
 * Created by danrumney on 10/26/16.
 */
const IP = require('./src/Port').default;
const ipc = require('node-ipc');

ipc.config.id = 'inProc';

ipc.serve();

ipc.server.start();

ipc.connectTo('outProc');

const i = new IP('inProc', 'port');

