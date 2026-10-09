'use strict';

const http = require('http');
const app = require('./app');
const env = require('./config/env');
const { initSockets } = require('./sockets');
const db = require('./config/db');

// ANSI colors — safe in Windows Terminal / VS Code terminal.
const c = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function line() {
  console.log(`${c.dim}${'='.repeat(60)}${c.reset}`);
}

function printBanner(port) {
  line();
  console.log(
    `${c.magenta}${c.bold}  🧳  SafarSplit — Safar bhi, hisaab bhi${c.reset}`
  );
  console.log(`${c.dim}  Collaborative trip planner & expense splitter${c.reset}`);
  line();
  console.log(`${c.cyan}🌐  Server       :${c.reset} http://localhost:${port}`);
  console.log(
    `${c.cyan}⚙️   Environment  :${c.reset} ${
      env.NODE_ENV === 'production' ? c.red + 'production' : c.green + env.NODE_ENV
    }${c.reset}`
  );
  console.log(
    `${c.cyan}🤖  AI provider  :${c.reset} ${env.AI_PROVIDER} (${env.AI_MODEL})`
  );
  console.log(
    `${c.cyan}🔌  Socket.io    :${c.reset} enabled (path: /socket.io)`
  );
  console.log(`${c.cyan}📁  Uploads dir  :${c.reset} ${env.UPLOAD_DIR}`);
  line();
}

function printDbOk(timestamp) {
  console.log(
    `${c.green}✅  Database connected at:${c.reset} ${c.dim}${timestamp}${c.reset}`
  );
}

function printDbFail(err) {
  console.log(`${c.red}❌  Database connection FAILED${c.reset}`);
  console.log(`${c.red}    ${err.message}${c.reset}`);
}

async function start() {
  const timestamp = new Date().toISOString();
  try {
    await db.query('SELECT 1');
    printDbOk(timestamp);
  } catch (err) {
    printDbFail(err);
    process.exit(1);
  }

  const server = http.createServer(app);
  initSockets(server);

  server.listen(env.PORT, () => {
    printBanner(env.PORT);
    console.log(
      `${c.green}🚀  SafarSplit is ready. Try:${c.reset} ${c.dim}curl http://localhost:${env.PORT}/api/v1/health${c.reset}`
    );
    line();
  });

  const shutdown = (signal) => {
    console.log(`\n${c.yellow}⚠️   ${signal} received, shutting down...${c.reset}`);
    server.close(() => {
      db.pool.end().finally(() => {
        console.log(`${c.green}👋  Bye.${c.reset}`);
        process.exit(0);
      });
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start().catch((err) => {
  console.error(`${c.red}[safarsplit] fatal startup error${c.reset}`, err);
  process.exit(1);
});