import { isIpBlocked } from '../services/securityService.js';
import { getClientIp } from '../services/securityService.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const ipBlocker = asyncHandler(async (req, res, next) => {
  const ip = getClientIp(req);
  if (isIpBlocked(ip)) {
    throw new ApiError(403, 'Access temporarily blocked due to suspicious activity');
  }
  next();
});
