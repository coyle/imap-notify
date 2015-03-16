var
  moment = require('moment'),
  _ = require('lodash'),
  util = require('util'),
  Imap = require('imap'),
  MailParser = require('mailparser').MailParser,
  EventEmitter = require('events').EventEmitter;

function ImapNotify(opts) {
  var
    acct = {
      user: opts.user || opts.username,
      host: opts.host || 'localhost',
      port: opts.port || 143,
      tls: opts.tls || false,
      autotls: 'always',
      keepalive: {
        interval: 10000,
        idleInterval: 300000, // 5 mins
        forceNoop: true
      }
    },
    box = opts.box;

  if (!opts.password) {
    acct.xoauth2 = opts.xoauth2;
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
    this.imap.openBox(box, false, function(err) {
      if (err) {
        this.emit('error', err);
      } else {
        this.emit('success');
      }
    }.bind(this));
  }.bind(this));

  this.imap.on('mail', fetchNewMsgs.bind(this));

  this.imap.on('end', function() {

    this.connected = false;
    this.emit('end');
  }.bind(this));

  this.imap.on('close', function(err) {

    this.connected = false;
    if (err) {
      this.emit('error', err);
    }

    this.emit('close');

  }.bind(this));
}


function fetchNewMsgs(msgCount) {
  var
    yesterday = moment().subtract(2, 'days').toDate(),
    length,
    uidsToFetch;


  // We do not search for only UNSEEN since this could return 1000's of messages
  // we do the search since yesterday so we can catch messages sent on 11:59:59
  // but perform the search at 12:00:00
  this.imap.search(['UNSEEN', ['SINCE', yesterday]], function(err, uids) {

    if (err) {
      this.emit('error', err);
      return this;
    }

    length = uids.length;
    uidsToFetch = _.chain(uids)
      .sortByAll()
      .slice((length - msgCount), length)
      .value();

    if (uidsToFetch && uidsToFetch.length > 0) fetch.call(this, uidsToFetch);

    return this;
  }.bind(this));

}

function fetch(uids) {

  var
    opts = {
      markSeen: false,
      bodies: ''
    },
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
  }.bind(this));

  fetcher.once('error', function(err) {
    this.emit('error', err);
  }.bind(this));

  fetcher.once('end', function() {
    return;
  });
}

util.inherits(ImapNotify, EventEmitter);

module.exports = function(opts) {
  return new ImapNotify(opts);
};