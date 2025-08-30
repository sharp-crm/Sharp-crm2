import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';

interface User {
  userId: string;
  socketId: string;
  firstName: string;
  lastName: string;
  role: string;
  tenantId: string;
  email: string;
}

interface TypingStatus {
  userId: string;
  channelId?: string;
  timestamp: Date;
}

interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  tenantId: string;
  firstName?: string;
  lastName?: string;
}

class SocketService {
  private io: SocketIOServer;
  private onlineUsers: Map<string, User> = new Map(); // userId -> User
  private userSockets: Map<string, Set<string>> = new Map(); // userId -> Set of socketIds (for multiple tabs)
  private socketToUser: Map<string, string> = new Map(); // socketId -> userId
  private channelTypingUsers: Map<string, TypingStatus[]> = new Map(); // channelId -> TypingStatus[]
  private directTypingUsers: Map<string, TypingStatus[]> = new Map(); // userId -> TypingStatus[] (who's typing to this user)
  private typingTimeouts: Map<string, NodeJS.Timeout> = new Map(); // userId_channelId -> timeout

  constructor(server: HTTPServer) {
    // Get CORS origins from environment variables
    const corsOrigins = this.getCorsOrigins();
    
    this.io = new SocketIOServer(server, {
      cors: {
        origin: corsOrigins,
        methods: ["GET", "POST"],
        credentials: true
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000
    });

    this.setupEventHandlers();
    console.log('SocketService initialized with CORS origins:', corsOrigins);
  }

  private getCorsOrigins(): string[] {
    const isProduction = process.env.NODE_ENV === 'production';
    
    if (isProduction) {
      // Production: Support multiple frontend URLs if needed
      const frontendUrls = process.env.FRONTEND_URLS;
      if (frontendUrls) {
        return frontendUrls.split(',').map(url => url.trim());
      }
      
      // Fallback to single URL
      const frontendUrl = process.env.FRONTEND_URL;
      if (!frontendUrl) {
        console.warn('⚠️  FRONTEND_URL environment variable not set in production');
        return [];
      }
      return [frontendUrl];
    } else {
      // Development: Allow localhost ports for development
      return [
        "http://localhost:5173",
        "http://localhost:5174", 
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174"
      ];
    }
  }

  // Authentication middleware for sockets
  private async authenticateSocket(socket: any, token: string): Promise<JWTPayload | null> {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret') as JWTPayload;
      return decoded;
    } catch (error) {
      console.error('Socket authentication failed:', error);
      return null;
    }
  }

  private setupEventHandlers() {
    // Authentication middleware
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
          return next(new Error('Authentication token required'));
        }

        const user = await this.authenticateSocket(socket, token);
        if (!user) {
          return next(new Error('Invalid authentication token'));
        }

        socket.data.user = user;
        next();
      } catch (error) {
        console.error('Socket authentication error:', error);
        next(new Error('Authentication failed'));
      }
    });

    this.io.on('connection', (socket) => {
      const user = socket.data.user as JWTPayload;
      console.log('New authenticated client connected:', socket.id, 'User:', user.userId);

      // Handle user joining
      socket.on('user:join', (userData?: { firstName?: string; lastName?: string }) => {
        console.log('User joined:', user.userId);
        
        const userInfo: User = {
          userId: user.userId,
          socketId: socket.id,
          firstName: userData?.firstName || user.firstName || '',
          lastName: userData?.lastName || user.lastName || '',
          role: user.role,
          tenantId: user.tenantId,
          email: user.email
        };
        
        // Store user with socket ID
        this.onlineUsers.set(user.userId, userInfo);
        
        // Track multiple sockets for same user (multiple tabs)
        if (!this.userSockets.has(user.userId)) {
          this.userSockets.set(user.userId, new Set());
        }
        this.userSockets.get(user.userId)!.add(socket.id);
        this.socketToUser.set(socket.id, user.userId);
        
        // Broadcast updated online users list to tenant
        this.broadcastOnlineUsersToTenant(user.tenantId);
      });

      // Auto-join user on connection
      const userInfo: User = {
        userId: user.userId,
        socketId: socket.id,
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        role: user.role,
        tenantId: user.tenantId,
        email: user.email
      };
      
      this.onlineUsers.set(user.userId, userInfo);
      if (!this.userSockets.has(user.userId)) {
        this.userSockets.set(user.userId, new Set());
      }
      this.userSockets.get(user.userId)!.add(socket.id);
      this.socketToUser.set(socket.id, user.userId);
      this.broadcastOnlineUsersToTenant(user.tenantId);

      // Handle private messages
      socket.on('message:private', ({ to, message }) => {
        console.log('Private message from', user.userId, 'to', to, ':', message);
        
        // Ensure both users are in same tenant
        const recipient = this.onlineUsers.get(to);
        if (recipient && recipient.tenantId === user.tenantId) {
          const recipientSockets = this.userSockets.get(to);
          if (recipientSockets) {
            recipientSockets.forEach(socketId => {
              this.io.to(socketId).emit('message:receive', {
                ...message,
                senderId: user.userId,
                timestamp: new Date().toISOString()
              });
            });
          }
        } else {
          console.log('Recipient not online or in different tenant:', to);
        }
      });

      // Handle direct message typing status
      socket.on('typing:start', ({ to }) => {
        console.log('Typing start from', user.userId, 'to', to);
        
        const recipient = this.onlineUsers.get(to);
        if (recipient && recipient.tenantId === user.tenantId) {
          const recipientSockets = this.userSockets.get(to);
          if (recipientSockets) {
            recipientSockets.forEach(socketId => {
              this.io.to(socketId).emit('typing:receive', { 
                from: user.userId,
                type: 'start'
              });
            });
          }
        }
      });

      socket.on('typing:stop', ({ to }) => {
        console.log('Typing stop from', user.userId, 'to', to);
        
        const recipient = this.onlineUsers.get(to);
        if (recipient && recipient.tenantId === user.tenantId) {
          const recipientSockets = this.userSockets.get(to);
          if (recipientSockets) {
            recipientSockets.forEach(socketId => {
              this.io.to(socketId).emit('typing:stop', { 
                from: user.userId,
                type: 'stop'
              });
            });
          }
        }
      });

      // Handle channel typing status
      socket.on('channel:typing', ({ channelId }) => {
        console.log('Channel typing from', user.userId, 'in channel', channelId);
        
        // Add to typing users for this channel
        const typingUsers = this.channelTypingUsers.get(channelId) || [];
        const existingIndex = typingUsers.findIndex(u => u.userId === user.userId);
        
        if (existingIndex >= 0) {
          // Update timestamp
          typingUsers[existingIndex].timestamp = new Date();
        } else {
          // Add new typing user
          typingUsers.push({
            userId: user.userId,
            channelId,
            timestamp: new Date()
          });
        }
        
        this.channelTypingUsers.set(channelId, typingUsers);
        
        // Clear any existing timeout
        const timeoutKey = `${user.userId}_${channelId}`;
        if (this.typingTimeouts.has(timeoutKey)) {
          clearTimeout(this.typingTimeouts.get(timeoutKey));
        }
        
        // Set timeout to automatically remove typing status after 3 seconds
        const timeout = setTimeout(() => {
          this.removeChannelTypingUser(channelId, user.userId);
        }, 3000);
        
        this.typingTimeouts.set(timeoutKey, timeout);
        
        // Broadcast to channel (exclude sender)
        socket.to(`channel:${channelId}`).emit('channel:typing:receive', {
          userId: user.userId,
          channelId,
          timestamp: new Date().toISOString(),
          type: 'start'
        });
      });
      
      socket.on('channel:typing:stop', ({ channelId }) => {
        console.log('Channel typing stop from', user.userId, 'in channel', channelId);
        
        this.removeChannelTypingUser(channelId, user.userId);
        
        // Broadcast to channel (exclude sender)
        socket.to(`channel:${channelId}`).emit('channel:typing:stop', {
          userId: user.userId,
          channelId,
          type: 'stop'
        });
      });

      // Handle read receipts
      socket.on('message:read', ({ messageIds, to }) => {
        console.log('Message read receipt from', user.userId, 'for messages', messageIds);
        
        const recipient = this.onlineUsers.get(to);
        if (recipient && recipient.tenantId === user.tenantId) {
          const recipientSockets = this.userSockets.get(to);
          if (recipientSockets) {
            recipientSockets.forEach(socketId => {
              this.io.to(socketId).emit('message:read:receive', { 
                messageIds, 
                from: user.userId 
              });
            });
          }
        }
      });

      // Handle channel messages (broadcast to all members)
      socket.on('channel:message', ({ channelId, message }) => {
        console.log('Channel message for', channelId, 'from', user.userId);
        
        // Broadcast to all sockets in the channel room (exclude sender)
        socket.to(`channel:${channelId}`).emit('message:receive', {
          ...message,
          senderId: user.userId,
          timestamp: new Date().toISOString()
        });
      });
      
      // Join channel room
      socket.on('channel:join', ({ channelId }) => {
        console.log('User', user.userId, 'joining channel:', channelId);
        socket.join(`channel:${channelId}`);
      });
      
      // Leave channel room
      socket.on('channel:leave', ({ channelId }) => {
        console.log('User', user.userId, 'leaving channel:', channelId);
        socket.leave(`channel:${channelId}`);
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id, 'User:', user.userId);
        
        // Remove this socket from user's socket set
        const userSocketSet = this.userSockets.get(user.userId);
        if (userSocketSet) {
          userSocketSet.delete(socket.id);
          
          // If no more sockets for this user, remove from online users
          if (userSocketSet.size === 0) {
            this.onlineUsers.delete(user.userId);
            this.userSockets.delete(user.userId);
            
            // Remove from all channel typing statuses
            this.channelTypingUsers.forEach((typingUsers, channelId) => {
              this.removeChannelTypingUser(channelId, user.userId);
            });
            
            // Remove from direct typing statuses
            this.directTypingUsers.forEach((typingUsers, targetUserId) => {
              this.directTypingUsers.set(targetUserId, 
                typingUsers.filter(tu => tu.userId !== user.userId)
              );
            });
          }
        }
        
        this.socketToUser.delete(socket.id);
        
        // Broadcast updated online users list to tenant
        this.broadcastOnlineUsersToTenant(user.tenantId);
      });
    });
  }

  private broadcastOnlineUsers() {
    const onlineUsersList = Array.from(this.onlineUsers.values()).map(({ socketId, ...user }) => user);
    console.log('Broadcasting online users:', onlineUsersList.length);
    this.io.emit('users:online', onlineUsersList);
  }

  // Broadcast online users only to specific tenant
  private broadcastOnlineUsersToTenant(tenantId: string) {
    const tenantUsers = Array.from(this.onlineUsers.values())
      .filter(user => user.tenantId === tenantId)
      .map(({ socketId, ...user }) => user);
    
    console.log(`Broadcasting online users to tenant ${tenantId}:`, tenantUsers.length);
    
    // Send to all sockets of users in this tenant
    this.onlineUsers.forEach((user) => {
      if (user.tenantId === tenantId) {
        const userSockets = this.userSockets.get(user.userId);
        if (userSockets) {
          userSockets.forEach(socketId => {
            this.io.to(socketId).emit('users:online', tenantUsers);
          });
        }
      }
    });
  }
  
  private removeChannelTypingUser(channelId: string, userId: string) {
    const typingUsers = this.channelTypingUsers.get(channelId) || [];
    const updatedTypingUsers = typingUsers.filter(u => u.userId !== userId);
    
    if (updatedTypingUsers.length > 0) {
      this.channelTypingUsers.set(channelId, updatedTypingUsers);
    } else {
      this.channelTypingUsers.delete(channelId);
    }
    
    // Clear timeout
    const timeoutKey = `${userId}_${channelId}`;
    if (this.typingTimeouts.has(timeoutKey)) {
      clearTimeout(this.typingTimeouts.get(timeoutKey));
      this.typingTimeouts.delete(timeoutKey);
    }
  }
  
  // Method to send a message to a specific user
  public sendToUser(userId: string, event: string, data: any) {
    const user = this.onlineUsers.get(userId);
    if (user) {
      this.io.to(user.socketId).emit(event, data);
      return true;
    }
    return false;
  }
  
  // Method to broadcast to all connected clients
  public broadcast(event: string, data: any) {
    this.io.emit(event, data);
  }
  
  // Method to broadcast to a channel
  public broadcastToChannel(channelId: string, event: string, data: any) {
    this.io.to(`channel:${channelId}`).emit(event, data);
  }
  
  // Method to check if a user is online
  public isUserOnline(userId: string): boolean {
    return this.onlineUsers.has(userId);
  }
  
  // Method to get all online users
  public getOnlineUsers(): User[] {
    return Array.from(this.onlineUsers.values());
  }
  
  // Method to get typing users in a channel
  public getChannelTypingUsers(channelId: string): TypingStatus[] {
    return this.channelTypingUsers.get(channelId) || [];
  }
}

export default SocketService; 