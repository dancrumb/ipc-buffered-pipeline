# IPC Buffered Pipeline

Although JavaScript is generally thought of a single-threaded platform (and, generally, it is), in a
 server-side environment (like Node.js), there's nothing to stop you creating
 multi-process systems.
 
Communicating between processes can be achieved in many ways. This module provides you
with buffered pipelines between processes as well as the concept of 'ports' connecting
these processes.

## Prerequisites

This module assumes that you're using [`node-ipc`](node-ipc). This dependency
is defined in `package.json` as a peer-dependency.

## Pipeline concepts
Let's initial by assuming that you understand the difference between threads and processes.

We'll also assume that you understand Promises. If not, you should check out [this primer](promises).

This pipeline builds upon the connections that `node-ipc` builds. It creates connections on a
process-to-process basis. This pipeline introduces the idea of process ports and allows you to create
connections between ports. In addition, the connections between these ports are buffered, allowing you
to send values into the pipeline even if it is not currently connected.

![simple pipeline](pipeline1.png)

Here, `process1` and `process2` are IPC process that have been connected, using the `node-ipc` module.

`process1` creates an `OutgoingPort` called `OUT`. `process2` creates an `IncomingPort` called `IN`.

These are then connected. Now, traffic can flow from the `OUT` port to the `IN` port.

Pipelines are uni-directional.

Only one pipeline can leave an `OutgoingPort`. Any number of pipelines can enter an `IncomingPort`.

Pipelines are buffered, but they do have a limited capacity. Values sent via an `OutgoingPort` are consumed immediately
so long as there's room in the buffer. Once a buffer is full, further attempts to send values will be held up until room
in the buffer is made.

## Example
First, the processes need to be connected to one another. This is done using the
`node-ipc` package

```javascript
/*
 * Process 1  
 */
import ipc from 'node-ipc';
ipc.config.id = 'process1';
ipc.serve();
ipc.server.initial();
ipc.connectTo('process2');
 
/*
 * Process 2
 */
import ipc from 'node-ipc';
ipc.config.id = 'process2';
ipc.serve();
ipc.server.initial();
ipc.connectTo('process1');

```

So far, this is all indpendant of this module.

Now, it's time to establish the pipeline.

```javascript
/*
 * Process 1
 */
import OutgoingPort from './src/OutgoingPort';
const o = new OutgoingPort('OUT');
o.connect('process2', 'IN');
 
/*
 * Process 2
 */
import IncomingPort from './src/IncomingPort';
const i = new IncomingPort('IN');
```

The important thing to note here is that the Outgoing Port is the one that 
does the connecting (the incoming port automatically connects back).

Now that the ports are connected, you can





  [node-ipc]: http://riaevangelist.github.io/node-ipc/
  [promises]: https://promise-nuggets.github.io/