const OutgoingPort = require('./src/OutgoingPort').default;
const o = new OutgoingPort('OUT');
o.connect('inProc', 'IN');
o.open();

const IncomingPort = require('./src/IncomingPort').default;
const i = new IncomingPort('IN');


i.receive().then(val => console.log(`Got val: ${val}`))

o.connect('proc', 'IN').then(() => { o.open(); o.send(1).then(() => {i.open(); i.receive().then(val => console.log(`Got val: ${val}`)); }); });



