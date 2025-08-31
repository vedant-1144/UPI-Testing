const express = require('express');
const app = express();
const transactionRoutes = require('./routes/transactions');

app.use(express.json());
app.use(express.static('public'));

// API Routes
app.use('/api', transactionRoutes);

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});