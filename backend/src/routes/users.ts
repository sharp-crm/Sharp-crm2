import express from "express";
import { PutCommand, GetCommand, ScanCommand, UpdateCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { docClient, TABLES } from "../services/dynamoClient";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { createError } from "../middlewares/errorHandler";
import multer from 'multer';
import { authenticate } from '../middlewares/authenticate';
import { uploadToS3 } from '../services/s3Service';
import { DynamoDBClient, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { uploadToLocal } from '../services/localStorageService';
import { requirePermission, requireCreatePermission, requireEditPermission, requireDeletePermission } from '../middlewares/rbac';
import { checkPermission } from '../utils/rbac';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

const dynamoClient = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

// Upload profile image
router.post('/profile-image', authenticate as express.RequestHandler, upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) {
      throw createError('No file uploaded', 400);
    }

    const imageUrl = await uploadToS3(req.file);
    const currentUser = (req as any).user;

    // Update user profile with new image URL
    await docClient.send(
      new UpdateCommand({
        TableName: TABLES.USERS,
        Key: {
          userId: currentUser.userId
        },
        UpdateExpression: "SET profileImage = :imageUrl",
        ExpressionAttributeValues: {
          ":imageUrl": imageUrl
        },
        ReturnValues: "ALL_NEW"
      })
    );

    res.json({ imageUrl });
  } catch (error) {
    next(error);
  }
});

// Helper function to check if a string is a UUID
const isUUID = (str: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

// Helper function to normalize role string - Use consistent role names
function normalizeRole(role: string): 'ADMIN' | 'SALES_MANAGER' | 'SALES_REP' {
  const normalized = role.toUpperCase();
  if (normalized === 'ADMIN' || normalized === 'SUPER_ADMIN') return 'ADMIN';
  if (normalized === 'SALES_MANAGER' || normalized === 'MANAGER') return 'SALES_MANAGER';
  if (normalized === 'SALES_REP' || normalized === 'REP') return 'SALES_REP';
  return 'SALES_REP'; // Default to SALES_REP
}

// Helper function to get reporting reps for a manager
async function getReportingReps(managerId: string) {
  try {
    const result = await docClient.send(
      new ScanCommand({
        TableName: TABLES.USERS,
        FilterExpression: 'reportingTo = :managerId AND (#role = :originalRole OR #role = :normalizedRole) AND isDeleted = :isDeleted',
        ExpressionAttributeNames: {
          '#role': 'role'
        },
        ExpressionAttributeValues: {
          ':managerId': managerId,
          ':originalRole': 'SALES_REP',
          ':normalizedRole': 'SALES_REP',
          ':isDeleted': false
        }
      })
    );

    return (result.Items || []).map(item => ({
      userId: item.userId,
      email: item.email,
      firstName: item.firstName || '',
      lastName: item.lastName || '',
      role: normalizeRole(item.role),
      tenantId: item.tenantId,
      reportingTo: item.reportingTo,
      createdBy: item.createdBy,
      isDeleted: item.isDeleted
    }));
  } catch (error) {
    console.error('Error getting reporting reps:', error);
    return [];
  }
}

// Get managers for reporting hierarchy
router.get("/managers", authenticate, requirePermission('view', 'user'), async (req: any, res, next) => {
  try {
    const currentUser = req.user;
    if (!currentUser) {
      throw createError("User not found in token", 401);
    }

    // Only admins can access managers
    if (!['ADMIN'].includes(currentUser.role?.toUpperCase() || '')) {
      throw createError("Access denied. Admin role required.", 403);
    }

    // Get all sales managers in the same tenant
    // Check both original role and normalized role for flexibility
    const result = await docClient.send(
      new ScanCommand({
        TableName: TABLES.USERS,
        FilterExpression: "tenantId = :tenantId AND (#role = :originalRole OR #role = :normalizedRole OR #role = :managerRole) AND isDeleted = :isDeleted",
        ExpressionAttributeNames: {
          "#role": "role"
        },
        ExpressionAttributeValues: {
          ":tenantId": currentUser.tenantId,
          ":originalRole": "SALES_MANAGER",
          ":normalizedRole": "SALES_MANAGER",
          ":managerRole": "MANAGER",
          ":isDeleted": false
        }
      })
    );

    const managers = (result.Items || []).map(user => ({
      id: user.userId,
      userId: user.userId,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      email: user.email,
      role: user.role
    }));

    res.json({ data: managers });
  } catch (error) {
    next(error);
  }
});


// Get all users for the same tenant (hierarchical)
router.get("/tenant-users", authenticate, requirePermission('view', 'user'), async (req: any, res, next) => {
  try {
    const currentUser = req.user;
    if (!currentUser) {
      throw createError("User not found in token", 401);
    }

    // Scan all users
    const result = await docClient.send(
      new ScanCommand({
        TableName: TABLES.USERS
      })
    );

    let users = result.Items || [];

    // Filter out deleted users first
    users = users.filter(user => !user.isDeleted);

    // User filtering logic based on RBAC requirements
    if (currentUser.role.toUpperCase() === 'ADMIN') {
      // Admin sees all users in their tenant
      users = users.filter(user => 
        user.tenantId === currentUser.tenantId
      );
    } else if (currentUser.role.toUpperCase() === 'SALES_MANAGER') {
      // Manager sees themselves and their reporting reps
      const reportingReps = await getReportingReps(currentUser.userId);
      const repIds = reportingReps.map(rep => rep.userId);
      users = users.filter(user => 
        user.userId === currentUser.userId || 
        repIds.includes(user.userId)
      );
    } else {
      // Rep only sees themselves
      users = users.filter(user => 
        user.userId === currentUser.userId
      );
    }

    const mappedUsers = users.map(user => ({
      id: user.userId,
      userId: user.userId,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      email: user.email,
      role: normalizeRole(user.role),
      originalRole: user.role, // Keep the original role for display
      tenantId: user.tenantId,
      createdBy: user.createdBy,
      reportingTo: user.reportingTo,
      isDeleted: user.isDeleted || false,
      createdAt: user.createdAt,
      phoneNumber: user.phoneNumber
    }));

    res.json({ data: mappedUsers });
  } catch (error) {
    next(error);
  }
});

// Special endpoint for SUPER_ADMIN to get all users (bypasses RBAC middleware)
router.get("/super-admin/all", authenticate, async (req: any, res, next) => {
  try {
    const userRole = req.user?.role;
    const userOriginalRole = req.user?.originalRole;
    
    console.log('🔍 Debug - /super-admin/all endpoint - User details:', {
      userId: req.user?.userId,
      role: userRole,
      originalRole: userOriginalRole,
      tenantId: req.user?.tenantId
    });
    
    // Only allow SUPER_ADMIN users
    if (userOriginalRole?.toUpperCase() !== 'SUPER_ADMIN') {
      console.log('🔍 Debug - Access denied for user (not SUPER_ADMIN):', req.user?.userId);
      throw createError("Access denied. SUPER_ADMIN role required.", 403);
    }
    
    // Scan all users from the database
    const result = await docClient.send(
      new ScanCommand({
        TableName: TABLES.USERS
      })
    );
    
    let users = result.Items || [];
    
    // Filter out deleted users
    users = users.filter(user => !user.isDeleted);
    
    const mappedUsers = users.map(user => ({
      id: user.userId,
      userId: user.userId,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      email: user.email,
      role: normalizeRole(user.role),
      originalRole: user.role, // Keep the original role for display
      tenantId: user.tenantId,
      isDeleted: user.isDeleted || false,
      createdAt: user.createdAt,
      phoneNumber: user.phoneNumber
    }));
    
    console.log('🔍 Debug - /super-admin/all returning users:', {
      totalUsers: mappedUsers.length,
      users: mappedUsers.map(u => ({ id: u.id, role: u.role, originalRole: u.originalRole, email: u.email }))
    });
    
    res.json({ data: mappedUsers });
  } catch (error) {
    console.error('Error in /super-admin/all:', error);
    next(error);
  }
});

// Get all users (admin only)
router.get("/", authenticate, async (req: any, res, next) => {
  try {
    const userRole = req.user?.role;
    const userOriginalRole = req.user?.originalRole;
    
    console.log('🔍 Debug - /users/ endpoint - User details:', {
      userId: req.user?.userId,
      role: userRole,
      originalRole: userOriginalRole,
      tenantId: req.user?.tenantId
    });
    
    // Check permissions manually for SUPER_ADMIN users
    if (userOriginalRole?.toUpperCase() === 'SUPER_ADMIN') {
      // SUPER_ADMIN has access to all users
      console.log('🔍 Debug - SUPER_ADMIN access granted');
    } else if (userRole?.toUpperCase() === 'ADMIN') {
      // Regular admin users need to pass RBAC check
      try {
        const { checkPermission } = await import('../utils/rbac');
        const hasPermission = await checkPermission(req.user, 'view', 'user');
        if (!hasPermission) {
          console.log('🔍 Debug - Admin user failed RBAC check');
          throw createError("Access denied. Admin role required.", 403);
        }
      } catch (rbacError) {
        console.log('🔍 Debug - RBAC check failed:', rbacError);
      throw createError("Access denied. Admin role required.", 403);
      }
    } else {
      console.log('🔍 Debug - Access denied for user:', req.user?.userId);
      throw createError("Access denied. Admin role or SUPER_ADMIN required.", 403);
    }

    const result = await docClient.send(
      new ScanCommand({
        TableName: TABLES.USERS
      })
    );

    let users = result.Items || [];

    // Filter out deleted users
    users = users.filter(user => !user.isDeleted);

    // For SUPER_ADMIN, return all users from all tenants
    // For regular admin, return only users from their tenant
    if (userOriginalRole?.toUpperCase() !== 'SUPER_ADMIN') {
      users = users.filter(user => user.tenantId === req.user.tenantId);
    }

    const mappedUsers = users.map(user => ({
      id: user.userId,
      userId: user.userId,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      email: user.email,
      role: normalizeRole(user.role),
      originalRole: user.role, // Keep the original role for display
      tenantId: user.tenantId,
      isDeleted: user.isDeleted || false,
      createdAt: user.createdAt,
      phoneNumber: user.phoneNumber
    }));

    res.json({ data: users });
  } catch (error) {
    next(error);
  }
});

// Get user by ID
router.get("/:id", authenticate, requirePermission('view', 'user'), async (req: any, res, next) => {
  try {
    const { id } = req.params;
    
    // First find the user by userId to get their email (since email is the primary key)
    const scanResult = await docClient.send(
      new ScanCommand({
        TableName: TABLES.USERS,
        FilterExpression: "userId = :userId",
        ExpressionAttributeValues: {
          ":userId": id
        }
      })
    );

    const user = scanResult.Items?.[0];
    if (!user) {
      throw createError("User not found", 404);
    }

    const responseUser = {
      id: user.userId,
      userId: user.userId,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      email: user.email,
      role: normalizeRole(user.role),
      originalRole: user.role, // Keep the original role for display
      reportingTo: user.reportingTo,
      isDeleted: user.isDeleted || false,
      createdAt: user.createdAt,
      phoneNumber: user.phoneNumber
    };

    res.json({ data: responseUser });
  } catch (error) {
    next(error);
  }
});

// Create new user
router.post("/", authenticate, requireCreatePermission('user'), async (req: any, res, next) => {
  try {
    const currentUser = req.user;
    const userRole = currentUser?.role;
    
    // Only admins can create users
    if (userRole?.toUpperCase() !== 'ADMIN') {
      throw createError("Access denied. Admin role required.", 403);
    }

    const { email, password, firstName, lastName, role = "rep", phoneNumber, reportingTo } = req.body;

    console.log('🔍 Debug - User creation request:', {
      email,
      firstName,
      lastName,
      role,
      reportingTo,
      currentUserRole: currentUser?.role,
      currentUserTenantId: currentUser?.tenantId
    });

    if (!email || !password || !firstName || !lastName) {
      throw createError("Email, password, firstName, and lastName are required", 400);
    }

    // Validate role creation permissions
    const requestedRole = normalizeRole(role);
    
    // Admins can only create managers and reps
            if (requestedRole === 'ADMIN') {
      throw createError("Admins cannot create other admins", 403);
    }

    // Check if user already exists with this email
    const existingUser = await docClient.send(
      new GetCommand({
        TableName: TABLES.USERS,
        Key: { email }
      })
    );

    if (existingUser.Item) {
      throw createError("User already exists with this email", 400);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = uuidv4();
    const tenantId = currentUser.tenantId;
    let createdBy = currentUser.userId;
    let finalReportingTo = null;

    // Determine reporting structure based on role being created
            if (requestedRole === 'SALES_MANAGER') {
      // Sales managers report to the admin
      finalReportingTo = currentUser.userId;
            } else if (requestedRole === 'SALES_REP') {
      // Sales reps report to a manager (reportingTo is required)
      if (!reportingTo) {
        throw createError("Sales representatives must have a reporting manager", 400);
      }
      
      // Validate that the reportingTo user exists and is a manager in the same tenant
      // Check both original role and normalized role for flexibility
      console.log('🔍 Debug - Validating reporting manager:', {
        reportingTo,
        tenantId: currentUser.tenantId
      });
      
      const managerResult = await docClient.send(
        new ScanCommand({
          TableName: TABLES.USERS,
          FilterExpression: "userId = :userId AND tenantId = :tenantId AND (#role = :originalRole OR #role = :normalizedRole OR #role = :managerRole) AND isDeleted = :isDeleted",
          ExpressionAttributeNames: {
            "#role": "role"
          },
          ExpressionAttributeValues: {
            ":userId": reportingTo,
            ":tenantId": currentUser.tenantId,
            ":originalRole": "SALES_MANAGER",
            ":normalizedRole": "SALES_MANAGER",
            ":managerRole": "MANAGER",
            ":isDeleted": false
          }
        })
      );
      
      console.log('🔍 Debug - Manager validation result:', {
        reportingTo,
        managerResultItems: managerResult.Items?.length || 0,
        managerResultItemsDetails: managerResult.Items?.map(item => ({
          userId: item.userId,
          role: item.role,
          originalRole: item.originalRole,
          tenantId: item.tenantId
        }))
      });
      
      if (!managerResult.Items || managerResult.Items.length === 0) {
        throw createError("Invalid reporting manager. Must be a sales manager in the same tenant.", 400);
      }
      
      finalReportingTo = reportingTo;
    }

    // Create user object
    const user: any = {
      userId,
      email,
      firstName: firstName || '',
      lastName: lastName || '',
      password: hashedPassword,
      role: role, // Store the original role, not the normalized one
      tenantId,
      createdBy,
      isDeleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Only add optional fields if they have values
    if (phoneNumber) {
      user.phoneNumber = phoneNumber;
    }
    
    if (finalReportingTo) {
      user.reportingTo = finalReportingTo;
    }

    await docClient.send(
      new PutCommand({
        TableName: TABLES.USERS,
        Item: user
      })
    );

    const responseUser = {
      id: userId,
      userId,
      firstName: firstName || '',
      lastName: lastName || '',
      name: `${firstName} ${lastName}`,
      email,
      role: normalizeRole(role), // Use normalized role for RBAC
      originalRole: role, // Keep the original role for display
      tenantId,
      createdBy,
      reportingTo: finalReportingTo,
      isDeleted: false,
      createdAt: user.createdAt,
      phoneNumber
    };

    res.status(201).json({ data: responseUser });
  } catch (error) {
    next(error);
  }
});

// Soft delete user
router.put("/:id/soft-delete", authenticate, requireDeletePermission('user'), async (req: any, res, next) => {
  try {
    const currentUser = req.user;
    const userRole = currentUser?.role;
    
    // Only admins can soft delete users
    if (userRole?.toUpperCase() !== 'ADMIN') {
      throw createError("Access denied. Admin role required.", 403);
    }

    const { id } = req.params;
    
    // First find the user by userId to get their email (since email is the primary key)
    const scanResult = await docClient.send(
      new ScanCommand({
        TableName: TABLES.USERS,
        FilterExpression: "userId = :userId",
        ExpressionAttributeValues: {
          ":userId": id
        }
      })
    );

    const user = scanResult.Items?.[0];
    if (!user) {
      throw createError("User not found", 404);
    }

    // Prevent self-deletion
    if (user.userId === currentUser.userId) {
      throw createError("Cannot delete your own account", 400);
    }

    // Soft delete the user
    await docClient.send(
      new UpdateCommand({
        TableName: TABLES.USERS,
        Key: { email: user.email },
        UpdateExpression: "SET isDeleted = :isDeleted, deletedBy = :deletedBy, deletedAt = :deletedAt",
        ExpressionAttributeValues: {
          ":isDeleted": true,
          ":deletedBy": currentUser.email,
          ":deletedAt": new Date().toISOString()
        }
      })
    );

    res.json({ message: "User soft deleted successfully" });
  } catch (error) {
    next(error);
  }
});

// Update user profile (current user) - MUST come before /:id route
router.put("/profile", authenticate, async (req, res, next) => {
  try {
    const currentUser = (req as any).user;
    if (!currentUser) {
      throw createError("User not found in token", 401);
    }

    const { firstName, lastName, phoneNumber } = req.body;

    // Get current user data to find their email (primary key)
    const getUserResult = await docClient.send(
      new ScanCommand({
        TableName: TABLES.USERS,
        FilterExpression: "userId = :userId",
        ExpressionAttributeValues: {
          ":userId": currentUser.userId
        }
      })
    );

    const userToUpdate = getUserResult.Items?.[0];
    if (!userToUpdate) {
      throw createError("User not found", 404);
    }

    // Update user profile using email as key
    const result = await docClient.send(
      new UpdateCommand({
        TableName: TABLES.USERS,
        Key: { email: userToUpdate.email },
        UpdateExpression: "SET #firstName = :firstName, #lastName = :lastName, #phoneNumber = :phoneNumber, #updatedAt = :updatedAt",
        ExpressionAttributeNames: {
          "#firstName": "firstName",
          "#lastName": "lastName", 
          "#phoneNumber": "phoneNumber",
          "#updatedAt": "updatedAt"
        },
        ExpressionAttributeValues: {
          ":firstName": firstName,
          ":lastName": lastName,
          ":phoneNumber": phoneNumber,
          ":updatedAt": new Date().toISOString()
        },
        ReturnValues: "ALL_NEW"
      })
    );

    if (!result.Attributes) {
      throw createError("Failed to update profile", 500);
    }

    const updatedUser = {
      id: result.Attributes.userId,
      userId: result.Attributes.userId,
      firstName: result.Attributes.firstName || '',
      lastName: result.Attributes.lastName || '',
      name: `${result.Attributes.firstName || ''} ${result.Attributes.lastName || ''}`.trim(),
      email: result.Attributes.email,
      role: normalizeRole(result.Attributes.role),
      originalRole: result.Attributes.role, // Keep the original role for display
      phoneNumber: result.Attributes.phoneNumber,
      updatedAt: result.Attributes.updatedAt
    };

    res.json({ 
      message: "Profile updated successfully",
      data: updatedUser
    });
  } catch (error) {
    next(error);
  }
});

// Update user
router.put("/:id", authenticate, requireEditPermission('user'), async (req: any, res, next) => {
  try {
    const currentUser = req.user;
    const { id } = req.params;
    
    // First find the user by userId to get their email (since email is the primary key)
    const scanResult = await docClient.send(
      new ScanCommand({
        TableName: TABLES.USERS,
        FilterExpression: "userId = :userId",
        ExpressionAttributeValues: {
          ":userId": id
        }
      })
    );

    const user = scanResult.Items?.[0];
    if (!user) {
      throw createError("User not found", 404);
    }

    // Check if user is trying to update someone from a different tenant
    if (currentUser.role?.toUpperCase() === 'ADMIN' && user.tenantId !== currentUser.tenantId) {
      throw createError("Cannot update user from different tenant", 403);
    }

    // Check if phone number is being updated and validate uniqueness
    if (req.body.phoneNumber && req.body.phoneNumber !== user.phoneNumber) {
      const phoneCheckResult = await docClient.send(
        new ScanCommand({
          TableName: TABLES.USERS,
          FilterExpression: "phoneNumber = :phoneNumber AND userId <> :currentUserId",
          ExpressionAttributeValues: {
            ":phoneNumber": req.body.phoneNumber,
            ":currentUserId": id
          }
        })
      );

      if (phoneCheckResult.Items && phoneCheckResult.Items.length > 0) {
        throw createError("User already exists with this phone number", 400);
      }
    }

    // Handle email updates for admins
    if (req.body.email && req.body.email !== user.email) {
      // Only admins can update email addresses
      if (currentUser.role?.toUpperCase() !== 'ADMIN') {
        throw createError("Access denied. Only admins can update email addresses.", 403);
      }

      // Check if the new email already exists
      const emailCheckResult = await docClient.send(
        new GetCommand({
          TableName: TABLES.USERS,
          Key: { email: req.body.email }
        })
      );

      if (emailCheckResult.Item) {
        throw createError("User already exists with this email", 400);
      }
    }

    // Build update expressions for non-email fields
    const updateExpressions: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(req.body)) {
      if (key !== 'id' && key !== 'userId' && key !== 'email' && value !== undefined) {
        // Hash password if being updated
        if (key === 'password' && value) {
          const hashedPassword = await bcrypt.hash(value as string, 10);
          updateExpressions.push(`#${key} = :${key}`);
          expressionAttributeNames[`#${key}`] = key;
          expressionAttributeValues[`:${key}`] = hashedPassword;
        } 
        // Handle role updates (only admins can change roles)
        else if (key === 'role' && currentUser.role?.toUpperCase() === 'ADMIN') {
          const normalizedRole = normalizeRole(value as string);
          updateExpressions.push(`#${key} = :${key}`);
          expressionAttributeNames[`#${key}`] = key;
          expressionAttributeValues[`:${key}`] = normalizedRole;
        } 
        // Handle other fields
        else if (key !== 'role') {
          updateExpressions.push(`#${key} = :${key}`);
          expressionAttributeNames[`#${key}`] = key;
          expressionAttributeValues[`:${key}`] = value;
        }
      }
    }

    if (updateExpressions.length === 0) {
      throw createError("No valid fields to update", 400);
    }

    // Add updatedAt to the update
    updateExpressions.push("#updatedAt = :updatedAt");
    expressionAttributeNames["#updatedAt"] = "updatedAt";
    expressionAttributeValues[":updatedAt"] = new Date().toISOString();

    // Update the user
    const result = await docClient.send(
      new UpdateCommand({
        TableName: TABLES.USERS,
        Key: { email: user.email },
        UpdateExpression: `SET ${updateExpressions.join(", ")}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: "ALL_NEW"
      })
    );

    if (!result.Attributes) {
      throw createError("Failed to update user", 500);
    }

    const updatedUser = {
      id: result.Attributes.userId,
      userId: result.Attributes.userId,
      firstName: result.Attributes.firstName || '',
      lastName: result.Attributes.lastName || '',
      name: `${result.Attributes.firstName || ''} ${result.Attributes.lastName || ''}`.trim(),
      email: result.Attributes.email,
      role: normalizeRole(result.Attributes.role),
      originalRole: result.Attributes.role, // Keep the original role for display
      phoneNumber: result.Attributes.phoneNumber,
      updatedAt: result.Attributes.updatedAt
    };

    res.json({ 
      message: "User updated successfully",
      data: updatedUser
    });
  } catch (error) {
    next(error);
  }
});


// Test route to verify routing works
router.get("/profile/test", async (req, res) => {
  res.json({ message: "Profile route is working!", timestamp: new Date().toISOString() });
});

// Get user profile (current user)
router.get("/profile/me", authenticate, async (req, res, next) => {
  try {
    const email = (req as any).user?.email;
    
    const result = await docClient.send(
      new GetCommand({
        TableName: TABLES.USERS,
        Key: { email }
      })
    );

    if (!result.Item) {
      throw createError("User not found", 404);
    }

    const user = {
      id: result.Item.userId,
      userId: result.Item.userId,
      firstName: result.Item.firstName || '',
      lastName: result.Item.lastName || '',
      name: `${result.Item.firstName || ''} ${result.Item.lastName || ''}`.trim(),
      email: result.Item.email,
      role: normalizeRole(result.Item.role),
      originalRole: result.Item.role, // Keep the original role for display
      tenantId: result.Item.tenantId,
      createdBy: result.Item.createdBy,
      isDeleted: result.Item.isDeleted || false,
      createdAt: result.Item.createdAt,
      phoneNumber: result.Item.phoneNumber
    };

    res.json({ data: user });
  } catch (error) {
    next(error);
  }
});

export default router; 