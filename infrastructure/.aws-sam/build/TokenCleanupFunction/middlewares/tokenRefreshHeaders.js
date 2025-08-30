"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tokenCorsHeaders = exports.tokenRefreshHeaders = void 0;
/**
 * Middleware to add token refresh headers to responses
 * This helps the client know when to refresh tokens
 */
const tokenRefreshHeaders = (req, res, next) => {
    // Only add headers for authenticated requests
    const authReq = req;
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
exports.tokenRefreshHeaders = tokenRefreshHeaders;
/**
 * Middleware to add CORS headers for token management
 */
const tokenCorsHeaders = (req, res, next) => {
    // Add token-related headers to CORS allow list
    res.setHeader('Access-Control-Expose-Headers', 'X-Token-Expires-At, X-Token-Near-Expiry, X-Token-Refresh-Recommended');
    next();
};
exports.tokenCorsHeaders = tokenCorsHeaders;
