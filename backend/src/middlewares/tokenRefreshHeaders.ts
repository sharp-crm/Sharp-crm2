import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './authenticate';

/**
 * Middleware to add token refresh headers to responses
 * This helps the client know when to refresh tokens
 */
export const tokenRefreshHeaders = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Only add headers for authenticated requests
  const authReq = req as AuthenticatedRequest;
  
  if (authReq.tokenInfo) {
    // Add token expiry information to response headers
    res.setHeader('X-Token-Expires-At', authReq.tokenInfo.expiresAt.toString());
    res.setHeader('X-Token-Near-Expiry', authReq.tokenInfo.nearExpiry.toString());
    
    // Add refresh recommendation
    if (authReq.tokenInfo.nearExpiry) {
      res.setHeader('X-Token-Refresh-Recommended', 'true');
    }
  }
  
  next();
};

/**
 * Middleware to add CORS headers for token management
 */
export const tokenCorsHeaders = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Add token-related headers to CORS allow list
  res.setHeader(
    'Access-Control-Expose-Headers',
    'X-Token-Expires-At, X-Token-Near-Expiry, X-Token-Refresh-Recommended'
  );
  
  next();
};
