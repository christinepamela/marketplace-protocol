'use client';

import { useState, useEffect } from 'react';
import { Identity } from '@/types/protocol';
import Link from 'next/link';

interface Conversation {
  id: string;
  participant: Identity;
  lastMessage: {
    content: string;
    timestamp: number;
    unread: boolean;
  };
  orderId?: string;
}

interface MessageInboxProps {
  currentUser: Identity;
  onConversationSelect?: (conversation: Conversation) => void;
}

export default function MessageInbox({ currentUser, onConversationSelect }: MessageInboxProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchConversations = async () => {
      setLoading(true);
      try {
        // In real implementation, this would:
        // 1. Fetch conversations from Nostr
        // 2. Decrypt messages using user's private key
        // 3. Group messages by sender/conversation

        // Simulate conversations
        const sampleConversations: Conversation[] = [
          {
            id: '1',
            participant: {
              type: 'verified',
              did: 'user1',
              verification: {
                method: 'nostr',
                status: 'verified',
              },
              public_profile: {
                display_name: 'John Seller',
                location: 'MY',
                business_type: 'manufacturer'
              }
            },
            lastMessage: {
              content: 'When will the order be shipped?',
              timestamp: Date.now() - 1000000,
              unread: true
            },
            orderId: 'order123'
          },
          {
            id: '2',
            participant: {
              type: 'verified',
              did: 'user2',
              verification: {
                method: 'nostr',
                status: 'verified',
              },
              public_profile: {
                display_name: 'Alice Buyer',
                location: 'US',
                business_type: 'trader'
              }
            },
            lastMessage: {
              content: 'Product details received, thanks!',
              timestamp: Date.now() - 2000000,
              unread: false
            }
          },
        ];

        setConversations(sampleConversations);
      } catch (error) {
        console.error('Error fetching conversations:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();
  }, []);

  const formatTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 border-b border-gray-200 sm:px-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900">
          Messages
        </h3>
      </div>
      
      <ul role="list" className="divide-y divide-gray-200">
        {conversations.map((conversation) => (
          <li
            key={conversation.id}
            className={`hover:bg-gray-50 cursor-pointer ${
              conversation.lastMessage.unread ? 'bg-blue-50' : ''
            }`}
            onClick={() => onConversationSelect?.(conversation)}
          >
            <div className="px-4 py-4 sm:px-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                      <span className="text-lg font-medium text-gray-500">
                        {conversation.participant.public_profile.display_name[0]}
                      </span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <div className="flex items-center">
                      <h4 className="text-sm font-medium text-gray-900">
                        {conversation.participant.public_profile.display_name}
                      </h4>
                      {conversation.participant.type === 'verified' && (
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                          Verified
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-gray-500 truncate">
                      {conversation.lastMessage.content}
                    </p>
                  </div>
                </div>
                <div className="ml-6 flex flex-col items-end">
                  <p className="text-xs text-gray-500">
                    {formatTime(conversation.lastMessage.timestamp)}
                  </p>
                  {conversation.orderId && (
                    <p className="mt-1 text-xs text-gray-400">
                      Order: #{conversation.orderId}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </li>
        ))}

        {conversations.length === 0 && (
          <li className="px-4 py-8">
            <div className="text-center">
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                No messages yet
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Start a conversation by viewing a product or order.
              </p>
            </div>
          </li>
        )}
      </ul>
    </div>
  );
}
