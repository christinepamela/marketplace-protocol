'use client';

import { useState, useEffect, useRef } from 'react';
import { Identity } from '@/types/protocol';

interface Message {
  id: string;
  sender: string;
  content: string;
  timestamp: number;
  encrypted: boolean;
}

interface NostrChatProps {
  currentUser: Identity;
  recipientUser: Identity;
  orderId?: string;
}

export default function NostrChat({ currentUser, recipientUser, orderId }: NostrChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Simulated message fetch - in real implementation, this would connect to Nostr
  useEffect(() => {
    const fetchMessages = async () => {
      setLoading(true);
      try {
        // This would actually fetch messages from Nostr network
        // For now, we'll simulate some messages
        const sampleMessages: Message[] = [
          {
            id: '1',
            sender: recipientUser.public_profile.display_name,
            content: 'Hello, I have a question about the order.',
            timestamp: Date.now() - 100000,
            encrypted: true,
          },
          {
            id: '2',
            sender: currentUser.public_profile.display_name,
            content: 'Sure, how can I help?',
            timestamp: Date.now() - 50000,
            encrypted: true,
          },
        ];
        setMessages(sampleMessages);
      } catch (error) {
        console.error('Error fetching messages:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, [currentUser.public_profile.display_name, recipientUser.public_profile.display_name]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    // In real implementation, this would:
    // 1. Encrypt the message using recipient's public key
    // 2. Create and sign a Nostr event
    // 3. Publish to Nostr relays
    
    const message: Message = {
      id: Date.now().toString(),
      sender: currentUser.public_profile.display_name,
      content: newMessage,
      timestamp: Date.now(),
      encrypted: true,
    };

    setMessages(prev => [...prev, message]);
    setNewMessage('');
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[600px] bg-white rounded-lg shadow">
      {/* Chat Header */}
      <div className="px-4 py-3 border-b">
        <div className="flex items-center">
          <div className="flex-1">
            <h3 className="text-lg font-medium text-gray-900">
              Chat with {recipientUser.public_profile.display_name}
            </h3>
            {orderId && (
              <p className="text-sm text-gray-500">
                Order ID: {orderId}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.sender === currentUser.public_profile.display_name
                ? 'justify-end'
                : 'justify-start'
            }`}
          >
            <div
              className={`rounded-lg px-4 py-2 max-w-[70%] ${
                message.sender === currentUser.public_profile.display_name
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <div className="text-sm">{message.content}</div>
              <div
                className={`text-xs mt-1 ${
                  message.sender === currentUser.public_profile.display_name
                    ? 'text-blue-200'
                    : 'text-gray-500'
                }`}
              >
                {formatTime(message.timestamp)}
                {message.encrypted && ' 🔒'}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <form onSubmit={handleSendMessage} className="p-4 border-t">
        <div className="flex space-x-4">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
