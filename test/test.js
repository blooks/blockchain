
'use strict';

var log = require('debug')('coyno-chain:test'),
  util = require('util');

require('should');

var CoynoBlockChainClient = require('../index.js');
var coynochain = new CoynoBlockChainClient("userId", "sourceId");

// if test function expects second named argument it will be executed
// in async mode and test will be complete only after callback is called
describe('Simple tests', function() {
  describe('Getting Txs for an address', function () {
    it('should return transactions', function (done) {
      coynochain.fetchTransactionsFromAddresses(["1HnhWpkMHMjgt167kvgcPyurMmsCQ2WPgg"], function (err, result) {
        if (err) {
          return done(err);
        }
        log('data: ' + util.inspect(result, null, 5));
        result.length.should.be.above(0);
        done();
      });
    });
  });
});
describe('Heavy duty tests', function() {
  describe.skip('Get Txs for gambling address', function () {
    it('should return 6323 or more transactions', function (done) {
      this.timeout(120000);
      coynochain.fetchTransactionsFromAddresses(["1changePZFvbZivGRy31NNJ21Xf5tPGuV"], function (err, result) {
        if (err) {
          return done(err);
        }
        log('data: ' + util.inspect(result, null, 5));
        result.length.should.be.above(6323);
        done();
      });
    });
  });
});
