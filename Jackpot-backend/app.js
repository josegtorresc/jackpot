const express = require('express');
const app = express();
const PORT = process.env.PORT || 5000;
const httpServer = require('http').createServer(app);
const io = require('socket.io')(httpServer, {
  cors: {
    origin: 'http://localhost:3001',
    methods: ['GET', 'POST'],
  },
});

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

app.use(express.json());

let jackpots = {
  oro: {
    amount: 1000,
    triggerAmount: 100,
    maxAmount: 1200,
    active: false,
    contributions: 0,
  },
  plata: {
    amount: 750,
    triggerAmount: 75,
    maxAmount: 1000,
    active: false,
    contributions: 0,
  },
  bronce: {
    amount: 500,
    triggerAmount: 50,
    maxAmount: 750,
    active: false,
    contributions: 0,
  },
};

app.get('/api/jackpot/:type', (req, res) => {
  const { type } = req.params;
  const jackpot = jackpots[type];
  res.json({ jackpotAmount: parseFloat(jackpot.amount).toFixed(2) });
});

app.post('/api/spin/:type', (req, res) => {
  const { type } = req.params;
  const { amount } = req.body;
  const jackpot = jackpots[type];

  if (
    !jackpot.active &&
    parseFloat(jackpot.amount) + parseFloat(amount) >= jackpot.triggerAmount
  ) {
    jackpot.active = true;
    res.json({
      amountWon: '0.00',
      jackpotAmount: parseFloat(jackpot.amount).toFixed(2),
      inJackpot: true,
      wonJackpot: false,
    });
    return;
  }

  if (jackpot.active) {
    let amountWon = '0.00';
    if (parseFloat(jackpot.amount) >= jackpot.maxAmount) {
      amountWon = parseFloat(jackpot.amount).toFixed(2);
      jackpot.amount = jackpots[type].amount;
      jackpot.active = false;
      io.emit('jackpot-won', { type, amountWon }); // Emitir señal de jackpot ganado
    } else {
      const minPrize = 10;
      const maxPrize = 15.5;
      amountWon = (Math.random() * (maxPrize - minPrize) + minPrize).toFixed(1);
      jackpot.amount = (
        parseFloat(jackpot.amount) + parseFloat(amountWon)
      ).toFixed(2);
      jackpot.contributions++;
    }

    res.json({
      amountWon,
      jackpotAmount: parseFloat(jackpot.amount).toFixed(2),
      inJackpot: jackpot.active,
      wonJackpot: amountWon === jackpot.maxAmount.toFixed(2),
    });
  } else {
    const minPrize = 10;
    const maxPrize = 15.5;
    let amountWon = (Math.random() * (maxPrize - minPrize) + minPrize).toFixed(
      1,
    );
    jackpot.amount = (
      parseFloat(jackpot.amount) + parseFloat(amountWon)
    ).toFixed(2);

    res.json({
      amountWon,
      jackpotAmount: parseFloat(jackpot.amount).toFixed(2),
      inJackpot: jackpot.active,
      wonJackpot: false,
    });
  }
});

app.post('/api/resetJackpot/:type', (req, res) => {
  const { type } = req.params;
  jackpots[type].amount = jackpots[type].initialAmount;
  jackpots[type].active = false;
  jackpots[type].contributions = 0;
  res.json({ message: `${type} Jackpot reset successfully` });
});

httpServer.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});
