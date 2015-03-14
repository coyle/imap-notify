/*jslint node: true, vars: true, indent: 4 */

var
  moment = require('moment'),
  _ = require('lodash'),
  util = require('util'),
  Imap = require('imap'),
  MailParser = require('mailparser').MailParser,
  EventEmitter = require('events').EventEmitter;


function emailNotify(opts) {
  var
    acct = {
      user: opts.user || opts.username,
      host: opts.host,
      port: opts.port,
      tls: opts.tls,
      autotls: 'always',
      keepalive: {
        interval: 10000,
        idleInterval: 300000, // 5 mins
        forceNoop: true
      }
    },
    box = opts.box;

  if (!opts.password) {
    acct.xoauth2 = opts.access_token;
  } else {
    acct.password = opts.password;
  }

  this.imap = new Imap(acct);

  this.imap.connect();

  this.connected = false;

  this.imap.on('error', function(err) {
    this.emit('error', err);
  }.bind(this));

  this.imap.on('ready', function() {
    this.connected = true;
    this.imap.openBox(box, false, fetch.bind(this));
  }.bind(this));

  this.imap.on('mail', function(numberOfNewMessages) {
    fetchNewMsgs.call(this, numberOfNewMessages);
  }.bind(this));

  this.imap.on('end', function() {
    this.connected = false;
    this.emit('end');
  }.bind(this));

  this.imap.on('close', function(err) {
    this.connected = false;
    if (err) {
      this.emit('error', err);
    }
  }.bind(this));
}


function fetchNewMsgs(msgCount) {
  var
    yesterday = moment().subtract(2, 'days'),
    length,
    uidsToFetch;

  this.imap.search(['UNSEEN', ['SINCE', yesterday]], function(err, uids) {
    if (err) {
      this.emit('error', err);
    }

    length = uids.length;

    uidsToFetch = _.chain(uids)
      .sortByAll()
      .slice((length - msgCount), length)
      .value();

    fetch(uidsToFetch);

    return this;
  });

}

function fetch(uids) {
  var
    opts = {markSeen: false, bodies: ''},
    fetcher = this.imap.fetch(uids, opts);

  fetcher.on('message', function(msg) {
    var
      parser = new MailParser(),
      attributes;

    msg.once('attributes', attributesHandler);
    msg.on('body', messageBody);
    msg.on('end', messageEnd);

    parser.on('end', parserEnd.bind(this));

    function messageBody(stream) {
      var
        buffer = '';

      stream.on('data', data);
      stream.once('end', end);

      function data(chunk) {
        buffer += chunk;
      }

      function end() {
        parser.write(buffer);
      }
    }

    function attributesHandler(attrs) {
      attributes = attrs;
    }

    function parserEnd(mailObj) {
      // inject attributes into mail object
      mailObj.attributes = attributes;
      this.emit('mail', mailObj);
    }

    function messageEnd() {
      parser.end();
    }
  });

  fetcher.once('error', function(err) {
    this.emit('error', err);
  }.bind(this));

  fetcher.once('end', function() {
    return;
  });
}

util.inherits(emailNotify, EventEmitter);

module.exports = emailNotify;