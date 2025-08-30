"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const smtpAuthService_1 = __importDefault(require("../services/smtpAuthService"));
const router = express_1.default.Router();
const smtpAuthService = new smtpAuthService_1.default();
// SMTP Login route
router.post('/login', async (req, res) => {
    try {
        const { email, password, userId } = req.body;
        // Validate required fields
        if (!email || !password || !userId) {
            res.status(400).json({
                success: false,
                error: 'Email, password, and userId are required',
            });
            return;
        }
        // Verify SMTP credentials
        const result = await smtpAuthService.verifySmtpLogin(email, password);
        if (result.success) {
            // Get session details for response
            const session = await smtpAuthService.getSmtpSession(result.sessionId);
            res.json({
                success: true,
                sessionId: result.sessionId,
                smtpInfo: result.smtpInfo,
                expiresAt: session?.expiresAt,
                message: 'SMTP authentication successful',
            });
        }
        else {
            res.status(401).json({
                success: false,
                error: result.error || 'SMTP authentication failed',
            });
        }
    }
    catch (error) {
        console.error('❌ SMTP login failed:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to process SMTP login',
        });
    }
});
// Session verification route
router.post('/verify', async (req, res) => {
    try {
        const { sessionId } = req.body;
        if (!sessionId) {
            res.status(400).json({
                success: false,
                error: 'Session ID is required',
            });
            return;
        }
        const session = await smtpAuthService.getSmtpSession(sessionId);
        if (session) {
            res.json({
                success: true,
                sessionId,
                email: session.email,
                host: session.host,
                port: session.port,
                secure: session.secure,
                expiresAt: session.expiresAt,
                createdAt: session.createdAt,
            });
        }
        else {
            res.status(404).json({
                success: false,
                error: 'Session not found or expired',
            });
        }
    }
    catch (error) {
        console.error('❌ Session verification failed:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to verify session',
        });
    }
});
// Session logout route
router.post('/logout', async (req, res) => {
    try {
        const { sessionId } = req.body;
        if (!sessionId) {
            res.status(400).json({
                success: false,
                error: 'Session ID is required',
            });
            return;
        }
        await smtpAuthService.deleteSmtpSession(sessionId);
        res.json({
            success: true,
            message: 'Session logged out successfully',
        });
    }
    catch (error) {
        console.error('❌ Session logout failed:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to logout session',
        });
    }
});
// Session extension route
router.post('/extend', async (req, res) => {
    try {
        const { sessionId } = req.body;
        if (!sessionId) {
            res.status(400).json({
                success: false,
                error: 'Session ID is required',
            });
            return;
        }
        const extended = await smtpAuthService.extendSession(sessionId);
        if (extended) {
            const session = await smtpAuthService.getSmtpSession(sessionId);
            res.json({
                success: true,
                message: 'Session extended successfully',
                expiresAt: session?.expiresAt,
            });
        }
        else {
            res.status(404).json({
                success: false,
                error: 'Session not found or could not be extended',
            });
        }
    }
    catch (error) {
        console.error('❌ Session extension failed:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to extend session',
        });
    }
});
exports.default = router;
