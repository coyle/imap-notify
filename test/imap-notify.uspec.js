/*jshint unused: false*/
/*jshint undef: false*/
/*jshint expr: true*/
/*jshint maxlen: 1000*/
/*jshint quotmark: false*/

describe('imap-notify', function() {
  var
    proxyquire = require('proxyquire'),
    EventEmitter = require('events').EventEmitter,
    MailParser = require('mailparser').MailParser,
    _ = require('lodash'),
    moment = require('moment'),
    sinon = require('sinon'),
    should = require('should');

  beforeEach(function() {

    fetchInstanceStub = {
      on: sinon.stub(),
      once: sinon.stub(),
      end: sinon.stub()
    };

    fetchStub = sinon.stub();
    fetchStub.returns(fetchInstanceStub);

    imapStub = sinon.stub();
    imapStub.parseHeader = sinon.stub();
    imapStub.parseHeader.returns('header');

    imapInstanceStub = {
      connect: sinon.spy(),
      end: sinon.spy(),
      state: 'disconnected',
      once: sinon.stub(),
      on: sinon.stub(),
      openBox: sinon.stub(),
      closeBox: sinon.stub(),
      getBoxes: sinon.stub(),
      search: sinon.stub(),
      fetch: fetchStub,
      removeAllListeners: sinon.spy(),
      addListener: sinon.stub(),
      removeListener: sinon.spy(),
      emit: sinon.stub()
    };

    imapStub.returns(imapInstanceStub);

    stubMoment = {
      subtract: sinon.stub(),
      toDate: sinon.stub()
    };

    stubMoment.subtract.returns(stubMoment);
    stubMoment.toDate.returns('date');

    momentStub = function(){
      return stubMoment;
    };

    imapNotify = proxyquire('../lib/imap-notify', {
      imap: imapStub,
      moment: momentStub
    });

  });

  describe('imapNotify()', function() {
    var
      notifier,
      eventEmitStub,
      imapnotify,
      imapConfigs,
      opts;

    beforeEach(function() {
      imapConfigs = {
        user: 'email',
        host: 'host',
        port: 'port',
        tls: true,
        autotls: 'always',
        keepalive: {
          interval: 10000,
          idleInterval: 300000, // 5 mins
          forceNoop: true
        },
        password: 'password'
      };
      opts = {
        user: 'email',
        host: 'host',
        password: 'password',
        port: 'port',
        tls: true,
        box: 'Inbox'
      };


      notifier = imapNotify(opts);

      eventEmitStub = sinon.stub(notifier, 'emit');
    });

    afterEach(function() {});

    it('should call imap library with correct options', function() {
      imapStub.lastCall.calledWith(imapConfigs).should.be.ok;
    });

    it('should set oauth token if no password', function() {
      opts.password = null;
      opts.xoauth2 = 'xoauth2';
      notifier = imapNotify(opts);
      imapStub.lastCall.calledWith(imapConfigs).should.not.be.ok;
    });

    it('should call connect on imap', function() {
      imapInstanceStub.connect.callCount.should.eql(1);
    });

    it('should listen for error events on imap', function() {
      imapInstanceStub.on.calledWith('error').should.be.ok;
    });

    it('should listen for the ready event on imap', function() {
      imapInstanceStub.on.calledWith('ready').should.be.ok;
    });

    it('should listen for the mail event on imap', function() {
      imapInstanceStub.on.calledWith('mail').should.be.ok;
    });

    it('should listen for the end event on imap', function() {
      imapInstanceStub.on.calledWith('end').should.be.ok;
    });

    it('should listen for the close event on imap', function() {
      imapInstanceStub.on.calledWith('close').should.be.ok;
    });

    it('should emit the error if imap errors', function() {
      imapInstanceStub.on.args[0][1]('msg');
      eventEmitStub.lastCall.calledWith('error', 'msg').should.be.ok;
    });

    it('should open the box once imap is ready', function() {
      imapInstanceStub.on.args[1][1]();
      imapInstanceStub.openBox.lastCall.calledWith(opts.box, false).should.be.ok;
    });

    it('should emit an error if opening the box errors', function() {
      imapInstanceStub.on.args[1][1]();
      imapInstanceStub.openBox.lastCall.args[2]('msg');
      eventEmitStub.lastCall.calledWith('error', 'msg').should.be.ok;
    });

    it('should emit success event if opening the box succeeds', function() {
      imapInstanceStub.on.args[1][1]();
      imapInstanceStub.openBox.lastCall.args[2]();
      eventEmitStub.lastCall.calledWith('success').should.be.ok;
    });

    it('should emit end when imap ends', function() {
      imapInstanceStub.on.args[3][1]();
      eventEmitStub.lastCall.calledWith('end').should.be.ok;
    });

    it('should emit an error if imap closed with error', function() {
      imapInstanceStub.on.args[4][1]('msg');
      eventEmitStub.calledWith('error', 'msg').should.be.ok;
    });

    it('should emit an close event if imap connection closed', function() {
      imapInstanceStub.on.args[4][1]();
      eventEmitStub.lastCall.calledWith('close').should.be.ok;
    });

    describe('fetchNewMsgs()', function() {
      var
        chainStub,
        lodashStub;

      beforeEach(function() {
        lodashStub = {
          sortByAll: sinon.stub(),
          slice: sinon.stub(),
          value: sinon.stub()
        };

        chainStub = sinon.stub(_, 'chain');
        chainStub.returns(lodashStub);
        lodashStub.sortByAll.returns(lodashStub);
        lodashStub.slice.returns(lodashStub);
        lodashStub.value.returns(['uids']);

      });

      afterEach(function() {
        chainStub.restore();
      });

      it('should call moment with correct params', function() {
        imapInstanceStub.on.args[2][1](42);
        stubMoment.subtract.calledWith(2, 'days').should.be.ok;
      });

      it('should call imap search with correct params', function() {
        imapInstanceStub.on.args[2][1](42);
        imapInstanceStub.search.lastCall.calledWith(['UNSEEN', ['SINCE', 'date']]).should.be.ok;
      });

      it('should emit an error if search fails', function() {
        imapInstanceStub.on.args[2][1](42);
        imapInstanceStub.search.lastCall.args[1]('msg');
        eventEmitStub.lastCall.calledWith('error', 'msg').should.be.ok;
      });

      it('should call chain with correct params', function() {
        imapInstanceStub.on.args[2][1](42);
        imapInstanceStub.search.lastCall.args[1](null, 'uids');
        chainStub.lastCall.calledWith('uids').should.be.ok;
      });

      it('should call sortByAll', function() {
        imapInstanceStub.on.args[2][1](42);
        imapInstanceStub.search.lastCall.args[1](null, 'uids');
        lodashStub.sortByAll.callCount.should.eql(1);
      });

      it('should call slice with correct params', function() {
        imapInstanceStub.on.args[2][1](1);
        imapInstanceStub.search.lastCall.args[1](null, ['uids', 'uids']);
        lodashStub.slice.lastCall.calledWith(1, 2).should.be.ok;
      });

      it('should call value', function() {
        imapInstanceStub.on.args[2][1](42);
        imapInstanceStub.search.lastCall.args[1](null, 'uids');
        lodashStub.value.callCount.should.eql(1);
      });
    });

  });

  describe('fetch()', function() {

  });

});

// var
//   imapNotify = require('../lib/imap-notify'),
//   opts = {
//       user: '',
//       host: 'imap.gmail.com',
//       password: '',
//       port: 993,
//       tls: true,
//       box: 'Inbox'
//     };


// imapNotify(opts)
//   .on('error', function(err) {console.log(err);})
//   .on('mail', function(mail) {console.log(mail);});