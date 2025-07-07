import 'express';

declare module 'express' {
  export interface Request {
    user: {
      userId: string;
      email: string;
      firstName: string;
      lastName: string;
      role: string;
      tenantId?: string;
      isDeleted?: boolean;
    }
  }
} 