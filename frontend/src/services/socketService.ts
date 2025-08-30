import io from 'socket.io-client';
import { useAuthStore } from '../store/useAuthStore';
import { API_CONFIG } from '../config/api';

class SocketService {
  public socket: ReturnType<typeof io> | null = null;
  private messageHandlers: Set<(message: any) => void> = new Set();
  private typingHandlers: Set<(data: any) => void> = new Set();
  private onlineUsersHandlers: Set<(users: any[]) => void> = new Set();
  private readReceiptHandlers: Set<(data: any) => void> = new Set();
  private channelTypingHandlers: Set<(data: any) => void> = new Set();

  private getSocketUrl(): string {
    // Check for dedicated socket URL first
    const socketUrl = import.meta.env.VITE_SOCKET_URL;
    if (socketUrl) {
      return socketUrl;
    }
    
    // Fallback to API URL conversion
    const apiUrl = import.meta.env.VITE_API_URL;
    if (apiUrl) {
      const baseUrl = apiUrl.replace('/api', '');
      return baseUrl;
    }
    
    // Development fallback
    const isDevelopment = import.meta.env.DEV;
    if (isDevelopment) {
      return 'http://localhost:3000';
    }
    
    console.warn('⚠️  No socket URL configured');
    return 'https://your-backend-app.onrender.com';
  }

  connect() {
    if (this.socket?.connected) return;

    // Check if we're in a Lambda environment (no WebSocket support)
    const isLambdaEnvironment = API_CONFIG.BASE_URL.includes('amazonaws.com');
    
    if (isLambdaEnvironment) {
      console.log('🚨 WebSocket not supported in AWS Lambda environment. Using polling fallback.');
      this.initializePollingFallback();
      return;
    }

    console.log('Initializing socket connection to:', API_CONFIG.SOCKET_URL);
    
    // Get auth token (try both token and accessToken fields)
    const authState = useAuthStore.getState();
    const token = authState.token || authState.accessToken;
    if (!token) {
      console.error('No authentication token found');
      return;
    }
    
    this.socket = io(API_CONFIG.SOCKET_URL, {
      autoConnect: false,
      transports: ['websocket', 'polling'],
      auth: {
        token: token
      },
      timeout: 20000,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    this.setupEventHandlers();
    this.socket.connect();
  }

  private pollingInterval: number | null = null;
  private currentUserId: string | null = null;
  private currentRecipientId: string | null = null;
  private currentChannelId: string | null = null;
  private lastMessageTimestamp: string | null = null;
  private seenMessageIds: Set<string> = new Set();

  private initializePollingFallback() {
    console.log('🔄 Initializing polling-based chat fallback for AWS Lambda');
    
    // Simulate successful connection for UI
    setTimeout(() => {
      this.onlineUsersHandlers.forEach(handler => {
        // You can populate this with users from your database
        handler([]);
      });
    }, 1000);
    
    // Note: Polling is disabled to prevent duplicate messages
    // Real-time features are not available in Lambda environment
    console.log('💡 Real-time messaging disabled in Lambda. Messages will appear on manual refresh.');
  }

  private startMessagePolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }

    this.pollingInterval = setInterval(async () => {
      try {
        if (this.currentRecipientId) {
          await this.pollDirectMessages();
        } else if (this.currentChannelId) {
          await this.pollChannelMessages();
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 3000); // Poll every 3 seconds

    console.log('📡 Started message polling every 3 seconds');
  }

  private async pollDirectMessages() {
    if (!this.currentRecipientId) return;

    try {
      const API = (await import('../api/client')).default;
      const response = await API.get(`/chat/direct-messages/${this.currentRecipientId}`);
      
      if (response.data?.success && response.data.data) {
        const messages = response.data.data
          .filter((msg: any) => !this.seenMessageIds.has(msg.messageId))
          .map((msg: any) => ({
            ...msg,
            id: msg.messageId,
            timestamp: new Date(msg.timestamp)
          }));

        // Only process new messages
        if (messages.length > 0) {
          console.log(`📬 Found ${messages.length} new direct messages`);
          
          // Mark messages as seen
          messages.forEach((msg: any) => {
            this.seenMessageIds.add(msg.messageId);
          });

          // Trigger message handlers to update UI with new messages only
          // Send all new messages in one batch to prevent multiple re-renders
          if (this.messageHandlers.size > 0) {
            this.messageHandlers.forEach(handler => {
              // Call handler once with all new messages in batch
              messages.forEach((message: any) => handler(message));
            });
          }
        }
      }
    } catch (error) {
      console.error('Failed to poll direct messages:', error);
    }
  }

  private async pollChannelMessages() {
    if (!this.currentChannelId) return;

    try {
      const API = (await import('../api/client')).default;
      const response = await API.get(`/chat/channels/${this.currentChannelId}/messages`);
      
      if (response.data?.success && response.data.data) {
        const messages = response.data.data
          .filter((msg: any) => !this.seenMessageIds.has(msg.messageId))
          .map((msg: any) => ({
            ...msg,
            id: msg.messageId,
            timestamp: new Date(msg.timestamp)
          }));

        // Only process new messages
        if (messages.length > 0) {
          console.log(`📬 Found ${messages.length} new channel messages`);
          
          // Mark messages as seen
          messages.forEach((msg: any) => {
            this.seenMessageIds.add(msg.messageId);
          });

          // Trigger message handlers to update UI with new messages only
          this.messageHandlers.forEach(handler => {
            messages.forEach((message: any) => handler(message));
          });
        }
      }
    } catch (error) {
      console.error('Failed to poll channel messages:', error);
    }
  }

  // Method to set current conversation context for polling
  setPollingContext(recipientId?: string, channelId?: string) {
    const authState = useAuthStore.getState();
    this.currentUserId = authState.user?.userId || null;
    this.currentRecipientId = recipientId || null;
    this.currentChannelId = channelId || null;
    
    // Clear seen messages when switching conversations
    this.seenMessageIds.clear();
    
    console.log('🎯 Polling context set:', { 
      userId: this.currentUserId, 
      recipientId: this.currentRecipientId, 
      channelId: this.currentChannelId 
    });
  }

  // Method to mark existing messages as seen (call this when initially loading a conversation)
  markExistingMessagesAsSeen(messages: any[]) {
    messages.forEach(message => {
      if (message.messageId || message.id) {
        this.seenMessageIds.add(message.messageId || message.id);
      }
    });
    console.log(`👁️ Marked ${messages.length} existing messages as seen`);
  }

  private setupEventHandlers() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('Socket connected with ID:', this.socket?.id);
      
      // Send user info on connection (optional, as backend auto-joins)
      const user = useAuthStore.getState().user;
      if (user) {
        this.socket?.emit('user:join', {
          firstName: user.firstName,
          lastName: user.lastName
        });
      }
    });

    this.socket.on('connect_error', (error: any) => {
      console.error('Socket connection error:', error);
      if (error.message === 'Authentication token required' || 
          error.message === 'Invalid authentication token') {
        console.error('Authentication failed, redirecting to login...');
        // Could trigger logout here
      }
    });

    this.socket.on('disconnect', (reason: any) => {
      console.log('Socket disconnected:', reason);
      if (reason === 'io server disconnect') {
        // The disconnection was initiated by the server, you need to reconnect manually
        console.log('Attempting to reconnect...');
        setTimeout(() => {
          if (this.socket && !this.socket.connected) {
            this.socket.connect();
          }
        }, 1000);
      }
    });

    this.socket.on('message:receive', (message: any) => {
      console.log('Received message:', message);
      this.messageHandlers.forEach(handler => handler(message));
    });

    this.socket.on('typing:receive', (data: any) => {
      console.log('Received typing start:', data);
      this.typingHandlers.forEach(handler => handler({...data, type: 'start'}));
    });

    this.socket.on('typing:stop', (data: any) => {
      console.log('Received typing stop:', data);
      this.typingHandlers.forEach(handler => handler({...data, type: 'stop'}));
    });

    this.socket.on('channel:typing:receive', (data: any) => {
      console.log('Received channel typing:', data);
      this.channelTypingHandlers.forEach(handler => handler({...data, type: 'start'}));
    });

    this.socket.on('channel:typing:stop', (data: any) => {
      console.log('Received channel typing stop:', data);
      this.channelTypingHandlers.forEach(handler => handler({...data, type: 'stop'}));
    });

    this.socket.on('users:online', (users: any) => {
      console.log('Online users updated:', users);
      this.onlineUsersHandlers.forEach(handler => handler(users));
    });

    this.socket.on('message:read:receive', (data: any) => {
      console.log('Received read receipt:', data);
      this.readReceiptHandlers.forEach(handler => handler(data));
    });
    
    this.socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });
  }

  // Message handling
  sendPrivateMessage(to: string, message: any) {
    const isLambdaEnvironment = API_CONFIG.BASE_URL.includes('amazonaws.com');
    
    if (isLambdaEnvironment) {
      console.log('📤 Sending private message via API (Lambda fallback)');
      // Use the REST API to send direct messages
      this.sendDirectMessageViaAPI(to, message);
      return;
    }
    
    if (!this.socket?.connected) {
      console.error('Socket not connected, cannot send private message');
      return;
    }
    console.log('Sending private message to', to, message);
    this.socket.emit('message:private', { to, message });
  }

  sendChannelMessage(channelId: string, message: any) {
    const isLambdaEnvironment = API_CONFIG.BASE_URL.includes('amazonaws.com');
    
    if (isLambdaEnvironment) {
      console.log('📤 Sending channel message via API (Lambda fallback)');
      // Channel messages are already handled via API in TeamChat.tsx
      return;
    }
    
    if (!this.socket?.connected) {
      console.error('Socket not connected, cannot send channel message');
      return;
    }
    console.log('Sending channel message to', channelId, message);
    this.socket.emit('channel:message', { channelId, message });
  }

  private async sendDirectMessageViaAPI(recipientId: string, message: any) {
    try {
      const API = (await import('../api/client')).default;
      
      const response = await API.post('/chat/direct-messages', {
        recipientId: recipientId,
        content: message.content,
        type: message.type || 'text',
        files: message.files || []
      });
      
      console.log('✅ Direct message sent via API:', response.data);
      
      // Trigger message handlers to update UI
      this.messageHandlers.forEach(handler => {
        handler({
          ...response.data.data,
          timestamp: new Date(response.data.data.timestamp)
        });
      });
      
    } catch (error) {
      console.error('❌ Failed to send direct message via API:', error);
    }
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
    const isLambdaEnvironment = API_CONFIG.BASE_URL.includes('amazonaws.com');
    
    if (isLambdaEnvironment) {
      console.log('⚠️ Typing indicators not supported in Lambda environment');
      return;
    }
    
    if (!this.socket?.connected) {
      console.warn('Socket not connected, cannot send typing start');
      return;
    }
    console.log('Sending typing start to', to);
    this.socket.emit('typing:start', { to });
  }

  sendTypingStop(to: string) {
    const isLambdaEnvironment = API_CONFIG.BASE_URL.includes('amazonaws.com');
    
    if (isLambdaEnvironment) {
      return; // Silent return for Lambda environment
    }
    
    if (!this.socket?.connected) {
      console.warn('Socket not connected, cannot send typing stop');
      return;
    }
    console.log('Sending typing stop to', to);
    this.socket.emit('typing:stop', { to });
  }

  sendChannelTyping(channelId: string) {
    const isLambdaEnvironment = API_CONFIG.BASE_URL.includes('amazonaws.com');
    
    if (isLambdaEnvironment) {
      console.log('⚠️ Typing indicators not supported in Lambda environment');
      return;
    }
    
    if (!this.socket?.connected) {
      console.warn('Socket not connected, cannot send channel typing');
      return;
    }
    console.log('Sending channel typing to', channelId);
    this.socket.emit('channel:typing', { channelId });
  }

  sendChannelTypingStop(channelId: string) {
    const isLambdaEnvironment = API_CONFIG.BASE_URL.includes('amazonaws.com');
    
    if (isLambdaEnvironment) {
      return; // Silent return for Lambda environment
    }
    
    if (!this.socket?.connected) {
      console.warn('Socket not connected, cannot send channel typing stop');
      return;
    }
    console.log('Sending channel typing stop to', channelId);
    this.socket.emit('channel:typing:stop', { channelId });
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
    console.log('Sending read receipt for', messageIds, 'to', to);
    this.socket?.emit('message:read', { messageIds, to });
  }

  onReadReceipt(handler: (data: any) => void) {
    this.readReceiptHandlers.add(handler);
    return () => this.readReceiptHandlers.delete(handler);
  }

  disconnect() {
    console.log('Disconnecting socket...');
    this.socket?.disconnect();
    this.socket = null;
    
    // Clean up polling
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
      console.log('📡 Stopped message polling');
    }
    
    // Clear polling context
    this.currentUserId = null;
    this.currentRecipientId = null;
    this.currentChannelId = null;
    this.seenMessageIds.clear();
  }
}

// Create a singleton instance
const socketService = new SocketService();
export default socketService; 