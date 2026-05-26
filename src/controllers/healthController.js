import mongoose from 'mongoose';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { asyncHandler } from '../utils/asyncHandler.js';
import { env } from '../config/env.js';

const startedAt = Date.now();

const pkgPath = path.join(fileURLToPath(import.meta.url), '../../../package.json');
const appVersion = JSON.parse(readFileSync(pkgPath, 'utf8')).version;

const mongoStateLabel = (state) => {
  const labels = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };
  return labels[state] ?? 'unknown';
};

/** Quick liveness — API process is up (no DB check). */
export const getLive = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    status: 'ok',
    message: 'Kalyani Shooting Academy API is running',
    timestamp: new Date().toISOString(),
    data: {
      version: appVersion,
      environment: env.nodeEnv,
      uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
    },
  });
});

/** Readiness — includes MongoDB connection status. */
export const getReady = asyncHandler(async (req, res) => {
  const mongoState = mongoose.connection.readyState;
  const databaseOk = mongoState === 1;

  res.status(databaseOk ? 200 : 503).json({
    success: databaseOk,
    status: databaseOk ? 'ok' : 'degraded',
    message: databaseOk ? 'All systems operational' : 'Database unavailable',
    timestamp: new Date().toISOString(),
    data: {
      version: appVersion,
      environment: env.nodeEnv,
      uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
      checks: {
        api: 'ok',
        database: databaseOk ? 'ok' : 'down',
      },
      database: {
        state: mongoStateLabel(mongoState),
        name: mongoose.connection.name || null,
      },
    },
  });
});
