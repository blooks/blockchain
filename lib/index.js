'use strict';

var _ = require('lodash');
var async = require('async');
var InsightClient = require('./insightClient.js');
var log = require('coyno-log').child({component: 'Blockchain Data Lib'});


function transformTransaction(insightTx, userId, sourceId) {
  if (!insightTx.vin) {
    log.error({tx: insightTx}, 'Inputs don\'t exist');
    throw new Error('Inputs don\'t exist');
  }
  else if (!insightTx.vout) {
    log.error({tx: insightTx}, 'Outputs don\'t exist');
    throw new Error('Outputs don\'t exist');
  }
  var inputs = insightTx.vin.map(function (input) {
    if (input.addr) {
      return {
        amount: input.valueSat,
        note: input.addr
      };
    } else if (input.coinbase) {//Coinbase Input
      return {
        amount: input.valueSat,
        note: 'coinbase'
      };
    } else {
      return {
        amount: input.valueSat,
        note: 'undefined'
      };
    }
  });

  var outputs = insightTx.vout.map(function (output) {
    var value = Math.round(10e7 * output.value);
    if (value > 0 && output.scriptPubKey) {
      var script = output.scriptPubKey;
      log.debug({
        script: script
      });
      return {
        amount: value,
        note: script.addresses[0]
      };
    } else if (output.coinbase) {//Coinbase Output TODO: Does this exist?
      return {
        amount: value,
        note: 'coinbase'
      };
    } else {
      return {
        amount: value,
        note: 'undefined'
      }
    }
  });

  var coynoTx = {
    foreignId: userId + insightTx.txid,
    /* jshint camelcase: false */
    date: new Date(insightTx.blocktime * 1000 || insightTx.time * 1000),
    /* jshint camelcase: true */
    details: {
      inputs: inputs,
      outputs: outputs,
      currency: 'BTC'
    },
    userId: userId,
    sourceId: sourceId
  };
  log.debug(coynoTx, 'Computed coyno style transaction');
  return coynoTx;
}





var BlockChainClient = function (userId, sourceId) {
  if (!(this instanceof BlockChainClient)) {
    return new BlockChainClient(userId, sourceId);
  }
  //Private Variables
  this.userId = userId;
  this.sourceId = sourceId;
  this.chainNode = new InsightClient('mainnet');
  this.config = {
    addressChunkSize: 100,
    maxReturnTx: 500
  };
  return this;
};


BlockChainClient.prototype.fetch = function(addresses, userId, sourceId, callback) {
    this.chainNode.getTransactions(addresses, function (err, transactions) {
      if (err) {
        log.error(err);
        return callback(err);
      }
      log.debug({count: transactions.length}, 'Received transactions from BlockChainClient');

      var coynoTransactions = _.map(transactions, function (transaction) {
        return transformTransaction(transaction, userId, sourceId);
      });

      callback(null, coynoTransactions);
    });
};

BlockChainClient.prototype.fetchTransactionsFromAddresses = function (addresses, callback) {
  var self = this;
  log.trace({addressesCount: addresses.length, sourceId: self.sourceId, userId: self.userId},
    'Fetching transactions');
  if (addresses.length === 0) {
    return callback(null, []);
  }
  if (addresses.length <= self.config.addressChunkSize) {
    log.debug('Fetching addresses:', addresses);
    self.fetch(addresses, self.userId, self.sourceId, callback);
  }
  else {
    log.trace({count: Math.ceil(addresses.length / self.config.addressChunkSize)},
      'Too many addresses. Split into separate jobs');

    var childJobs = _.range(0, addresses.length, self.config.addressChunkSize).map(function (start) {
      var end = Math.min(start + self.config.addressChunkSize, addresses.length);
      return function (callback) {
        self.fetch(addresses.slice(start, end), self.userId, self.sourceId, callback);
      }.bind(self);
    }.bind(self));

    async.parallel(childJobs, function (err, results) {
      if (err) {
        return callback(err);
      }

      var flatten = _.flatten(results);
      var unique = _.uniq(flatten, 'foreignId');

      if (flatten.length > unique.length) {
        log.trace({
          total: flatten.length,
          duplicates: flatten.length - unique.length
        }, 'Removed duplicated transactions');
      }

      callback(null, unique);
    });

  }
};


module.exports = BlockChainClient;
