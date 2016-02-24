'use strict';

var bitcore = require('bitcore-lib');
var async = require('async');
var log = require('coyno-log').child({component: 'Insight Client'});
var request = require('request');
var _ = require('lodash');


class InsightClient {
  constructor (network) {
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
  getTransactions (address, callback) {
    var queryString = 'https://insight' + this.insightNetworkString + '.satoshipay.io/insight-api/txs/?address='+ address;
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
      var transactions = body.txs;
      log.trace({
        transactions: transactions,
          address: address
      }, 'Got transactions for address');
      callback(null, transactions);
    });
  };
}

module.exports = InsightClient;
