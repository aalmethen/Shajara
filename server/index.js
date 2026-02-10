require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const authRoutes = require('./routes/auth');
const treesRoutes = require('./routes/trees');
const personsRoutes = require('./routes/persons');
const spousesRoutes = require('./routes/spouses');
const membersRoutes = require('./routes/members');
const exportRoutes = require('./routes/export');
const importRoutes = require('./routes/import');
const relationshipRoutes = require('./routes/relationship');
const searchRoutes = require('./routes/search');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json({ limit: '5mb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/trees', treesRoutes);
app.use('/api/trees/:treeId/persons', personsRoutes);
app.use('/api/trees/:treeId/spouses', spousesRoutes);
app.use('/api/trees/:treeId/members', membersRoutes);
app.use('/api/trees/:treeId/export', exportRoutes);
app.use('/api/trees/:treeId/import', importRoutes);
app.use('/api/trees/:treeId/relationship', relationshipRoutes);
app.use('/api/persons', searchRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'شَجَرَة API' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'خطأ في الخادم' });
});

app.listen(PORT, () => {
  console.log(`🌳 Shajara API running on port ${PORT}`);
});

module.exports = app;
