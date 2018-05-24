const Web3 = require('web3');
const config = require('./config');
const web3 = new Web3(process.env.ETH_RPC_URL);
const request = require('request-promise-native');
const BN = require('bignumber.js');

function sendEtomicToAddress(address, amount) {
  const options = {
    method: 'POST',
    uri: process.env.ETOMIC_RPC_URL,
    body: {
      'jsonrpc': '1.0',
      'id': 'faucet',
      'method': 'sendtoaddress',
      'params': [
        address,
        amount
      ]
    },
    auth: {
      user: process.env.ETOMIC_RPC_USER,
      pass: process.env.ETOMIC_RPC_PASSWORD,
    },
    json: true
  };
  return request(options);
}

async function faucet(req, res) {
  let balance;
  if (req.body.tokenAddress) {
    const contract = new web3.eth.Contract(config.erc20Abi, req.body.tokenAddress);
    balance = new BN(await contract.methods.balanceOf(req.body.ethAddress).call());
    const decimals = await contract.methods.decimals().call();
    if (decimals < 18) {
      const multiply = new BN(10).pow(18 - decimals);
      balance = balance.times(multiply);
    }
  } else {
    balance = new BN(await web3.eth.getBalance(req.body.ethAddress));
  }

  const toSend = balance.times(3).div(4).div(new BN(10).pow(18)).toFixed(8);

  let txIds = [];
  try {
    for (let i = 0; i<3; i++) {
      txIds.push((await sendEtomicToAddress(req.body.etomicAddress, toSend)).result);
    }
    res.json({ txIds });
  } catch (e) {
    console.log(e);
    res.status(500).json({ error: 'Error occurred' });
  }
}

module.exports.faucet = faucet;
