'use strict'

var bitcore = require('bitcore-lib')
var async = require('async')
var log = require('@blooks/log').child({component: 'Insight Client'})
var request = require('request')
var _ = require('lodash')

const transactionsPerQuery = 50

class InsightClient {
  constructor (network) {
    if (network === 'testnet') {
      this.network = bitcore.Networks.testnet
    } else {
      this.network = bitcore.Networks.mainnet
    }
    this.insightNetworkString = ''
    if (this.network === bitcore.Networks.testnet) {
      this.insightNetworkString = 'test-'
    }
  }

  _getTransactionsPage (address, page, callback) {
    var queryString = 'https://' + this.insightNetworkString + 'insight.bitpay.com/api/addrs/' + address + '/txs?from=' +
    Math.round(page * transactionsPerQuery) + '&to=' + Math.round((page + 1) * transactionsPerQuery )
    log.debug({queryString: queryString}, 'Fetching transactions from insight api.')
    request({
      url: queryString,
      json: true
    }, function (err, resp, body) {
      if (err) {
        return callback(err)
      }
      if (resp.statusCode !== 200) {
        log.error('Got an error from insight api.', {
          error: body
        })
        return callback(new Error('Something went wrong. Statuscode: ' + resp.statusCode))
      }
      return callback(null, body.items)
    })
  }

  getTransactions (address, callback) {
    var self = this
    var queryString = 'https://' + this.insightNetworkString + 'insight.bitpay.com/api/addrs/' + address + '/txs'
    log.debug({queryString: queryString}, 'Fetching transactions from insight api.')
    request({
      url: queryString,
      json: true
    }, function (error, response, body) {
      // error
      if (error) {
        return callback(error)
      }
      if (response.statusCode !== 200) {
        log.error('Got an error from insight api.', {
          error: body
        })
        return callback(new Error('Something went wrong.' + response.statusCode))
      }
      var transactions = body.items
      var numPages = Math.ceil(body.totalItems / transactionsPerQuery)
      if (body.totalItems === body.items.length) {
        return callback(null, transactions)
      }
      async.timesLimit(
        numPages,
        1,
        (page, callback) => {
          function singleApiCall (callback) {
            self._getTransactionsPage(address, page, (err, pageTransactions) => {
              if (err) {
                return callback(err)
              }
              log.trace({
                transactionsPerPage: pageTransactions.length
              })
              return callback(null, pageTransactions)
            })
          }
          async.retry(10, singleApiCall, callback)
        },
        (err, results) => {
          if (err) {
            return callback(err)
          }
          transactions = _.flatten(results)
          log.trace({
            transactions: transactions,
            address: address
          }, 'Got transactions for address')
          callback(null, transactions)
        })
    })
  }
}

module.exports = InsightClient
