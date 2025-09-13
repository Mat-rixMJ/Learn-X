'use client';

import React, { useState, useEffect, useRef } from 'react';

interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  message: string;
  timestamp: Date;
  messageType?: 'chat' | 'system' | 'translation';
  translations?: { [language: string]: string };
}

interface ChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  currentUserId: string;
  translationEnabled?: boolean;
  selectedLanguage?: string;
}

export default function ChatPanel({
  messages,
  onSendMessage,
  currentUserId,
  translationEnabled = false,
  selectedLanguage = 'en'
}: ChatPanelProps) {
  const [newMessage, setNewMessage] = useState('');
  const [showTranslations, setShowTranslations] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim()) {
      onSendMessage(newMessage);
      setNewMessage('');
    }
  };

  const formatTime = (timestamp: Date) => {
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getMessageText = (message: ChatMessage) => {
    if (translationEnabled && showTranslations && message.translations?.[selectedLanguage]) {
      return message.translations[selectedLanguage];
    }
    return message.message;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="px-4 py-3 border-b bg-gray-50">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Live Chat</h3>
          {translationEnabled && (
            <button
              onClick={() => setShowTranslations(!showTranslations)}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${
                showTranslations 
                  ? 'bg-blue-100 text-blue-800' 
                  : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
              }`}
            >
              {showTranslations ? '🌐 Translated' : '🌐 Original'}
            </button>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <div className="text-4xl mb-2">💬</div>
            <p>No messages yet</p>
            <p className="text-sm">Start a conversation!</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.userId === currentUserId ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-3 py-2 rounded-lg ${
                  message.userId === currentUserId
                    ? 'bg-blue-500 text-white'
                    : message.messageType === 'system'
                    ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                    : 'bg-gray-200 text-gray-900'
                }`}
              >
                {/* Message Header */}
                {message.userId !== currentUserId && message.messageType !== 'system' && (
                  <div className="text-xs font-semibold mb-1 text-gray-600">
                    {message.userName}
                  </div>
                )}

                {/* Message Content */}
                <div className="text-sm">{getMessageText(message)}</div>

                {/* Translation Toggle for Individual Messages */}
                {translationEnabled && 
                 message.translations && 
                 Object.keys(message.translations).length > 0 && (
                  <div className="mt-1">
                    <button
                      onClick={() => {
                        // Toggle translation for this specific message
                        // This would require additional state management
                      }}
                      className="text-xs opacity-70 hover:opacity-100"
                    >
                      🔄 Translate
                    </button>
                  </div>
                )}

                {/* Timestamp */}
                <div className={`text-xs mt-1 ${
                  message.userId === currentUserId 
                    ? 'text-blue-100' 
                    : 'text-gray-500'
                }`}>
                  {formatTime(message.timestamp)}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="border-t bg-white p-4">
        <form onSubmit={handleSendMessage} className="flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            maxLength={500}
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            Send
          </button>
        </form>
        
        {/* Character Count */}
        <div className="text-xs text-gray-500 mt-1 text-right">
          {newMessage.length}/500
        </div>
      </div>
    </div>
  );
}