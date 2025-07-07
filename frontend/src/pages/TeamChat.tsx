// src/Pages/TeamChat.tsx
import React, { useState, useRef, useEffect } from 'react';
import * as Icons from 'lucide-react';
import PageHeader from '../components/Common/PageHeader';
import StatusBadge from '../components/Common/StatusBadge';
import { data } from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import { format } from 'date-fns';

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
  name: string;
  avatar?: string;
  status: 'online' | 'away' | 'offline';
  role: string;
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
  reactions: Array<{
    emoji: string;
    users: string[];
  }>;
  isEdited: boolean;
  readBy: Array<{
    userId: string;
    readAt: Date;
  }>;
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
  const [selectedChannel, setSelectedChannel] = useState<string>('1');
  const [channels] = useState<Channel[]>([
    {
      id: '1',
      name: 'General',
      type: 'public',
      members: 5,
      unread: 2,
    },
    {
      id: '2',
      name: 'Announcements',
      type: 'public',
      members: 5,
      unread: 1,
    },
    {
      id: '3',
      name: 'Team-A',
      type: 'public',
      members: 3,
    },
    {
      id: '4',
      name: 'Team-B',
      type: 'private',
      members: 2,
    }
  ]);
  
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      senderId: '1',
      sender: 'John Doe',
      content: 'Welcome to the team chat! 👋',
      timestamp: new Date(),
      type: 'text',
      channelId: '1',
      reactions: [],
      isEdited: false,
      readBy: [],
      threadMessages: []
    },
    {
      id: '2',
      senderId: '2',
      sender: 'Jane Smith',
      content: 'Thanks for the warm welcome!',
      timestamp: new Date(),
      type: 'text',
      channelId: '1',
      reactions: [],
      isEdited: false,
      readBy: [],
      threadMessages: []
    }
  ]);
  
  const [users] = useState<User[]>([
    {
      id: '1',
      name: 'John Doe',
      status: 'online',
      role: 'Admin'
    },
    {
      id: '2',
      name: 'Jane Smith',
      status: 'online',
      role: 'Sales Manager'
    },
    {
      id: '3',
      name: 'Bob Johnson',
      status: 'away',
      role: 'Developer'
    },
    {
      id: '4',
      name: 'Sarah Wilson',
      status: 'offline',
      role: 'Designer'
    }
  ]);
  
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const handleUserSelect = (user: User) => {
    setSelectedUser(user);
    setSelectedChannel('');
  };

  const handleChannelSelect = (channelId: string) => {
    setSelectedChannel(channelId);
    setSelectedUser(null);
  };

  const handleSend = () => {
    if (!input.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      senderId: '1',
      sender: 'John Doe',
      content: input,
      timestamp: new Date(),
      type: 'text',
      channelId: selectedChannel || selectedUser?.id || '1',
      reactions: [],
      isEdited: false,
      readBy: [],
      threadMessages: []
    };
    
    setMessages(prev => [...prev, newMessage]);
    setInput('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getCurrentMessages = () => {
    const channelId = selectedChannel || selectedUser?.id || '1';
    return messages.filter(msg => msg.channelId === channelId);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'away': return 'bg-yellow-500';
      case 'offline': return 'bg-gray-400';
      default: return 'bg-gray-400';
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const renderMessage = (message: Message) => {
    const isCurrentUser = message.senderId === '1';

      return (
      <div key={message.id} className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} mb-4`}>
        <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
          isCurrentUser 
            ? 'bg-blue-500 text-white' 
            : 'bg-gray-100 text-gray-800'
        }`}>
          {!isCurrentUser && (
            <div className="text-xs font-semibold mb-1">{message.sender}</div>
          )}
          <div className="text-sm">{message.content}</div>
          <div className={`text-xs mt-1 ${
            isCurrentUser ? 'text-blue-100' : 'text-gray-500'
          }`}>
            {formatTime(message.timestamp)}
                    </div>
        </div>
      </div>
    );
  };

    return (
    <div className="h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className={`${isSidebarOpen ? 'w-64' : 'w-16'} bg-white border-r border-gray-200 flex flex-col transition-all duration-300`}>
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className={`font-semibold text-gray-800 ${!isSidebarOpen && 'hidden'}`}>
              Team Chat
            </h2>
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-1 rounded hover:bg-gray-100"
            >
              <Icons.Menu className="w-5 h-5" />
          </button>
        </div>
      </div>
      
        {/* Channels */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            <div className={`text-sm font-medium text-gray-600 mb-2 ${!isSidebarOpen && 'hidden'}`}>
              Channels
                </div>
            <div className="space-y-1">
                  {channels.map(channel => (
                    <button
                      key={channel.id}
                      onClick={() => handleChannelSelect(channel.id)}
                  className={`w-full flex items-center p-2 rounded-lg hover:bg-gray-50 transition-colors ${
                    selectedChannel === channel.id ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                  }`}
                >
                  <Icons.Hash className="w-4 h-4 mr-2" />
                  {isSidebarOpen && (
                    <>
                      <span className="flex-1 text-left">{channel.name}</span>
                      {channel.unread && (
                        <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1">
                          {channel.unread}
                        </span>
                      )}
                    </>
                      )}
                    </button>
                  ))}
                </div>
              </div>

          {/* Users */}
          <div className="p-4">
            <div className={`text-sm font-medium text-gray-600 mb-2 ${!isSidebarOpen && 'hidden'}`}>
              Online Users
                  </div>
            <div className="space-y-1">
              {users.map(user => (
                    <button
                  key={user.id}
                  onClick={() => handleUserSelect(user)}
                  className={`w-full flex items-center p-2 rounded-lg hover:bg-gray-50 transition-colors ${
                    selectedUser?.id === user.id ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                  }`}
                >
                  <div className="relative">
                    <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                      <span className="text-xs font-semibold">
                        {user.name.split(' ').map(n => n[0]).join('')}
                          </span>
                        </div>
                    <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${getStatusColor(user.status)}`} />
                          </div>
                  {isSidebarOpen && (
                    <div className="ml-3 flex-1 text-left">
                      <div className="font-medium">{user.name}</div>
                      <div className="text-xs text-gray-500">{user.role}</div>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
              <div className="flex items-center">
                {selectedUser ? (
                  <>
                  <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center mr-3">
                    <span className="text-sm font-semibold">
                          {selectedUser.name.split(' ').map(n => n[0]).join('')}
                        </span>
                    </div>
                    <div>
                    <h3 className="font-semibold text-gray-800">{selectedUser.name}</h3>
                    <div className="flex items-center text-sm text-gray-500">
                      <div className={`w-2 h-2 rounded-full mr-2 ${getStatusColor(selectedUser.status)}`} />
                      {selectedUser.status}
                    </div>
                    </div>
                  </>
                ) : (
                  <>
                  <Icons.Hash className="w-6 h-6 text-gray-400 mr-2" />
                  <div>
                    <h3 className="font-semibold text-gray-800">
                      {channels.find(c => c.id === selectedChannel)?.name || 'General'}
                </h3>
                    <div className="text-sm text-gray-500">
                      {channels.find(c => c.id === selectedChannel)?.members || 0} members
              </div>
                      </div>
                </>
              )}
          </div>
            <div className="flex items-center space-x-2">
              <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded">
                <Icons.Phone className="w-5 h-5" />
              </button>
              <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded">
                <Icons.Video className="w-5 h-5" />
              </button>
              <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded">
                <Icons.Info className="w-5 h-5" />
                    </button>
                  </div>
              </div>
            </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
          <div className="space-y-4">
            {getCurrentMessages().map(renderMessage)}
            <div ref={messagesEndRef} />
                </div>
              </div>

          {/* Message Input */}
          <div className="bg-white border-t border-gray-200 p-4">
          <div className="flex items-center space-x-2">
            <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded">
                <Icons.Paperclip className="w-5 h-5" />
              </button>
              <div className="flex-1 relative">
                  <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type a message..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    rows={1}
                  />
                </div>
            <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded">
              <Icons.Smile className="w-5 h-5" />
                        </button>
                <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              <Icons.Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
    </div>
  );
};

export default TeamChat;

