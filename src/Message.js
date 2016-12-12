import ipc from 'node-ipc';


/**
 *
 */
class Message {
  constructor(contents) {
    this.contents = contents;
    this.owner = ipc.config.id;
  }

  release() {
    this.owner = null;
  }

  claim(owner) {
    this.owner = owner;
  }

  isOwned() {
    return this.owner !== null;
  }

}

Message.fromObject = function (o) {
  const message = new Message(o.contents);
  message.claim(o.owner);
  return message;
};

export default Message;

