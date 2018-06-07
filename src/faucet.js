const Web3 = require('web3');
const config = require('./config');
const web3 = new Web3(process.env.ETH_RPC_URL);
const request = require('request-promise-native');
const BN = require('bignumber.js');
const ElectrumCli = require('electrum-client');

async function getEtomicBalance(address) {
  const ecl = new ElectrumCli(10025, 'electrum2.cipig.net', 'tcp');
  await ecl.connect();
  const balance = await ecl.blockchainAddress_getBalance(address);
  await ecl.close();
  return balance;
}

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

function ethplorerAddrInfo(address) {
  const options = {
    method: 'GET',
    uri: `https://api.ethplorer.io/getAddressInfo/${ address }?apiKey=freekey`,
    json: true
  };
  return request(options);
}

async function faucet(req, res) {
  try {
    let addrInfo = await ethplorerAddrInfo(req.body.ethAddress);
    let totalBalance = new BN(web3.utils.toWei(addrInfo.ETH.balance.toString()));
    for (let token of addrInfo.tokens) {
      let tokenBalance = new BN(token.balance);
      if (tokenBalance.gt(0)) {
        let decimals = Number(token.tokenInfo.decimals);
        if (decimals < 18) {
          const multiply = new BN(10).pow(18 - decimals);
          tokenBalance = tokenBalance.times(multiply);
        }
        totalBalance = totalBalance.plus(tokenBalance);
      }
    }

    const toSend = totalBalance.times(9).div(4).div(new BN(10).pow(18));
    const etomicBalanceObject = await getEtomicBalance(req.body.etomicAddress);
    const requiredEtomic = toSend - (etomicBalanceObject.confirmed + etomicBalanceObject.unconfirmed) / 100000000;

    let txIds = [];
    let etomicPart = (requiredEtomic / 3).toFixed(8);
    if (etomicPart > 0) {
      for (let i = 0; i < 3; i++) {
        txIds.push((await sendEtomicToAddress(req.body.etomicAddress, etomicPart)).result);
      }
      res.json({result: txIds});
    } else {
      res.json({result: "ETH/ERC20 balance is zero or address already has enough ETOMIC"});
    }
  } catch (e) {
    console.log(e);
    res.status(500).json({ error: 'Error occurred' });
  }
}

module.exports.faucet = faucet;
