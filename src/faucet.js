const request = require('request-promise-native');
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

async function faucet(req, res) {
  try {
    const toSend = 100;
    const etomicBalanceObject = await getEtomicBalance(req.body.etomicAddress);
    const requiredEtomic = toSend - (etomicBalanceObject.confirmed + etomicBalanceObject.unconfirmed) / 100000000;

    let txIds = [];
    let etomicPart = (requiredEtomic / 3).toFixed(8);
    if (etomicPart >= 10) {
      for (let i = 0; i < 3; i++) {
        txIds.push((await sendEtomicToAddress(req.body.etomicAddress, etomicPart)).result);
      }
      res.json({result: txIds});
    } else {
      res.json({result: "Address already has enough ETOMIC"});
    }
  } catch (e) {
    console.log(e);
    res.status(500).json({ error: 'Error occurred' });
  }
}

module.exports.faucet = faucet;
