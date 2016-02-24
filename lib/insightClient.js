'use strict';

var bitcore = require('bitcore-lib');
var async = require('async');
var log = require('coyno-log').child({component: 'Insight Client'});
var request = require('request');
var _ = require('lodash');

const transactionsPerQuery = 500;

class InsightClient {
  constructor(network) {
    if (network === 'testnet') {
      this.network = bitcore.Networks.testnet;
    } else {
      this.network = bitcore.Networks.mainnet;
    }
    this.insightNetworkString = '';
    if (this.network === bitcore.Networks.testnet) {
      this.insightNetworkString = "-testnet";
    }
  }

  _getTransactionsPage(address, page, callback) {
    var queryString = 'https://insight' + this.insightNetworkString + '.satoshipay.io/insight-api/addrs/' + address + '/txs?from=' +
      Math.round(page * transactionsPerQuery + 1) + '&to=' + Math.round((page + 1) * transactionsPerQuery);
    log.debug({queryString: queryString}, 'Fetching transactions from insight api.');
    request({
      url: queryString,
      json: true
    }, function(err, resp, body) {
      if (err) {
        return callback(err);
      }
      if (resp.statusCode !== 200) {
        return callback(new Error('Something went wrong. Statuscode: ' + resp.statusCode));
      }
      return callback(null, body.items);
    })
  }

  getTransactions(address, callback) {
    var self = this;
    var queryString = 'https://insight' + this.insightNetworkString + '.satoshipay.io/insight-api/addrs/' + address + '/txs?from=0&to=' + transactionsPerQuery;
    log.debug({queryString: queryString}, 'Fetching transactions from insight api.');
    request({
      url: queryString,
      json: true
    }, function (error, response, body) {
      // error
      if (error) {
        return callback(error);
      }
      if (response.statusCode !== 200) {
        return callback(new Error('Something went wrong.' + response.statusCode));
      }
      var page = 1;
      var transactions = body.items;
      async.whilst(
         () => {
          return (page * transactionsPerQuery < body.totalItems);
        },
         (callback) => {
          self._getTransactionsPage(address, page, function(err, pageTransactions) {
            if (err) {
              return callback(err);
            }
            ++page;
            transactions = transactions.concat(pageTransactions);
            return callback();
          });
        },
         (err) => {
           if (err) {
             return callback(err);
           }
          log.trace({
            transactions: transactions,
            address: address
          }, 'Got transactions for address');
          callback(null, transactions);
        });
    });
  }
}

module.exports = InsightClient;
