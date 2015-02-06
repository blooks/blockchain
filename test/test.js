
'use strict';

var log = require('debug')('coyno-chain:test'),
  util = require('util');

require('should');

var CoynoChain = require('../index.js');
var coynochain = new CoynoChain("userId", "sourceId");

// if test function expects second named argument it will be executed
// in async mode and test will be complete only after callback is called
describe('coynochain.fetchTransactionsFromAddresses', function() {
  it('should return transactions', function(done) {
  coynochain.fetchTransactionsFromAddresses(["1HnhWpkMHMjgt167kvgcPyurMmsCQ2WPgg"], function (err, result) {
    if (err) {
      return done(err);
    }
    log('data: ' + util.inspect(result, null, 5));
    result.length.should.be.above(0);
    done();
    });
  })
});
