const Discord = require('discord.js');
const config = require('./index');

const { dryRun } = config.args;

class Bot {
  constructor() {
    this.isReady = false;
    this.channel = undefined;
    this.client = new Discord.Client();
    this.client.login(config.discord.token);
    this.client.on('ready', this.onReady.bind(this));
    // this.client.on('message', this.onMessage.bind(this));
  }

  onReady() {
    this.isReady = true;
    this.channel = this.client.channels.cache.get(config.discord.channel);
    this.send('Ready!');
  }

  // onMessage(message) {
  //   if (!message.author.bot) {
  //     console.log(`RECV: ${message.content}`);
  //   }
  // }

  send(message) {
    if (this.channel && message && !dryRun) {
      return this.channel.send(message);
    }
    return Promise.resolve();
  }

  stop() {
    return new Promise((resolve, reject) => {
      this.isReady = false;
      this.send('Goodbye!')
        .then(() => this.client.destroy())
        .then(resolve)
        .catch(reject);
    });
  }
}

module.exports = new Bot();
