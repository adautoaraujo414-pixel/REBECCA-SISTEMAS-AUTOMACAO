// ========================================
// REBECA - DATABASE
// ========================================

const { query, getClient, pool } = require('./connection');
const { runMigrations } = require('./migrate');
const { seedData } = require('./seed');
const repositories = require('./repositories');

module.exports = {
  query,
  getClient,
  pool,
  runMigrations,
  seedData,
  ...repositories,
};
