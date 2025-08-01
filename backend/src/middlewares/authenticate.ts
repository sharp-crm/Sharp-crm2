import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { docClient, TABLES } from "../services/dynamoClient";
import { 
  verifyAccessToken, 
  isTokenNearExpiry, 
  validateTokenStructure,
  cleanupExpiredTokens 
} from "../utils/tokenUtils";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    tenantId: string;
    isDeleted?: boolean;
  };
  tokenInfo?: {
    nearExpiry: boolean;
    expiresAt: number;
  };
}

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  console.log(`🔍 [authenticate] Starting authentication for path: ${req.path}`);
  console.log(`🔍 [authenticate] Request headers:`, req.headers);
  
  const token = req.headers.authorization?.split(" ")[1];
  
  if (!token) {
    console.log(`❌ [authenticate] No token provided`);
    res.status(401).json({ error: "No token provided" });
    return;
  }

  try {
    // Validate token structure
    const validation = validateTokenStructure(token);
    if (!validation.valid) {
      res.status(403).json({ error: "Invalid token structure" });
      return;
    }

    const nearExpiry = isTokenNearExpiry(token);

    try {
      const decoded = verifyAccessToken(token);

      // Optionally verify user still exists and is not deleted
      try {
        const userResult = await docClient.send(
          new GetCommand({
            TableName: TABLES.USERS,
            Key: { email: decoded.email }
          })
        );

        if (!userResult.Item) {
          res.status(401).json({ error: "User not found" });
          return;
        }

        if (userResult.Item.isDeleted) {
          res.status(401).json({ error: "User account has been Soft Deleted" });
          return;
        }

        // Update user context with latest data
        const userData = {
          userId: userResult.Item.userId,
          email: userResult.Item.email,
          firstName: userResult.Item.firstName || '',
          lastName: userResult.Item.lastName || '',
          role: userResult.Item.role || 'SALES_REP',
          tenantId: userResult.Item.tenantId || 'DEFAULT_TENANT',
          isDeleted: userResult.Item.isDeleted || false
        };
        
        (req as AuthenticatedRequest).user = userData;
        
        console.log(`✅ [authenticate] User authenticated successfully:`, userData);
        
        // Also attach token expiry info
        (req as AuthenticatedRequest).tokenInfo = {
          nearExpiry,
          expiresAt: validation.payload?.exp ? validation.payload.exp * 1000 : 0
        };

      } catch (dbError) {
        // If DB check fails, fall back to token data but log the error
        console.warn("Failed to verify user in database:", dbError);
        (req as any).user = decoded;
        (req as any).tokenInfo = {
          nearExpiry,
          expiresAt: validation.payload?.exp ? validation.payload.exp * 1000 : 0
        };
      }
      
      next();
    } catch (error) {
      res.status(403).json({ error: "Invalid token" });
      return;
    }
  } catch (error) {
    res.status(403).json({ error: "Invalid token" });
    return;
  }
};