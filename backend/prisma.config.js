const path = require('node:path');
require('dotenv/config');

module.exports = {
  schema: path.join('prisma', 'schema.prisma'),
  datasource: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/cctv_dev_db',
  },
};
