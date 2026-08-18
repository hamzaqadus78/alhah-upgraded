const { PrismaClient } = require('@prisma/client');

// Reuse a single client across the process (avoids exhausting DB connections
// under nodemon hot-reload / serverless cold starts).
const prisma = global.__prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') global.__prisma = prisma;

module.exports = prisma;
