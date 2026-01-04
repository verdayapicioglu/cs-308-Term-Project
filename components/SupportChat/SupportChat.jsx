import React, { useState, useEffect, useRef } from 'react';
import './SupportChat.css';

const API_BASE_URL = 'http://localhost:8000/api/support';

function SupportChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const wasAuthenticatedRef = useRef(false);
  const wsRef = useRef(null); // Use ref to always have current WebSocket

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize conversation when chat opens - always create fresh
  useEffect(() => {
    if (isOpen) {
      // Always clear old conversation and create new one when chat opens
      setConversationId(null);
      setMessages([]);
      // Small delay to ensure state is cleared before creating new conversation
      setTimeout(() => {
        createConversation();
      }, 100);
    } else {
      // When chat closes, clear everything
      setConversationId(null);
      setMessages([]);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    }
  }, [isOpen]);


  // WebSocket connection
  useEffect(() => {
    if (!conversationId || !isOpen) {
      // Close WebSocket if conversationId is cleared or chat is closed
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
        setIsConnected(false);
      }
      return;
    }

    // Close existing WebSocket if any
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
      setIsConnected(false);
    }

    // Use the current conversationId from the dependency
    const currentConversationId = conversationId;
    const wsUrl = `ws://localhost:8000/ws/support/chat/${currentConversationId}/`;
    const websocket = new WebSocket(wsUrl);

    websocket.onopen = () => {
      setIsConnected(true);
    };

    websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'message' || data.type === 'new_message') {
          // Handle both data.data and data.message formats
          const newMessage = data.data || data.message;
          
          if (!newMessage) {
            console.error('No message data received:', data);
            return;
          }
          
          console.log('[SUPPORT CHAT] Received message:', {
            id: newMessage.id,
            is_from_agent: newMessage.is_from_agent,
            sender_name: newMessage.sender_name,
            content: newMessage.content?.substring(0, 30)
          });
          
          // Only add message if it doesn't already exist
          setMessages(prev => {
            // Check if message already exists by ID
            if (newMessage.id && prev.some(msg => msg.id === newMessage.id)) {
              return prev;
            }
            
            // Also check by content + timestamp + is_from_agent (for messages without IDs or duplicate IDs)
            // For guest users, sender is null, so we need to check differently
            const isDuplicate = prev.some(msg => {
              const sameContent = msg.content === newMessage.content;
              const sameSender = (msg.sender === newMessage.sender) || (!msg.sender && !newMessage.sender && !msg.is_from_agent && !newMessage.is_from_agent);
              const sameAgent = msg.is_from_agent === newMessage.is_from_agent;
              
              // Safe date parsing - handle both ISO strings and Date objects
              try {
                const msgDate = new Date(msg.created_at);
                const newMsgDate = new Date(newMessage.created_at);
                const timeDiff = Math.abs(msgDate.getTime() - newMsgDate.getTime());
                return sameContent && sameSender && sameAgent && timeDiff < 2000; // Within 2 seconds
              } catch (e) {
                // If date parsing fails, only check content and sender
                return sameContent && sameSender && sameAgent;
              }
            });
            
            if (isDuplicate) {
              console.log('Duplicate message detected, skipping');
              return prev;
            }
            
            // Ensure is_from_agent is boolean - handle all possible values
            let isAgent = false;
            if (newMessage.is_from_agent === true || newMessage.is_from_agent === 'true' || newMessage.is_from_agent === 1 || newMessage.is_from_agent === '1') {
              isAgent = true;
            }
            
            let updatedMessage = { ...newMessage };
            updatedMessage.is_from_agent = isAgent;
            
            // CRITICAL FIX: Override sender_name based on is_from_agent
            // If is_from_agent is FALSE, it MUST be a customer message, show "You"
            // If is_from_agent is TRUE, it MUST be an agent message, show "Support Agent"
            if (isAgent) {
              // Agent message - ALWAYS show "Support Agent"
              updatedMessage.sender_name = 'Support Agent';
            } else {
              // Customer message - ALWAYS show "You" (because customer only sees their own messages)
              updatedMessage.sender_name = 'You';
            }
            
            return [...prev, updatedMessage];
          });
      } else if (data.type === 'history') {
        // Ignore history - always start with empty conversation
        // This prevents showing old messages from previous users/sessions after logout
        // Don't set messages here, let them remain empty
      } else if (data.type === 'typing') {
        setIsTyping(data.is_typing);
      }
      // Removed agent_joined handling - no need to show system message
      } catch (error) {
        console.error('Error parsing WebSocket message:', error, event.data);
      }
    };

    websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    websocket.onclose = () => {
      setIsConnected(false);
    };

    wsRef.current = websocket;

    return () => {
      websocket.close();
      wsRef.current = null;
      setIsConnected(false);
    };
  }, [conversationId, isOpen]);

  // Track authentication status on mount
  useEffect(() => {
    const wasAuthenticated = localStorage.getItem('is_authenticated') === 'true';
    wasAuthenticatedRef.current = wasAuthenticated;
  }, []);

  // Close chat on logout (only when transitioning from authenticated to unauthenticated)
  useEffect(() => {
    const checkAuthStatus = () => {
      const isAuthenticated = localStorage.getItem('is_authenticated') === 'true';
      const wasAuthenticated = wasAuthenticatedRef.current;

      // Only close chat if user was authenticated and now is not (logout happened)
      if (wasAuthenticated && !isAuthenticated) {
        // User logged out, close chat and disconnect completely
        if (wsRef.current) {
          wsRef.current.close();
          wsRef.current = null;
        }
        setIsOpen(false);
        setConversationId(null);
        setMessages([]);
        setInputMessage('');
        setIsConnected(false);
        setIsTyping(false);
        // Clear guest session ID so new conversation is created for guest user
        sessionStorage.removeItem('guest_session_id');
      }
      
      // Always clear conversation if user is not authenticated (prevent showing old messages)
      if (!isAuthenticated && conversationId) {
        setConversationId(null);
        setMessages([]);
        if (wsRef.current) {
          wsRef.current.close();
          wsRef.current = null;
        }
        setIsConnected(false);
        setIsTyping(false);
      }

      // Update ref for next check
      wasAuthenticatedRef.current = isAuthenticated;
    };

    // Listen for storage changes (logout)
    const handleStorageChange = (e) => {
      if (e.key === 'is_authenticated' || e.key === null) {
        checkAuthStatus();
      }
    };

    // Listen for focus (in case logout happened in same tab)
    const handleFocus = () => {
      checkAuthStatus();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [isOpen]);

  const createConversation = async () => {
    try {
      const userId = localStorage.getItem('user_id');
      const guestSessionId = !userId ? getOrCreateSessionId() : null;

      // Always create a fresh conversation - don't reuse old ones
      const response = await fetch(`${API_BASE_URL}/conversations/create/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          guest_session_id: guestSessionId
        })
      });

      if (response.ok) {
        const data = await response.json();
        setConversationId(data.id);
        
        // Start with empty messages - never show old messages from previous sessions
        setMessages([]);
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
    }
  };

  const getOrCreateSessionId = () => {
    // Always generate a new session ID for guest users to ensure new conversation
    // This ensures each chat session creates a new conversation instead of reusing old ones
    const sessionId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('guest_session_id', sessionId);
    return sessionId;
  };

  const addSystemMessage = (text) => {
    setMessages(prev => [...prev, {
      id: Date.now(),
      content: text,
      is_from_agent: false,
      message_type: 'text',
      created_at: new Date().toISOString(),
      sender_name: 'System'
    }]);
  };

  const sendMessage = async () => {
    if (!wsRef.current || !isConnected) return;

    const messageContent = inputMessage;
    setInputMessage(''); // Clear input immediately for better UX

    // Send via WebSocket - message will be added to UI when received from server
    // Don't add optimistic update to avoid duplicates
    try {
      wsRef.current.send(JSON.stringify({
        type: 'message',
        content: messageContent
      }));
    } catch (error) {
      console.error('Error sending message:', error);
      setInputMessage(messageContent); // Restore message on error
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) {
      return;
    }

    if (!conversationId) {
      alert('Please wait for conversation to initialize');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      alert('File size must be less than 10MB');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('conversation_id', conversationId.toString());

    try {
      const response = await fetch(`${API_BASE_URL}/upload/`, {
        method: 'POST',
        credentials: 'include',
        body: formData
        // Don't set Content-Type header - browser will set it automatically with boundary for FormData
        // Explicitly don't set headers to let browser handle multipart/form-data
      });

      if (response.ok) {
        const data = await response.json();
        console.log('File uploaded successfully:', data);
        // Message will be received via WebSocket
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Upload failed' }));
        console.error('Upload error:', errorData);
        alert(`File upload failed: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      alert(`Error uploading file: ${error.message}`);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Floating Chat Button */}
      {!isOpen && (
        <button 
          className="support-chat-button"
          onClick={() => setIsOpen(true)}
          title="Need help? Chat with support"
        >
          💬
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="support-chat-window">
          <div className="support-chat-header">
            <h3>Support Chat</h3>
            <div className="support-chat-status">
              <span className={`status-indicator ${isConnected ? 'online' : 'offline'}`}></span>
              {isConnected ? 'Connected' : 'Connecting...'}
            </div>
            <button 
              className="close-button"
              onClick={() => setIsOpen(false)}
            >
              ×
            </button>
          </div>

          <div className="support-chat-messages">
            {messages.length === 0 && (
              <div className="empty-state">
                <p>Start a conversation with our support team!</p>
              </div>
            )}
            {messages.map((message) => {
              // CRITICAL: Determine if message is from agent
              const rawValue = message.is_from_agent;
              let isAgent = false;
              
              if (rawValue === true || rawValue === 'true' || rawValue === 1 || rawValue === '1') {
                isAgent = true;
              }
              
              // Debug: Log first message
              if (messages.indexOf(message) === 0) {
                console.error('[SUPPORT CHAT DEBUG]', {
                  messageId: message.id,
                  raw_is_from_agent: rawValue,
                  type: typeof rawValue,
                  isAgent,
                  sender_name: message.sender_name,
                  content: message.content?.substring(0, 20)
                });
              }
              
              // SIMPLE: Use inline styles
              // Agent messages: right side, white background
              // Customer messages: left side, purple background
              const wrapperStyle = isAgent 
                ? { 
                    textAlign: 'right',
                    marginBottom: '16px',
                    clear: 'both'
                  }
                : { 
                    textAlign: 'left',
                    marginBottom: '16px',
                    clear: 'both'
                  };
              
              const messageStyle = isAgent 
                ? { 
                    display: 'inline-block',
                    maxWidth: '80%',
                    textAlign: 'left',
                    marginLeft: 'auto',
                    marginRight: '0'
                  }
                : { 
                    display: 'inline-block',
                    maxWidth: '80%',
                    textAlign: 'left',
                    marginLeft: '0',
                    marginRight: 'auto'
                  };
              
              const contentStyle = isAgent
                ? { background: 'white', color: '#1f2937', border: '1px solid #e5e7eb', padding: '10px 14px', borderRadius: '8px' }
                : { background: '#5c0f4e', color: 'white', padding: '10px 14px', borderRadius: '8px' };
              
              return (
              <div 
                key={message.id} 
                className={`message ${isAgent ? 'agent-message' : 'customer-message'}`}
                style={wrapperStyle}
              >
                <div style={messageStyle}>
                  <div className="message-header">
                    <span className="sender-name">{message.sender_name}</span>
                    <span className="message-time">
                      {new Date(message.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="message-content" style={contentStyle}>
                  {message.message_type === 'file' && message.attachments && message.attachments.length > 0 ? (
                    message.attachments.map((attachment) => (
                      <div key={attachment.id} className="file-attachment">
                        {attachment.file_type === 'image' ? (
                          <img src={attachment.file_url} alt={attachment.file_name} className="attachment-image" />
                        ) : (
                          <a href={attachment.file_url} target="_blank" rel="noopener noreferrer">
                            📎 {attachment.file_name}
                          </a>
                        )}
                      </div>
                    ))
                  ) : (
                    <p>{message.content}</p>
                  )}
                  </div>
                </div>
              </div>
              );
            })}
            {isTyping && (
              <div className="typing-indicator">
                <span>Agent is typing...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="support-chat-input">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              style={{ display: 'none' }}
              accept="image/*,video/*,.pdf"
            />
            <button 
              className="file-button"
              onClick={() => fileInputRef.current?.click()}
              title="Attach file"
            >
              📎
            </button>
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              disabled={!isConnected}
            />
            <button 
              onClick={sendMessage}
              disabled={!isConnected}
              className="send-button"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default SupportChat;

