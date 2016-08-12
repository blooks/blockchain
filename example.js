var CoynoChain = require('./index')

var coynochain = new CoynoChain('ddd', 'ddd')

coynochain.fetchTransactionsFromAddresses(['1HnhWpkMHMjgt167kvgcPyurMmsCQ2WPgg'], function (err, result) {
  if (err) {
    console.log(err)
  } else {
    console.log(result)
  }
})
