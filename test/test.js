'use strict'

var log = require('debug')('block-chain:test'),
  util = require('util')

require('should')

var BlooksBlockChainClient = require('../index.js')
var blockchain = new BlooksBlockChainClient('userId', 'sourceId')

// if test function expects second named argument it will be executed
// in async mode and test will be complete only after callback is called
describe('Simple tests', function () {
  describe('Getting Txs for an address', function () {
    it('should return transactions', function (done) {
      this.timeout(5000)
      blockchain.fetchTransactionsFromAddresses(['1HnhWpkMHMjgt167kvgcPyurMmsCQ2WPgg'], function (err, result) {
        if (err) {
          return done(err)
        }
        console.log(result.length)
        result.length.should.be.equal(37)
        done()
      })
    })
  })
})
describe('Heavy duty tests', function () {
  describe('Get Txs for gambling address', function () {
    it('should return 970 or more transactions', function (done) {
      this.timeout(1200000)
      blockchain.fetchTransactionsFromAddresses(['1F1tAaz5x1HUXrCNLbtMDqcw6o5GNn4xqX'], function (err, result) {
        if (err) {
          return done(err)
        }
        log('data: ' + util.inspect(result, null, 5))
        result.length.should.be.above(970)
        done()
      })
    })
  })
})
