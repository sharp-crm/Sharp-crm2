import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';

interface User {
  userId: string;
  socketId: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface TypingStatus {
  userId: string;
  channelId: string;
  timestamp: Date;
}

class SocketService {
  private io: SocketIOServer;
  private onlineUsers: Map<string, User> = new Map(); // userId -> User
  private channelTypingUsers: Map<string, TypingStatus[]> = new Map(); // channelId -> TypingStatus[]
  private typingTimeouts: Map<string, NodeJS.Timeout> = new Map(); // userId_channelId -> timeout

  constructor(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: ["http://localhost:5173", "http://localhost:5174"], // Vite's default ports
        methods: ["GET", "POST"]
      }
    });

    this.setupEventHandlers();
    console.log('SocketService initialized');
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log('New client connected:', socket.id);

      // Handle user joining
      socket.on('user:join', (user: { userId: string; firstName: string; lastName: string; role: string }) => {
        console.log('User joined:', user);
        
        // Store user with socket ID
        this.onlineUsers.set(user.userId, { ...user, socketId: socket.id });
        
        // Broadcast updated online users list
        this.broadcastOnlineUsers();
      });

      // Handle private messages
      socket.on('message:private', ({ to, message }) => {
        console.log('Private message from', socket.id, 'to', to, ':', message);
        
        const recipientSocket = this.onlineUsers.get(to)?.socketId;
        if (recipientSocket) {
          console.log('Forwarding to recipient socket:', recipientSocket);
          this.io.to(recipientSocket).emit('message:receive', message);
        } else {
          console.log('Recipient not online:', to);
        }
      });

      // Handle typing status
      socket.on('typing:start', ({ from, to }) => {
        console.log('Typing start from', from, 'to', to);
        
        const recipientSocket = this.onlineUsers.get(to)?.socketId;
        if (recipientSocket) {
          this.io.to(recipientSocket).emit('typing:receive', { from });
        }
      });

      socket.on('typing:stop', ({ from, to }) => {
        console.log('Typing stop from', from, 'to', to);
        
        const recipientSocket = this.onlineUsers.get(to)?.socketId;
        if (recipientSocket) {
          this.io.to(recipientSocket).emit('typing:stop', { from });
        }
      });

      // Handle channel typing status
      socket.on('channel:typing', ({ channelId, userId }) => {
        console.log('Channel typing from', userId, 'in channel', channelId);
        
        // Add to typing users for this channel
        const typingUsers = this.channelTypingUsers.get(channelId) || [];
        const existingIndex = typingUsers.findIndex(u => u.userId === userId);
        
        if (existingIndex >= 0) {
          // Update timestamp
          typingUsers[existingIndex].timestamp = new Date();
        } else {
          // Add new typing user
          typingUsers.push({
            userId,
            channelId,
            timestamp: new Date()
          });
        }
        
        this.channelTypingUsers.set(channelId, typingUsers);
        
        // Clear any existing timeout
        const timeoutKey = `${userId}_${channelId}`;
        if (this.typingTimeouts.has(timeoutKey)) {
          clearTimeout(this.typingTimeouts.get(timeoutKey));
        }
        
        // Set timeout to automatically remove typing status after 3 seconds
        const timeout = setTimeout(() => {
          this.removeChannelTypingUser(channelId, userId);
        }, 3000);
        
        this.typingTimeouts.set(timeoutKey, timeout);
        
        // Broadcast to channel
        socket.to(`channel:${channelId}`).emit('channel:typing:receive', {
          userId,
          channelId,
          timestamp: new Date()
        });
      });
      
      socket.on('channel:typing:stop', ({ channelId, userId }) => {
        console.log('Channel typing stop from', userId, 'in channel', channelId);
        
        this.removeChannelTypingUser(channelId, userId);
        
        // Broadcast to channel
        socket.to(`channel:${channelId}`).emit('channel:typing:stop', {
          userId,
          channelId
        });
      });

      // Handle read receipts
      socket.on('message:read', ({ messageIds, from, to }) => {
        console.log('Message read receipt from', from, 'for messages', messageIds);
        
        const recipientSocket = this.onlineUsers.get(to)?.socketId;
        if (recipientSocket) {
          this.io.to(recipientSocket).emit('message:read:receive', { messageIds, from });
        }
      });

      // Handle channel messages (broadcast to all members)
      socket.on('channel:message', ({ channelId, message }) => {
        console.log('Channel message for', channelId, ':', message);
        
        // Broadcast to all sockets in the channel room
        socket.to(`channel:${channelId}`).emit('message:receive', message);
      });
      
      // Join channel room
      socket.on('channel:join', ({ channelId }) => {
        console.log('User joining channel:', channelId);
        socket.join(`channel:${channelId}`);
      });
      
      // Leave channel room
      socket.on('channel:leave', ({ channelId }) => {
        console.log('User leaving channel:', channelId);
        socket.leave(`channel:${channelId}`);
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        
        // Find and remove the disconnected user
        let disconnectedUserId = null;
        for (const [userId, user] of this.onlineUsers.entries()) {
          if (user.socketId === socket.id) {
            console.log('User went offline:', userId);
            this.onlineUsers.delete(userId);
            disconnectedUserId = userId;
            break;
          }
        }
        
        // Remove from all channel typing statuses
        if (disconnectedUserId) {
          this.channelTypingUsers.forEach((typingUsers, channelId) => {
            this.removeChannelTypingUser(channelId, disconnectedUserId as string);
          });
        }
        
        // Broadcast updated online users list
        this.broadcastOnlineUsers();
      });
    });
  }

  private broadcastOnlineUsers() {
    const onlineUsersList = Array.from(this.onlineUsers.values()).map(({ socketId, ...user }) => user);
    console.log('Broadcasting online users:', onlineUsersList.length);
    this.io.emit('users:online', onlineUsersList);
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