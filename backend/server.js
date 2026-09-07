require('dotenv').config();

const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']); // Forces Google & Cloudflare DNS

const cors = require('cors');
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const { Server } = require('socket.io');
const alertRoutes = require('./routes/alertRoutes');
const vehicleRoutes = require('./routes/vehicleRoutes');

const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: true,
    methods: ['GET', 'POST'],
  },
});
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  req.io = io;
  next();
});
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/alerts', alertRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'QR Vehicle Alert API is running' });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
  });
});

const startServer = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    httpServer.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error.message);
    process.exit(1);
  }
};

startServer();

module.exports = app;
