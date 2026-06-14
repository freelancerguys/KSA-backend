import { OAuth2Client } from 'google-auth-library';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

export const verifyGoogleIdToken = async (idToken) => {
  if (!env.googleClientId) {
    throw new ApiError(503, 'Google sign-in is not configured');
  }

  try {
    const client = new OAuth2Client(env.googleClientId);
    const ticket = await client.verifyIdToken({
      idToken,
      audience: env.googleClientId,
    });
    const payload = ticket.getPayload();
    if (!payload) throw new ApiError(401, 'Invalid Google token');
    return payload;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(401, 'Google sign-in verification failed');
  }
};
