
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
      this.timeout(5000);
      coynochain.fetchTransactionsFromAddresses(["1HnhWpkMHMjgt167kvgcPyurMmsCQ2WPgg"], function (err, result) {
        if (err) {
          return done(err);
        }
        console.log(result.length);
        result.length.should.be.equal(37);
        done();
      });
    });
  });
});
describe('Heavy duty tests', function() {
  describe('Get Txs for gambling address', function () {
    it('should return 6323 or more transactions', function (done) {
      this.timeout(1200000);
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
