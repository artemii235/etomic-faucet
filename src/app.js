const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const faucet = require('./faucet');

app.use(bodyParser.json());

app.post('/getEtomic', faucet.faucet);

app.listen(process.env.PORT, function() {
  console.log(`Etomic faucet listening on port ${ process.env.PORT }!`);
});

app.use(function(req, res, next) {
  res.status(404).json({error: 'Route is not found!'});
});
