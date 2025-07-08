// src/Pages/TeamChat.tsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import * as Icons from 'lucide-react';
import PageHeader from '../components/Common/PageHeader';
import StatusBadge from '../components/Common/StatusBadge';
import data from '@emoji-mart/data'
import Picker from '@emoji-mart/react'
import { format } from 'date-fns';
import API from '../api/client';
import { useAuthStore } from '../store/useAuthStore';
import socketService from '../services/socketService';
import ChannelModal from '../components/ChannelModal';
import ChannelSettingsModal from '../components/ChannelSettingsModal';

// File upload configurations
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_FILE_TYPES = [
  'image/*',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'application/zip',
  'application/x-zip-compressed'
];

interface FileUpload {
  file: File;
  progress: number;
  preview?: string;
  error?: string;
}

interface User {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  status?: 'online' | 'away' | 'offline';
}

interface Reaction {
  emoji: string;
  users: string[];
}

interface ReadReceipt {
  userId: string;
  readAt: Date;
}

// Add new interfaces for typing and delivery status
interface TypingStatus {
  userId: string;
  timestamp: Date;
}

interface DeliveryStatus {
  sent: boolean;
  delivered: boolean;
  read: boolean;
  timestamp: Date;
}

interface Message {
  id: string;
  senderId: string;
  sender: string;
  content: string;
  timestamp: Date;
  type: 'text' | 'file' | 'system';
  avatar?: string;
  recipientId?: string;
  channelId: string;
  reactions: Reaction[];
  isEdited: boolean;
  readBy: ReadReceipt[];
  threadMessages: Message[];
  replyTo?: string;
  files?: {
    name: string;
    url: string;
    type: string;
    size: number;
    preview?: string;
  }[];
  deliveryStatus?: DeliveryStatus;
}

interface Channel {
  id: string;
  name: string;
  type: 'public' | 'private' | 'direct';
  members: number;
  unread?: number;
  description?: string;
  createdBy?: string;
  permissions: {
    canPost: string[];
    canInvite: string[];
    canManage: string[];
  };
}

interface DirectChat {
  userId: string;
  unreadCount: number;
  lastMessage?: Message;
}

interface ChannelMessages {
  [channelId: string]: Message[];
}

const TeamChat: React.FC = () => {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<string>('');
  const [directMessages, setDirectMessages] = useState<{ [key: string]: Message[] }>({});
  const [channels, setChannels] = useState<Channel[]>([]);
  
  const [messages, setMessages] = useState<Message[]>([]);
  
  const [users, setUsers] = useState<User[]>([]);
  const currentUser = useAuthStore(state => state.user);

  // Fetch tenant users
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await API.get('/users/tenant-users');
        const data = response.data?.data || [];
        
        // Map the users to include status
        const mappedUsers = data.map((user: any) => ({
          id: user.userId,
          userId: user.userId,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          status: 'offline' // Default to offline until socket updates
        }));

        setUsers(mappedUsers);
      } catch (error) {
        console.error('Failed to fetch tenant users:', error);
      }
    };

    fetchUsers();
  }, []);

  // Fetch channels
  useEffect(() => {
    const fetchChannels = async () => {
      try {
        const response = await API.get('/chat/channels');
        if (response.data?.data) {
          const mappedChannels = response.data.data.map((channel: any) => ({
            id: channel.id,
            name: channel.name,
            type: channel.type,
            members: 0, // Will be updated when we fetch members
            description: channel.description,
            createdBy: channel.createdBy,
            permissions: {
              canPost: [],
              canInvite: [],
              canManage: []
            }
          }));
          setChannels(mappedChannels);
          
          // Select first channel by default if available
          if (mappedChannels.length > 0 && !selectedChannel) {
            setSelectedChannel(mappedChannels[0].id);
          }
        }
      } catch (error) {
        console.error('Failed to fetch channels:', error);
      }
    };

    fetchChannels();
  }, []);

  // Fetch channel messages when a channel is selected
  useEffect(() => {
    if (!selectedChannel) return;

    const fetchChannelMessages = async () => {
      try {
        const response = await API.get(`/chat/channels/${selectedChannel}/messages`);
        if (response.data?.data) {
          const mappedMessages = response.data.data.map((msg: any) => ({
            id: msg.id,
            senderId: msg.senderId,
            sender: getUserName(msg.senderId),
            content: msg.content,
            timestamp: new Date(msg.timestamp),
            type: msg.type,
            channelId: msg.channelId,
            reactions: msg.reactions || [],
            isEdited: msg.isEdited || false,
            readBy: msg.readBy || [],
            threadMessages: [],
            files: msg.files
          }));
          
          setChannelMessages(prev => ({
            ...prev,
            [selectedChannel]: mappedMessages
          }));
        }
      } catch (error) {
        console.error(`Failed to fetch messages for channel ${selectedChannel}:`, error);
      }
    };

    fetchChannelMessages();
  }, [selectedChannel]);
  
  const [channelMessages, setChannelMessages] = useState<{ [key: string]: Message[] }>({});

  const [directChats, setDirectChats] = useState<DirectChat[]>([]);
  
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // New state for message features
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editInput, setEditInput] = useState('');
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [showReactionPicker, setShowReactionPicker] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedThread, setSelectedThread] = useState<Message | null>(null);

  // Add state for reply input
  const [replyInput, setReplyInput] = useState('');

  // Add state for unread counts
  const [unreadCounts, setUnreadCounts] = useState<{ [userId: string]: number }>({});

  // Add new state for sidebar visibility and width
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState<number>(280);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartXRef = useRef<number>(0);
  const dragStartWidthRef = useRef<number>(0);

  // New state for file handling
  const [fileUploads, setFileUploads] = useState<FileUpload[]>([]);
  const [isFileDragging, setIsFileDragging] = useState(false);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // Add new state for typing indicators and channel management
  const [typingUsers, setTypingUsers] = useState<TypingStatus[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [showChannelModal, setShowChannelModal] = useState(false);
  const [showChannelSettings, setShowChannelSettings] = useState(false);
  const [selectedChannelSettings, setSelectedChannelSettings] = useState<Channel | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Connect to socket when component mounts
  useEffect(() => {
    console.log("Connecting to socket service...");
    socketService.connect();

    // Listen for online users updates
    const unsubOnlineUsers = socketService.onOnlineUsers((onlineUsers) => {
      console.log("Online users update:", onlineUsers);
      setUsers(prevUsers => {
        // Update existing users with online status
        const updatedUsers = prevUsers.map(user => {
          const onlineUser = onlineUsers.find(u => u.userId === user.userId);
          return {
            ...user,
            status: onlineUser ? 'online' : 'offline'
          };
        });
        return updatedUsers;
      });
    });

    // Listen for incoming messages
    const unsubMessages = socketService.onMessage((message) => {
      console.log("Received message:", message);
      if (message.channelId && message.channelId === selectedChannel) {
        // Add to channel messages
        setChannelMessages(prev => {
          const channelMsgs = prev[message.channelId] || [];
          return {
            ...prev,
            [message.channelId]: [...channelMsgs, {
              ...message,
              timestamp: new Date(message.timestamp),
              sender: getUserName(message.senderId),
      reactions: [],
      isEdited: false,
      readBy: [],
      threadMessages: []
            }]
          };
        });
      } else if (message.senderId === selectedUser?.userId) {
        // Add to direct messages with selected user
        setDirectMessages(prev => ({
          ...prev,
          [selectedUser.userId]: [...(prev[selectedUser.userId] || []), {
            ...message,
            timestamp: new Date(message.timestamp),
            sender: getUserName(message.senderId),
      reactions: [],
      isEdited: false,
      readBy: [],
      threadMessages: []
          }]
        }));
      } else {
        // Update unread counts for non-selected users
        setUnreadCounts(prev => ({
          ...prev,
          [message.senderId]: (prev[message.senderId] || 0) + 1
        }));
      }
      
      // Scroll to bottom on new message
      scrollToBottom();
    });

    // Update useEffect to handle channel typing events
    const typingHandler = socketService.onTyping((data) => {
      if (data.type === 'start') {
        setTypingUsers(prev => {
          // Check if user is already in typing users
          const existingUser = prev.find(user => user.userId === data.from);
          if (existingUser) {
            // Update timestamp
            return prev.map(user => 
              user.userId === data.from 
                ? { ...user, timestamp: new Date() } 
                : user
            );
          } else {
            // Add new typing user
            return [...prev, { 
              userId: data.from, 
              timestamp: new Date() 
            }];
          }
        });
      } else if (data.type === 'stop') {
        setTypingUsers(prev => prev.filter(user => user.userId !== data.from));
      }
    });

    const channelTypingHandler = socketService.onChannelTyping((data) => {
      if (selectedChannel !== data.channelId) return;
      
      if (data.type === 'start') {
        setTypingUsers(prev => {
          // Check if user is already in typing users
          const existingUser = prev.find(user => user.userId === data.userId);
          if (existingUser) {
            // Update timestamp
            return prev.map(user => 
              user.userId === data.userId 
                ? { ...user, timestamp: new Date(data.timestamp) } 
                : user
            );
          } else {
            // Add new typing user
            return [...prev, { 
              userId: data.userId, 
              timestamp: new Date(data.timestamp) 
            }];
          }
        });
      } else if (data.type === 'stop') {
        setTypingUsers(prev => prev.filter(user => user.userId !== data.userId));
      }
    });

    const readReceiptHandler = socketService.onReadReceipt((data) => {
      const { messageIds, from } = data;
      
      // Update read status for direct messages
      setDirectMessages(prev => {
        const updatedMessages = { ...prev };
        
        // Find which user's messages need to be updated
        Object.keys(updatedMessages).forEach(userId => {
          updatedMessages[userId] = updatedMessages[userId].map(msg => {
            if (messageIds.includes(msg.id)) {
              return {
                ...msg,
                readBy: [...msg.readBy.filter(r => r.userId !== from), { 
                  userId: from, 
                  readAt: new Date() 
                }],
                deliveryStatus: {
                  ...msg.deliveryStatus,
                  read: true,
                  timestamp: new Date()
                }
              };
            }
            return msg;
          });
        });
        
        return updatedMessages;
      });
    });

    // Cleanup on unmount
    return () => {
      console.log("Disconnecting socket service...");
      unsubOnlineUsers();
      unsubMessages();
      typingHandler();
      channelTypingHandler();
      readReceiptHandler();
      socketService.disconnect();
    };
  }, [selectedUser, selectedChannel]);

  const handleUserSelect = (user: User) => {
    setSelectedUser(user);
    setSelectedChannel(''); // Clear channel selection when in DM
    if (!directMessages[user.id]) {
      setDirectMessages(prev => ({
        ...prev,
        [user.id]: []
      }));
    }
  };

  const handleChannelSelect = (channelId: string) => {
    setSelectedChannel(channelId);
    setSelectedUser(null); // Clear user selection when selecting channel
  };

  // Message delivery status handling
  const handleDeliveryStatusUpdate = (messageId: string, status: 'delivered' | 'read') => {
    const newStatus: DeliveryStatus = {
      sent: true,
      delivered: status === 'delivered' || status === 'read',
      read: status === 'read',
      timestamp: new Date()
    };

    const updateMessage = (message: Message): Message => {
      if (message.id === messageId) {
        return {
          ...message,
          deliveryStatus: newStatus
        };
      }
      return message;
    };

    if (selectedUser) {
      setDirectMessages((prev: { [key: string]: Message[] }) => ({
        ...prev,
        [selectedUser.id]: prev[selectedUser.id].map(updateMessage)
      }));
    } else if (selectedChannel) {
      setChannelMessages((prev: { [key: string]: Message[] }) => ({
        ...prev,
        [selectedChannel]: prev[selectedChannel].map(updateMessage)
      }));
    }
  };

  // Update handleSend to use socket
  const handleSend = () => {
    if (!input.trim() && fileUploads.length === 0) return;

    // Clear typing indicator
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    setIsTyping(false);

    if (selectedUser) {
      // Send direct message
    const newMessage: Message = {
      id: Date.now().toString(),
        senderId: currentUser?.userId || '',
        sender: `${currentUser?.firstName} ${currentUser?.lastName}`,
      content: input,
      timestamp: new Date(),
      type: 'text',
        channelId: '',
        recipientId: selectedUser.userId,
      reactions: [],
      isEdited: false,
      readBy: [],
        threadMessages: [],
        deliveryStatus: {
          sent: true,
          delivered: false,
          read: false,
          timestamp: new Date()
        }
      };

      // Add files if any
      if (fileUploads.length > 0) {
        newMessage.files = fileUploads.map(upload => ({
          name: upload.file.name,
          url: URL.createObjectURL(upload.file),
          type: upload.file.type,
          size: upload.file.size,
          preview: upload.preview
        }));
        newMessage.type = 'file';
      }

      // Add to local state
      setDirectMessages(prev => ({
        ...prev,
        [selectedUser.userId]: [...(prev[selectedUser.userId] || []), newMessage]
      }));

      // Send via socket
      socketService.sendPrivateMessage(selectedUser.userId, newMessage);

      // Stop typing indicator
      socketService.sendTypingStop(selectedUser.userId);
    } else if (selectedChannel) {
      // Send channel message
      const newMessage = {
        content: input,
        type: fileUploads.length > 0 ? 'file' : 'text',
        files: fileUploads.length > 0 ? fileUploads.map(upload => ({
          name: upload.file.name,
          url: URL.createObjectURL(upload.file),
          type: upload.file.type,
          size: upload.file.size
        })) : undefined,
        replyTo: replyingTo?.id
      };

      // Send to API
      API.post(`/chat/channels/${selectedChannel}/messages`, newMessage)
        .then(response => {
          console.log("Message sent successfully:", response.data);
          
          // Add to local state with more complete data
          const sentMessage: Message = {
            id: response.data.data.id || Date.now().toString(),
            senderId: currentUser?.userId || '',
            sender: `${currentUser?.firstName} ${currentUser?.lastName}`,
            content: input,
            timestamp: new Date(),
            type: fileUploads.length > 0 ? 'file' : 'text',
            channelId: selectedChannel,
            reactions: [],
            isEdited: false,
            readBy: [],
            threadMessages: [],
            files: fileUploads.length > 0 ? fileUploads.map(upload => ({
              name: upload.file.name,
              url: URL.createObjectURL(upload.file),
              type: upload.file.type,
              size: upload.file.size,
              preview: upload.preview
            })) : undefined,
            replyTo: replyingTo?.id
          };

          setChannelMessages(prev => ({
            ...prev,
            [selectedChannel]: [...(prev[selectedChannel] || []), sentMessage]
          }));
        })
        .catch(error => {
          console.error("Failed to send message:", error);
        });
    }

    // Clear input and files
    setInput('');
    setFileUploads([]);
    setReplyingTo(null);
    scrollToBottom();
  };

  const handleEmojiSelect = (emoji: { native: string }) => {
    setInput(prev => prev + emoji.native);
    setShowEmojiPicker(false);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      handleFiles(files);
    }
  };

  const handleFiles = async (files: FileList | File[]) => {
    const newUploads: FileUpload[] = [];

    for (const file of files) {
      const error = validateFile(file);
      if (error) {
        newUploads.push({ file, progress: 0, error });
        continue;
      }

      const preview = await createFilePreview(file);
      newUploads.push({ file, progress: 0, preview });
    }

    setFileUploads(prev => [...prev, ...newUploads]);
  };

  const validateFile = (file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) {
      return `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`;
    }
    
    const isValidType = ALLOWED_FILE_TYPES.some(type => {
      if (type.endsWith('/*')) {
        const baseType = type.split('/')[0];
        return file.type.startsWith(baseType + '/');
      }
      return file.type === type;
    });

    if (!isValidType) {
      return 'File type not supported';
    }

    return null;
  };

  const createFilePreview = async (file: File): Promise<string | undefined> => {
    if (file.type.startsWith('image/')) {
      return URL.createObjectURL(file);
    }
    
    // Add preview for PDF files
    if (file.type === 'application/pdf') {
      return '/pdf-icon.png'; // You would need to add this icon to your assets
    }
    
    return undefined;
  };

  const simulateFileUpload = (fileUpload: FileUpload) => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      setFileUploads(prev =>
        prev.map(upload =>
          upload.file === fileUpload.file
            ? { ...upload, progress }
            : upload
        )
      );

      if (progress >= 100) {
        clearInterval(interval);
        // Simulate a delay before sending the message
        setTimeout(() => {
          handleSendWithFiles([fileUpload.file]);
          setFileUploads(prev =>
            prev.filter(upload => upload.file !== fileUpload.file)
          );
        }, 500);
      }
    }, 200);
  };

  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget === dropZoneRef.current) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    await handleFiles(files);
  };

  // Modified send handler to support files
  const handleSendWithFiles = async (files: File[]) => {
    const fileDetails = await Promise.all(
      files.map(async (file) => ({
        name: file.name,
        url: URL.createObjectURL(file),
        type: file.type,
        size: file.size,
        preview: await createFilePreview(file)
      }))
    );

    const newMessage: Message = {
      id: Date.now().toString(),
      senderId: currentUser?.userId || '',
      sender: `${currentUser?.firstName} ${currentUser?.lastName}`,
      content: input.trim() || `Sent ${files.length} file${files.length > 1 ? 's' : ''}`,
      timestamp: new Date(),
      type: 'file',
      avatar: 'YU',
      recipientId: selectedUser?.id,
      channelId: selectedChannel,
      reactions: [],
      isEdited: false,
      readBy: [{ userId: currentUser?.userId || '', readAt: new Date() }],
      threadMessages: [],
      files: fileDetails,
      deliveryStatus: {
        sent: true,
        delivered: false,
        read: false,
        timestamp: new Date()
      }
    };

    // Send via socket
    if (selectedUser) {
      socketService.sendPrivateMessage(selectedUser.userId, newMessage);
    }

    // Update local state
    if (selectedUser) {
      setDirectMessages(prev => ({
        ...prev,
        [selectedUser.userId]: [...(prev[selectedUser.userId] || []), newMessage]
      }));
    }

    setInput('');

    // Simulate delivery status updates
    setTimeout(() => {
      handleDeliveryStatusUpdate(newMessage.id, 'delivered');
    }, 1000);

    setTimeout(() => {
      handleDeliveryStatusUpdate(newMessage.id, 'read');
    }, 2000);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatDate = (date: Date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-400';
      case 'away': return 'bg-yellow-400';
      case 'offline': return 'bg-gray-400';
      default: return 'bg-gray-400';
    }
  };

  // Function to get current messages based on selected user or channel
  const getCurrentMessages = (): Message[] => {
    if (selectedUser) {
      return directMessages[selectedUser.userId] || [];
    } else if (selectedChannel) {
      return channelMessages[selectedChannel] || [];
    }
    return [];
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const renderMessage = (message: Message) => {
    const isOwnMessage = message.senderId === currentUser?.userId;
    const isEditing = editingMessageId === message.id;
    const repliedToMessage = message.replyTo ? getRepliedMessage(message.replyTo) : null;

    // Format timestamp for messages
    const formatMessageTime = (date: Date) => {
      return new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: 'numeric',
        hour12: true
      }).format(date);
    };

    const renderFilePreview = (file: { name: string; url: string; type: string; size: number; preview?: string }) => {
      const isImage = file.type.startsWith('image/');
      const isPDF = file.type === 'application/pdf';
      const fileSize = (file.size / 1024).toFixed(1) + ' KB';

      return (
        <div className="flex items-center p-3 bg-gray-50 rounded-lg border border-gray-200 mt-2">
          {isImage ? (
            <img 
              src={file.url} 
              alt={file.name}
              className="w-20 h-20 object-cover rounded"
            />
          ) : (
            <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
              {isPDF ? (
                <Icons.FileText className="w-6 h-6 text-gray-500" />
              ) : (
                <Icons.File className="w-6 h-6 text-gray-500" />
              )}
            </div>
          )}
          <div className="ml-3 flex-1">
            <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
            <p className="text-xs text-gray-500">{fileSize}</p>
          </div>
          <a
            href={file.url}
            download={file.name}
            className="ml-4 p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
          >
            <Icons.Download className="w-5 h-5" />
          </a>
        </div>
      );
    };

    // Message actions component
    const MessageActions = () => (
      <div className={`absolute top-2 ${isOwnMessage ? '-left-14' : '-right-14'} hidden group-hover:flex items-center space-x-1`}>
        <button
          onClick={() => setShowReactionPicker(message.id)}
          className="p-1.5 bg-white text-gray-500 hover:text-gray-700 rounded-full shadow-sm transition-colors"
          title="Add reaction"
        >
          <Icons.Smile className="w-4 h-4" />
        </button>
        <button
          onClick={() => handleReply(message)}
          className="p-1.5 bg-white text-gray-500 hover:text-gray-700 rounded-full shadow-sm transition-colors"
          title="Reply"
        >
          <Icons.Reply className={`w-4 h-4 ${isOwnMessage ? 'rotate-180' : ''}`} />
        </button>
        {message.senderId === currentUser?.userId && (
          <button
            onClick={() => handleEditMessage(message.id)}
            className="p-1.5 bg-white text-gray-500 hover:text-gray-700 rounded-full shadow-sm transition-colors"
            title="Edit"
          >
            <Icons.Edit className="w-4 h-4" />
          </button>
        )}
      </div>
    );

    return (
      <div className="group relative flex flex-col w-full">
        <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
          <div className={`flex max-w-xl ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'} relative`}>
            {!isOwnMessage && (
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                <span className="text-sm font-medium text-blue-700">
                  {message.avatar || getUserName(message.senderId).split(' ').map(n => n[0]).join('')}
                </span>
              </div>
            )}
            <div className={`${isOwnMessage ? 'mr-3' : ''} relative group`}>
              <div className={`relative px-4 py-2 rounded-lg ${
                isOwnMessage 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white text-gray-900 border border-gray-200'
              }`}>
                {/* Sender Info for received messages */}
                {!isOwnMessage && (
                  <div className="flex items-center mb-1">
                    <span className="text-sm font-medium text-gray-900">{getUserName(message.senderId)}</span>
                  </div>
                )}

                {/* Reply Reference */}
                {repliedToMessage && (
                  <div className={`mb-2 pl-2 border-l-2 ${
                    isOwnMessage ? 'border-blue-400' : 'border-gray-300'
                  }`}>
                    <div className={`text-xs ${
                      isOwnMessage ? 'text-blue-100' : 'text-gray-500'
                    }`}>
                      Replying to {getUserName(repliedToMessage.senderId)}
                    </div>
                    <div className={`text-xs truncate ${
                      isOwnMessage ? 'text-blue-100' : 'text-gray-600'
                    }`}>
                      {repliedToMessage.content}
                    </div>
                  </div>
                )}

                {/* Message Content */}
                {isEditing ? (
                  <div className="flex items-end space-x-2">
                    <textarea
                      value={editInput}
                      onChange={(e) => setEditInput(e.target.value)}
                      className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      rows={1}
                    />
                    <button
                      onClick={() => handleSaveEdit(message.id)}
                      className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingMessageId(null)}
                      className="px-3 py-1 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                    
                    {/* Timestamp */}
                    <div className={`text-[10px] mt-1 ${isOwnMessage ? 'text-blue-100' : 'text-gray-400'}`}>
                      {formatMessageTime(message.timestamp)}
                      {message.isEdited && <span className="ml-1">(edited)</span>}
                    </div>
                  </>
                )}

                {/* File Previews */}
                {message.type === 'file' && message.files && (
                  <div className="space-y-2 mt-2">
                    {message.files.map((file, index) => (
                      <div key={index}>
                        {renderFilePreview(file)}
                      </div>
                    ))}
                  </div>
                )}

                {/* Message Actions */}
                <MessageActions />

                {/* Reaction Picker */}
                {showReactionPicker === message.id && (
                  <div className={`absolute top-0 ${isOwnMessage ? 'left-0 -translate-x-full -ml-2' : 'right-0 translate-x-full mr-2'} z-50`}>
                    <div className="relative bg-white rounded-lg shadow-lg">
                      <button
                        onClick={() => setShowReactionPicker(null)}
                        className="absolute -top-2 -right-2 p-1 bg-white rounded-full shadow-md text-gray-400 hover:text-gray-600"
                      >
                        <Icons.X className="w-4 h-4" />
                      </button>
                      <Picker
                        data={data}
                        onEmojiSelect={(emoji: any) => {
                          handleReaction(message.id, emoji.native);
                          setShowReactionPicker(null);
                        }}
                        theme="light"
                      />
                    </div>
                  </div>
                )}

                {/* Reactions Display */}
                {message.reactions.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {message.reactions.map((reaction, index) => {
                      const hasReacted = reaction.users.includes(currentUser?.userId);
                      return (
                        <button
                          key={`${reaction.emoji}-${index}`}
                          onClick={() => handleReaction(message.id, reaction.emoji)}
                          className={`px-2 py-0.5 rounded-full text-xs ${
                            hasReacted
                              ? isOwnMessage
                                ? 'bg-blue-500 text-white'
                                : 'bg-blue-100 text-blue-800'
                              : isOwnMessage
                                ? 'bg-blue-700 text-white'
                                : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          <span>{reaction.emoji} {reaction.users.length}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="flex items-center justify-end mt-1">
                  <MessageDeliveryStatus status={message.deliveryStatus} readBy={message.readBy} />
                </div>
              </div>
            </div>
            {isOwnMessage && (
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center ml-3 flex-shrink-0">
                <span className="text-sm font-medium text-blue-700">YU</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const headerActions = (
    <div className="flex items-center space-x-3">
      <button className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors">
        <Icons.Search className="w-4 h-4 mr-2" />
        Search
      </button>
      <button className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors">
        <Icons.Settings className="w-4 h-4 mr-2" />
        Settings
      </button>
    </div>
  );

  // Function to handle message reactions
  const handleReaction = (messageId: string, emoji: string) => {
    const updateMessages = (messages: Message[]) => {
      return messages.map(msg => {
        if (msg.id === messageId) {
          const existingReactionIndex = msg.reactions.findIndex(r => r.emoji === emoji);
          let newReactions = [...msg.reactions];

          if (existingReactionIndex >= 0) {
            // Toggle user's reaction
            const userIndex = newReactions[existingReactionIndex].users.indexOf(currentUser?.userId);
            if (userIndex >= 0) {
              // Remove user's reaction
              const updatedUsers = newReactions[existingReactionIndex].users.filter(u => u !== currentUser?.userId);
              if (updatedUsers.length === 0) {
                // Remove the reaction entirely if no users left
                newReactions = newReactions.filter(r => r.emoji !== emoji);
              } else {
                newReactions[existingReactionIndex] = {
                  ...newReactions[existingReactionIndex],
                  users: updatedUsers
                };
              }
            } else {
              // Add user's reaction
              newReactions[existingReactionIndex] = {
                ...newReactions[existingReactionIndex],
                users: [...newReactions[existingReactionIndex].users, currentUser?.userId]
              };
            }
          } else {
            // Add new reaction
            newReactions.push({
              emoji,
              users: [currentUser?.userId]
            });
          }

          return {
            ...msg,
            reactions: newReactions
          };
        }
        return msg;
      });
    };

    if (selectedUser) {
      setDirectMessages(prev => ({
        ...prev,
        [selectedUser.id]: updateMessages(prev[selectedUser.id] || [])
      }));
    } else {
      setChannelMessages(prev => ({
        ...prev,
        [selectedChannel]: updateMessages(prev[selectedChannel] || [])
      }));
    }
  };

  // Helper function to get user names from IDs
  const getUserName = (userId: string) => {
    const user = users.find(u => u.id === userId);
    return user ? `${user.firstName} ${user.lastName}` : 'Unknown User';
  };

  // Function to handle message editing
  const handleEditMessage = (messageId: string) => {
    const message = getCurrentMessages().find(m => m.id === messageId);
    if (message && message.senderId === currentUser?.userId) { // Only allow editing own messages
      setEditingMessageId(messageId);
      setEditInput(message.content);
    }
  };

  // Function to save edited message
  const handleSaveEdit = (messageId: string) => {
    const updateMessage = (message: Message) => {
      if (message.id === messageId) {
        return {
          ...message,
          content: editInput,
          isEdited: true
        };
      }
      return message;
    };

    if (selectedUser) {
      setDirectMessages(prev => ({
        ...prev,
        [selectedUser.id]: prev[selectedUser.id].map(updateMessage)
      }));
    } else {
      setChannelMessages(prev => ({
        ...prev,
        [selectedChannel]: prev[selectedChannel].map(updateMessage)
      }));
    }
    setEditingMessageId(null);
    setEditInput('');
  };

  // Function to handle message deletion
  const handleDeleteMessage = (messageId: string) => {
    if (selectedUser) {
      setDirectMessages(prev => ({
        ...prev,
        [selectedUser.id]: prev[selectedUser.id].filter(m => m.id !== messageId)
      }));
    } else {
      setChannelMessages(prev => ({
        ...prev,
        [selectedChannel]: prev[selectedChannel].filter(m => m.id !== messageId)
      }));
    }
  };

  // Function to handle message replies
  const handleReply = (message: Message) => {
    setReplyingTo(message);
  };

  // Update handleTyping function to use the right typing indicator based on context
  const handleTyping = () => {
    if (!isTyping) {
      setIsTyping(true);
      
      // Send typing indicator via socket
      if (selectedUser) {
        socketService.sendTypingStart(selectedUser.userId);
      } else if (selectedChannel) {
        socketService.sendChannelTyping(selectedChannel);
      }
      
      // Clear any existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Set timeout to stop typing indicator after 2 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        if (selectedUser) {
          socketService.sendTypingStop(selectedUser.userId);
        } else if (selectedChannel) {
          socketService.sendChannelTypingStop(selectedChannel);
        }
      }, 2000);
    }
  };

  // Update handleInputChange to trigger typing indicators
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    handleTyping();
  };

  // Update handleSendMessage to send to the right destination
  const handleSendMessage = () => {
    if (!input.trim() && !selectedFile) return;

    const newMessage: Message = {
      id: Math.random().toString(),
      senderId: currentUser?.userId || '',
      content: input,
      timestamp: new Date(),
      type: 'text',
      reactions: [],
      isEdited: false,
      readBy: [{ userId: currentUser?.userId || '', readAt: new Date() }],
      deliveryStatus: {
        sent: true,
        delivered: false,
        read: false,
        timestamp: new Date()
      }
    };

    // Add to local state first for optimistic UI update
    if (selectedUser) {
      setDirectMessages(prev => ({
        ...prev,
        [selectedUser.userId]: [...(prev[selectedUser.userId] || []), newMessage]
      }));
      
      // Send via socket
      socketService.sendPrivateMessage(selectedUser.userId, newMessage);
    } else if (selectedChannel) {
      setChannelMessages(prev => ({
        ...prev,
        [selectedChannel]: [...(prev[selectedChannel] || []), newMessage]
      }));
      
      // Send via socket
      socketService.sendChannelMessage(selectedChannel, newMessage);
    }

    setInput('');
    setSelectedFile(null);
    setIsTyping(false);
    
    // Clear typing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    
    // Stop typing indicator
    if (selectedUser) {
      socketService.sendTypingStop(selectedUser.userId);
    } else if (selectedChannel) {
      socketService.sendChannelTypingStop(selectedChannel);
    }
  };

  // Enhanced typing indicator component
  const TypingIndicator = ({ users }: { users: TypingStatus[] }) => {
    if (users.length === 0) return null;
    
    // Filter out old typing indicators (more than 5 seconds old)
    const activeUsers = users.filter(
      user => new Date().getTime() - new Date(user.timestamp).getTime() < 5000
    );
    
    if (activeUsers.length === 0) return null;

    return (
      <div className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-500">
        <div className="flex space-x-1">
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
        <span>
          {activeUsers.length === 1
            ? `${getUserName(activeUsers[0].userId)} is typing...`
            : `${activeUsers.length} people are typing...`}
        </span>
      </div>
    );
  };

  // Enhanced message delivery status component
  const MessageDeliveryStatus = ({ status, readBy }: { status?: DeliveryStatus, readBy: ReadReceipt[] }) => {
    // For messages in channels or direct messages
    const isRead = readBy.some(receipt => receipt.userId !== currentUser?.userId);
    const latestReadTime = isRead 
      ? new Date(Math.max(...readBy.map(r => new Date(r.readAt).getTime())))
      : null;
    
    // For direct messages with delivery status
    if (status) {
      return (
        <div className="flex items-center space-x-1 text-xs text-gray-400">
          {status.read ? (
            <div className="flex items-center">
              <Icons.CheckCheck className="w-4 h-4 text-blue-500" />
              <span className="ml-1">{latestReadTime ? format(latestReadTime, 'HH:mm') : ''}</span>
            </div>
          ) : status.delivered ? (
            <Icons.CheckCheck className="w-4 h-4" />
          ) : status.sent ? (
            <Icons.Check className="w-4 h-4" />
          ) : null}
        </div>
      );
    }
    
    // For channel messages
    return isRead ? (
      <div className="flex items-center space-x-1 text-xs text-gray-400">
        <Icons.CheckCheck className="w-4 h-4 text-blue-500" />
        <span className="ml-1">{latestReadTime ? format(latestReadTime, 'HH:mm') : ''}</span>
      </div>
    ) : (
      <Icons.Check className="w-4 h-4 text-gray-400" />
    );
  };

  // Add back the resize handler functions
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartXRef.current = e.clientX;
    dragStartWidthRef.current = sidebarWidth;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      
      const deltaX = e.clientX - dragStartXRef.current;
      const newWidth = Math.min(Math.max(200, dragStartWidthRef.current + deltaX), 400);
      
      if (sidebarRef.current) {
        // Use transform for smooth animation
        sidebarRef.current.style.width = `${newWidth}px`;
      }
    };

    const handleMouseUp = () => {
      if (!isDragging) return;
      
      setIsDragging(false);
      document.body.style.removeProperty('cursor');
      document.body.style.removeProperty('user-select');

      // Set final width
      if (sidebarRef.current) {
        const finalWidth = parseInt(sidebarRef.current.style.width, 10);
        setSidebarWidth(finalWidth);
      }
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('mouseleave', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mouseleave', handleMouseUp);
    };
  }, [isDragging]);

  return (
    <div className="h-full flex flex-col overflow-x-hidden">
      <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
          >
            {isSidebarOpen ? (
              <Icons.PanelLeftClose className="w-5 h-5" />
            ) : (
              <Icons.PanelLeftOpen className="w-5 h-5" />
            )}
          </button>
          <h1 className="ml-3 text-xl font-semibold text-gray-900">
            {selectedUser ? `Chat with ${selectedUser.firstName} ${selectedUser.lastName}` : "Team Chat"}
          </h1>
        </div>
        <div className="flex items-center space-x-2">
          <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg">
            <Icons.Search className="w-5 h-5" />
          </button>
          <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg">
            <Icons.Settings className="w-5 h-5" />
          </button>
        </div>
      </div>
      
      <div className="flex-1 flex overflow-hidden">
        {isSidebarOpen && (
          <>
            <div 
              ref={sidebarRef}
              style={{ 
                width: `${sidebarWidth}px`,
                transition: isDragging ? 'none' : 'width 0.1s ease-out'
              }}
              className="flex-shrink-0 flex flex-col bg-gray-50 border-r border-gray-200"
            >
              {/* Channels Section */}
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Channels</h3>
                  <button 
                    onClick={() => setShowChannelModal(true)}
                    className="p-1 text-gray-400 hover:text-gray-600 rounded"
                  >
                    <Icons.Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-2">
                  {channels.map(channel => (
                    <button
                      key={channel.id}
                      onClick={() => handleChannelSelect(channel.id)}
                      className={`w-full flex items-center px-3 py-2 rounded-lg transition-colors ${
                        selectedChannel === channel.id
                          ? 'bg-blue-50 text-blue-600'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <span className="text-lg mr-2">#</span>
                      <span className="flex-1 text-left font-medium">{channel.name}</span>
                      {channel.unread && (
                        <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-600 rounded-full">
                          {channel.unread}
                        </span>
                      )}
                      {channel.type === 'private' && (
                        <Icons.Lock className="w-4 h-4 ml-2 text-gray-400" />
                      )}
                      {channel.permissions?.canManage.includes(currentUser?.userId) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedChannelSettings(channel);
                            setShowChannelSettings(true);
                          }}
                          className="p-1 ml-2 text-gray-400 hover:text-gray-600 rounded"
                        >
                          <Icons.Settings className="w-4 h-4" />
                        </button>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Team Members Section */}
              <div className="flex-1 p-4 overflow-y-auto">
            <div className="space-y-1">
                  <div className="px-3 py-2">
                    <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Team Members ({users.filter(m => m.status === 'online' && m.userId !== currentUser?.userId).length} Online)
                    </h2>
                  </div>
                  {users
                    .filter(member => member.userId !== currentUser?.userId) // Filter out current user
                    .map(member => (
                    <button
                        key={member.id}
                        onClick={() => {
                          handleUserSelect(member);
                          if (selectedUser?.id === member.id) {
                            const updatedMessages = directMessages[member.id]?.map(message => ({
                              ...message,
                              readBy: message.readBy.some(r => r.userId === currentUser?.userId)
                                ? message.readBy
                                : [...message.readBy, { userId: currentUser?.userId, readAt: new Date() }]
                            }));

                            setDirectMessages(prev => ({
                              ...prev,
                              [member.id]: updatedMessages || []
                            }));

                            setUnreadCounts(prev => ({
                              ...prev,
                              [member.id]: 0
                            }));
                          }
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                          selectedUser?.id === member.id
                            ? 'bg-blue-50 text-blue-600'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <div className="flex items-center min-w-0">
                  <div className="relative">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-sm font-medium text-blue-700">
                                {member.firstName.charAt(0) + member.lastName.charAt(0)}
                          </span>
                        </div>
                            <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 border-2 border-white rounded-full ${getStatusColor(member.status)}`}></div>
                          </div>
                          <div className="ml-3 flex-1 min-w-0">
                            <div className="flex items-center">
                              <span className="text-sm font-medium truncate">{`${member.firstName} ${member.lastName}`}</span>
                              {member.status === 'online' && (
                                <span className="ml-2 px-2 py-0.5 text-xs font-medium text-green-700 bg-green-100 rounded-full">
                                  Online
                                </span>
                              )}
                        </div>
                            <p className="text-xs text-gray-500 truncate">{member.role}</p>
                          </div>
                        </div>
                        {unreadCounts[member.id] > 0 && (
                          <span className="ml-3 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 bg-red-600 rounded-full">
                            {unreadCounts[member.id]}
                          </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div
              className={`w-1 bg-transparent hover:bg-blue-500 relative ${
                isDragging ? 'bg-blue-500' : ''
              }`}
              onMouseDown={handleMouseDown}
            >
              <div 
                className={`absolute inset-y-0 -left-2 right-2 cursor-col-resize ${
                  isDragging ? 'bg-blue-100 bg-opacity-50' : ''
                }`}
              />
            </div>
          </>
        )}

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col bg-gray-50 relative min-w-0">
          {/* Chat Header */}
          <div className="bg-white px-6 py-4 border-b border-gray-200">
              <div className="flex items-center">
                {selectedUser ? (
                  <>
                    <div className="relative mr-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-blue-700">
                          {selectedUser.firstName.charAt(0) + selectedUser.lastName.charAt(0)}
                        </span>
                      </div>
                      <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 border-2 border-white rounded-full ${getStatusColor(selectedUser.status)}`}></div>
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">{`${selectedUser.firstName} ${selectedUser.lastName}`}</h2>
                      <p className="text-sm text-gray-500">{selectedUser.role}</p>
                    </div>
                  </>
                ) : (
                  <>
                    <Icons.Hash className="w-5 h-5 text-gray-400 mr-2" />
                    <h2 className="text-lg font-semibold text-gray-900">
                      {channels.find(c => c.id === selectedChannel)?.name || 'General'}
                    </h2>
                    <span className="ml-2 text-sm text-gray-500">
                      {channels.find(c => c.id === selectedChannel)?.members} members
                    </span>
                  </>
                )}
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 space-y-6">
            {getCurrentMessages().length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <Icons.MessageCircle className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {selectedUser 
                    ? `Start a conversation with ${selectedUser.firstName} ${selectedUser.lastName}`
                    : `Welcome to #${selectedChannel}`
                  }
                </h3>
                <p className="text-gray-500">
                  {selectedUser
                    ? "Send a message to begin chatting"
                    : "This is the beginning of your conversation."
                  }
                </p>
              </div>
            ) : (
              getCurrentMessages().map((message, index) => (
                <React.Fragment key={message.id}>
                  {index === 0 || formatDate(getCurrentMessages()[index - 1].timestamp) !== formatDate(message.timestamp) ? (
                    <div className="flex items-center justify-center my-4">
                      <div className="bg-white px-3 py-1 rounded-full border border-gray-200 text-xs font-medium text-gray-500">
                        {formatDate(message.timestamp)}
                      </div>
                    </div>
                  ) : null}
                  {renderMessage(message)}
                </React.Fragment>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* File Upload Progress */}
          {fileUploads.length > 0 && (
            <div className="bg-white border-t border-gray-200 p-4">
              <div className="space-y-4">
                {fileUploads.map((upload, index) => (
                  <div key={index} className="flex items-center">
                    <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center mr-3">
                      {upload.preview ? (
                        <img 
                          src={upload.preview} 
                          alt="" 
                          className="w-full h-full object-cover rounded"
                        />
                      ) : (
                        <Icons.File className="w-6 h-6 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-900 truncate">
                          {upload.file.name}
                        </span>
                        {upload.error ? (
                          <span className="text-xs text-red-500">{upload.error}</span>
                        ) : (
                          <span className="text-xs text-gray-500">
                            {upload.progress}%
                          </span>
                        )}
                      </div>
                      {!upload.error && (
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div
                            className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                            style={{ width: `${upload.progress}%` }}
                          />
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        setFileUploads(prev => 
                          prev.filter(u => u.file !== upload.file)
                        );
                      }}
                      className="ml-3 p-1 text-gray-400 hover:text-gray-600 rounded-lg"
                    >
                      <Icons.X className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reply Input */}
          {replyingTo && (
            <div className="bg-gray-50 border-t border-gray-200 p-2">
              <div className="flex items-center justify-between bg-white rounded-lg p-2 mx-4">
                <div className="flex items-center">
                  <Icons.Reply className="w-4 h-4 text-gray-400 mr-2" />
                  <span className="text-sm text-gray-600">
                    Replying to <span className="font-medium">{getUserName(replyingTo.senderId)}</span>
                  </span>
                </div>
                <button
                  onClick={() => setReplyingTo(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <Icons.X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Message Input */}
          <div className="bg-white border-t border-gray-200 p-4">
            <div className="flex items-end space-x-3">
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Icons.Paperclip className="w-5 h-5" />
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                className="hidden"
                multiple
                accept={ALLOWED_FILE_TYPES.join(',')}
              />
              <div className="flex-1 relative">
                <div className="relative">
                  <textarea
                    value={replyingTo ? replyInput : input}
                    onChange={(e) => replyingTo ? setReplyInput(e.target.value) : setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        replyingTo ? handleSendReply() : handleSend();
                      }
                    }}
                    placeholder={
                      replyingTo
                        ? `Reply to ${getUserName(replyingTo.senderId)}...`
                        : selectedUser 
                          ? `Message ${selectedUser.firstName} ${selectedUser.lastName}`
                          : `Message #${channels.find(c => c.id === selectedChannel)?.name || 'general'}`
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    rows={1}
                    style={{ minHeight: '44px', maxHeight: '120px' }}
                  />
                </div>
                
                  {showEmojiPicker && (
                    <div 
                    className="absolute bottom-full right-0 mb-2 z-50"
                      style={{ 
                      filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))',
                      maxWidth: '100vw',
                      overflow: 'auto'
                      }}
                    >
                      <div className="relative bg-white rounded-lg p-2">
                        <button
                          onClick={() => setShowEmojiPicker(false)}
                          className="absolute -top-2 -right-2 p-1 bg-white rounded-full shadow-md text-gray-400 hover:text-gray-600 z-10"
                        >
                          <Icons.X className="w-4 h-4" />
                        </button>
                      <div className="overflow-x-auto">
                        <Picker 
                          data={data}
                          onEmojiSelect={(emoji: any) => {
                            if (replyingTo) {
                              setReplyInput(prev => prev + emoji.native);
                            } else {
                              setInput(prev => prev + emoji.native);
                            }
                            setShowEmojiPicker(false);
                          }}
                          theme="light"
                        />
                      </div>
                      </div>
                    </div>
                  )}
                </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={replyingTo ? handleSendReply : handleSend}
                  disabled={replyingTo ? !replyInput.trim() : !input.trim()}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    (replyingTo ? replyInput.trim() : input.trim())
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <Icons.Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showChannelModal && (
        <ChannelModal
          isOpen={showChannelModal}
          onClose={() => setShowChannelModal(false)}
          onSuccess={() => {
            // Refresh channels after creating/editing
            const fetchChannels = async () => {
              try {
                const response = await API.get('/chat/channels');
                if (response.data?.data) {
                  const mappedChannels = response.data.data.map((channel: any) => ({
                    id: channel.id,
                    name: channel.name,
                    type: channel.type,
                    members: 0,
                    description: channel.description,
                    createdBy: channel.createdBy,
                    permissions: {
                      canPost: [],
                      canInvite: [],
                      canManage: []
                    }
                  }));
                  setChannels(mappedChannels);
                }
              } catch (error) {
                console.error('Failed to fetch channels:', error);
              }
            };
            fetchChannels();
          }}
        />
      )}
      {showChannelSettings && selectedChannel && (
        <ChannelSettingsModal
          isOpen={showChannelSettings}
          onClose={() => setShowChannelSettings(false)}
          channel={{
            id: selectedChannel,
            name: channels.find(c => c.id === selectedChannel)?.name || '',
            description: channels.find(c => c.id === selectedChannel)?.description,
            type: channels.find(c => c.id === selectedChannel)?.type || 'public',
            members: [],
            createdBy: channels.find(c => c.id === selectedChannel)?.createdBy
          }}
          onSuccess={() => {
            // Refresh channels after updating
            const fetchChannels = async () => {
              try {
                const response = await API.get('/chat/channels');
                if (response.data?.data) {
                  const mappedChannels = response.data.data.map((channel: any) => ({
                    id: channel.id,
                    name: channel.name,
                    type: channel.type,
                    members: 0,
                    description: channel.description,
                    createdBy: channel.createdBy,
                    permissions: {
                      canPost: [],
                      canInvite: [],
                      canManage: []
                    }
                  }));
                  setChannels(mappedChannels);
                }
              } catch (error) {
                console.error('Failed to fetch channels:', error);
              }
            };
            fetchChannels();
          }}
        />
      )}
    </div>
  );
};

export default TeamChat;


