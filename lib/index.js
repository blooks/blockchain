'use strict';

var _ = require('lodash');
var async = require('async');
var ChainNode = require('chain-node');
var config = require('coyno-config').apis.chain;
var log = require('coyno-log').child({component: 'chain'});


var api = new ChainNode({
  keyId: config.keyId,
  keySecret: config.keySecret,
  blockChain: 'bitcoin'
});


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
    return {
      amount: input.value,
      note: input.addresses[0]
    };
  });

  var outputs = chainTx.outputs.map(function (output) {
    return {
      amount: output.value,
      note: output.addresses[0]
    };
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


function fetch(addresses, userId, sourceId, callback) {
  api.getAddressesTransactions(addresses, {limit: config.maxReturnTx}, function (err, resp) {
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
}


var Chain = function (userId, sourceId) {
  if (!(this instanceof Chain)) {
    return new Chain(userId, sourceId);
  }

  this.userId = userId;
  this.sourceId = sourceId;

  return this;
};

//TODO: pagination
Chain.prototype.fetchTransactionsFromAddresses = function (addresses, callback) {
  log.trace({addressesCount: addresses.length, sourceId: this.sourceId, userId: this.userId},
    'Fetching transactions');

  if (addresses.length <= config.addressChunkSize) {
    fetch(addresses, this.userId, this.sourceId, callback);
  }
  else {
    log.trace({count: Math.ceil(addresses.length / config.addressChunkSize)},
      'Too many addresses. Split into separate jobs');

    var childJobs = _.range(0, addresses.length, config.addressChunkSize).map(function (start) {
      var end = Math.min(start + config.addressChunkSize, addresses.length);
      return function (callback) {
        fetch(addresses.slice(start, end), this.userId, this.sourceId, callback);
      }.bind(this);
    }.bind(this));

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
