import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from "../services/dynamoClient";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    tenantId?: string;
    isDeleted?: boolean;
  };
}

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(" ")[1];
  
  if (!token) {
    res.status(401).json({ error: "No token provided" });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    // Optionally verify user still exists and is not deleted
    try {
      const userResult = await docClient.send(
        new GetCommand({
          TableName: "Users",
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
      (req as AuthenticatedRequest).user = {
        userId: userResult.Item.userId,
        email: userResult.Item.email,
        firstName: userResult.Item.firstName || '',
        lastName: userResult.Item.lastName || '',
        role: userResult.Item.role || 'SALES_REP',
        tenantId: userResult.Item.tenantId,
        isDeleted: userResult.Item.isDeleted || false
      };
    } catch (dbError) {
      // If DB check fails, fall back to token data but log the error
      console.warn("Failed to verify user in database:", dbError);
      (req as any).user = decoded;
    }
    
    next();
  } catch (error) {
    res.status(403).json({ error: "Invalid token" });
    return;
  }
};