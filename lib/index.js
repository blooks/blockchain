'use strict';

var _ = require('lodash');
var async = require('async');
var ChainNode = require('chain-node');
var log = require('coyno-log').child({component: 'chain'});

function transformTransaction(chainTx, userId, sourceId) {
  if (!chainTx.inputs) {
    log.error({tx: chainTx}, 'Inputs don\'t exist');
    throw new Error('Inputs don\'t exist');
  }
  else if (!chainTx.outputs) {
    log.error({tx: chainTx}, 'Outputs don\'t exist');
    throw new Error('Outputs don\'t exist');
  }
  var inputs = chainTx.inputs.map(function (input) {
    if (input.addresses) {
      return {
        amount: input.value,
        note: input.addresses[0]
      };
    } else if (input.coinbase) {//Coinbase Input
      return {
        amount: input.value,
        note: "coinbase"
      };
    } else {
      return {
        amount: input.value,
        note: "undefined"
      }
    }
  });

  var outputs = chainTx.outputs.map(function (output) {
    if (output.addresses) {
      return {
        amount: output.value,
        note: output.addresses[0]
      };
    } else if (output.coinbase) {//Coinbase Output TODO: Does this exist?
      return {
        amount: output.value,
        note: "coinbase"
      };
    } else {
      return {
        amount: output.value,
        note: "undefined"
      }
    }
  });

  return {
    foreignId: userId + chainTx.hash,
    /* jshint camelcase: false */
    date: new Date(chainTx.block_time || chainTx.chain_received_at),
    /* jshint camelcase: true */
    details: {
      inputs: inputs,
      outputs: outputs,
      currency: 'BTC'
    },
    userId: userId,
    sourceId: sourceId
  };
}





var Chain = function (userId, sourceId) {
  if (!(this instanceof Chain)) {
    return new Chain(userId, sourceId);
  }

  var chainapikey = process.env.CHAIN_API_KEY;
  var chainapisecret = process.env.CHAIN_API_SECRET;

  //Private Variables
  this.userId = userId;
  this.sourceId = sourceId;
  this.chainNode = new ChainNode({
    keyId: chainapikey,
    keySecret: chainapisecret,
    blockChain: 'bitcoin'
  });
  this.config = {
    addressChunkSize: 100,
    maxReturnTx: 500
  };
  return this;
};


Chain.prototype.fetch = function(addresses, userId, sourceId, callback) {
    this.chainNode.getAddressesTransactions(addresses, {limit: this.config.maxReturnTx}, function (err, resp) {
      if (err) {
        log.error(err);
        return callback(err);
      }

      var transactions = _.invoke(resp, function () {
        return transformTransaction(this, userId, sourceId);
      });

      log.trace({count: resp.length}, 'Received transactions from Chain');

      callback(null, transactions);
    });
};

//TODO: pagination
Chain.prototype.fetchTransactionsFromAddresses = function (addresses, callback) {
  var self = this;
  log.trace({addressesCount: addresses.length, sourceId: self.sourceId, userId: self.userId},
    'Fetching transactions');
  if (addresses.length === 0) {
    return callback(null, []);
  }
  if (addresses.length <= self.config.addressChunkSize) {
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


module.exports = Chain;
