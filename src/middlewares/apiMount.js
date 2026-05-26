import { csrfProtection } from './csrf.js';
import routes from '../routes/index.js';

/** Shared API stack — mounted at /api and at root (when Nginx strips the /api prefix). */
export const apiStack = [csrfProtection, routes];
