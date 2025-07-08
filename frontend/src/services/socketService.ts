import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/useAuthStore';

class SocketService {
  public socket: Socket | null = null;
  private messageHandlers: Set<(message: any) => void> = new Set();
  private typingHandlers: Set<(data: any) => void> = new Set();
  private onlineUsersHandlers: Set<(users: any[]) => void> = new Set();
  private readReceiptHandlers: Set<(data: any) => void> = new Set();
  private channelTypingHandlers: Set<(data: any) => void> = new Set();

  connect() {
    if (this.socket?.connected) return;

    console.log('Initializing socket connection...');
    this.socket = io('http://localhost:3000', {
      autoConnect: false
    });

    this.setupEventHandlers();
    this.socket.connect();

    // Join with user info
    const user = useAuthStore.getState().user;
    if (user) {
      console.log('Joining with user:', user);
      this.socket.emit('user:join', {
        userId: user.userId,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      });
    } else {
      console.error('No user found in auth store');
    }
  }

  private setupEventHandlers() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('Socket connected with ID:', this.socket?.id);
      
      // Re-join with user info on reconnection
      const user = useAuthStore.getState().user;
      if (user) {
        this.socket?.emit('user:join', {
          userId: user.userId,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role
        });
      }
    });

    this.socket.on('message:receive', (message) => {
      console.log('Received message:', message);
      this.messageHandlers.forEach(handler => handler(message));
    });

    this.socket.on('typing:receive', (data) => {
      console.log('Received typing start:', data);
      this.typingHandlers.forEach(handler => handler({...data, type: 'start'}));
    });

    this.socket.on('typing:stop', (data) => {
      console.log('Received typing stop:', data);
      this.typingHandlers.forEach(handler => handler({...data, type: 'stop'}));
    });

    this.socket.on('channel:typing:receive', (data) => {
      console.log('Received channel typing:', data);
      this.channelTypingHandlers.forEach(handler => handler({...data, type: 'start'}));
    });

    this.socket.on('channel:typing:stop', (data) => {
      console.log('Received channel typing stop:', data);
      this.channelTypingHandlers.forEach(handler => handler({...data, type: 'stop'}));
    });

    this.socket.on('users:online', (users) => {
      console.log('Online users updated:', users);
      this.onlineUsersHandlers.forEach(handler => handler(users));
    });

    this.socket.on('message:read:receive', (data) => {
      console.log('Received read receipt:', data);
      this.readReceiptHandlers.forEach(handler => handler(data));
    });
    
    this.socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });
    
    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });
  }

  // Message handling
  sendPrivateMessage(to: string, message: any) {
    console.log('Sending private message to', to, message);
    this.socket?.emit('message:private', { to, message });
  }

  sendChannelMessage(channelId: string, message: any) {
    console.log('Sending channel message to', channelId, message);
    this.socket?.emit('channel:message', { channelId, message });
  }

  onMessage(handler: (message: any) => void) {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  // Channel management
  joinChannel(channelId: string) {
    console.log('Joining channel:', channelId);
    this.socket?.emit('channel:join', { channelId });
  }

  leaveChannel(channelId: string) {
    console.log('Leaving channel:', channelId);
    this.socket?.emit('channel:leave', { channelId });
  }

  // Typing status
  sendTypingStart(to: string) {
    const user = useAuthStore.getState().user;
    if (user) {
      console.log('Sending typing start to', to);
      this.socket?.emit('typing:start', { from: user.userId, to });
    }
  }

  sendTypingStop(to: string) {
    const user = useAuthStore.getState().user;
    if (user) {
      console.log('Sending typing stop to', to);
      this.socket?.emit('typing:stop', { from: user.userId, to });
    }
  }

  sendChannelTyping(channelId: string) {
    const user = useAuthStore.getState().user;
    if (user) {
      console.log('Sending channel typing to', channelId);
      this.socket?.emit('channel:typing', { channelId, userId: user.userId });
    }
  }

  sendChannelTypingStop(channelId: string) {
    const user = useAuthStore.getState().user;
    if (user) {
      console.log('Sending channel typing stop to', channelId);
      this.socket?.emit('channel:typing:stop', { channelId, userId: user.userId });
    }
  }

  onTyping(handler: (data: any) => void) {
    this.typingHandlers.add(handler);
    return () => this.typingHandlers.delete(handler);
  }

  onChannelTyping(handler: (data: any) => void) {
    this.channelTypingHandlers.add(handler);
    return () => this.channelTypingHandlers.delete(handler);
  }

  // Online users
  onOnlineUsers(handler: (users: any[]) => void) {
    this.onlineUsersHandlers.add(handler);
    return () => this.onlineUsersHandlers.delete(handler);
  }

  // Read receipts
  sendReadReceipt(messageIds: string[], to: string) {
    const user = useAuthStore.getState().user;
    if (user) {
      console.log('Sending read receipt for', messageIds, 'to', to);
      this.socket?.emit('message:read', { messageIds, from: user.userId, to });
    }
  }

  onReadReceipt(handler: (data: any) => void) {
    this.readReceiptHandlers.add(handler);
    return () => this.readReceiptHandlers.delete(handler);
  }

  disconnect() {
    console.log('Disconnecting socket...');
    this.socket?.disconnect();
    this.socket = null;
  }
}

// Create a singleton instance
const socketService = new SocketService();
export default socketService; 