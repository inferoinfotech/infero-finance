const express = require('express');
const morgan = require('morgan');
const helmet = require('helmet');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const accountsRoutes = require('./routes/accounts');
const platformsRoutes = require('./routes/platforms');
const projectsRoutes = require('./routes/projects');
const projectPaymentsRoutes = require('./routes/projectPayments');
const hourlyWorkRoutes = require('./routes/hourlyWork');
const expensesRoutes = require('./routes/expenses');
const historyRoutes = require('./routes/history');
const notificationsRoutes = require('./routes/notifications');
const summaryRoutes = require('./routes/summary');
const expenseReportsRoutes = require('./routes/expenseReports');
const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Example test route
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// TODO: Add routes
app.use('/api/auth', authRoutes);
app.use('/api/accounts', accountsRoutes);
app.use('/api/platforms', platformsRoutes);
app.use('/api/projects', projectsRoutes);
app.use('/api/project-payments', projectPaymentsRoutes);
app.use('/api/hourly-work', hourlyWorkRoutes);
app.use('/api/expenses', expensesRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/summary', summaryRoutes);
app.use('/api/expense-reports', expenseReportsRoutes);
app.use('/api/reports', require('./routes/report'));

// Global error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

module.exports = app;
