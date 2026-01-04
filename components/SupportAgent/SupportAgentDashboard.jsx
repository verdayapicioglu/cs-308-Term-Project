import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './SupportAgent.css';

const API_BASE_URL = 'http://localhost:8000/api/support';

function SupportAgentDashboard() {
  const navigate = useNavigate();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [customerDetails, setCustomerDetails] = useState(null);
  const [ws, setWs] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Check authentication and staff status on mount
  useEffect(() => {
    const isAuthenticated = localStorage.getItem('is_authenticated') === 'true';
    const isStaff = localStorage.getItem('is_staff') === 'true' || 
                    localStorage.getItem('is_admin') === 'true' || 
                    localStorage.getItem('is_superuser') === 'true';

    if (!isAuthenticated) {
      // Redirect to login if not authenticated
      navigate('/login', { state: { from: '/support/dashboard' } });
      return;
    }

    if (!isStaff) {
      // Redirect to home if not staff
      alert('Access denied. Only support agents can access this page.');
      navigate('/');
      return;
    }

    // User is authorized
    setIsAuthorized(true);
    loadConversations();
  }, [navigate]);

  // Set up conversation refresh interval (only when authorized)
  useEffect(() => {
    if (!isAuthorized) return;

    // Refresh conversations every 5 seconds
    const interval = setInterval(loadConversations, 5000);
    return () => clearInterval(interval);
  }, [isAuthorized]);

  useEffect(() => {
    if (selectedConversation) {
      loadConversationDetails();
      loadCustomerDetails();
      const websocket = connectWebSocket();
      
      // Refresh customer details every 5 seconds (only for logged-in customers)
      const conversationId = selectedConversation.id;
      const detailsInterval = setInterval(() => {
        if (conversationId && selectedConversation) {
          fetch(`${API_BASE_URL}/conversations/${conversationId}/customer-details/`, {
            credentials: 'include'
          })
          .then(response => {
            if (response.ok) {
              return response.json();
            }
            throw new Error('Failed to fetch customer details');
          })
          .then(data => {
            setCustomerDetails(data);
          })
          .catch(error => {
            console.error('Error refreshing customer details:', error);
          });
        }
      }, 5000);
      
      return () => {
        // Cleanup: close WebSocket when conversation changes
        if (websocket) {
          websocket.close();
        }
        clearInterval(detailsInterval);
        setWs(null);
        setIsConnected(false);
        setMessages([]);
      };
    }
  }, [selectedConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadConversations = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/conversations/`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setConversations(data);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  };

  const loadConversationDetails = async () => {
    if (!selectedConversation) return;
    try {
      const response = await fetch(`${API_BASE_URL}/conversations/${selectedConversation.id}/`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        // Update sender_name - always use "Support Agent" for agent messages
        const messages = (data.messages || []).map(msg => {
          let updatedMsg = { ...msg };
          
          // Ensure is_from_agent is boolean - handle all possible values
          let isAgent = false;
          if (msg.is_from_agent === true || msg.is_from_agent === 'true' || msg.is_from_agent === 1 || msg.is_from_agent === '1') {
            isAgent = true;
          }
          updatedMsg.is_from_agent = isAgent;
          
          if (isAgent) {
            updatedMsg.sender_name = 'Support Agent';
          } else {
            // Keep customer name
            updatedMsg.sender_name = msg.sender_name || 'Customer';
          }
          
          return updatedMsg;
        });
        setMessages(messages);
      }
    } catch (error) {
      console.error('Error loading conversation details:', error);
    }
  };

  const loadCustomerDetails = async () => {
    if (!selectedConversation) return;
    try {
      const response = await fetch(`${API_BASE_URL}/conversations/${selectedConversation.id}/customer-details/`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setCustomerDetails(data);
      }
    } catch (error) {
      console.error('Error loading customer details:', error);
    }
  };

  const claimConversation = async (conversationId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/conversations/${conversationId}/claim/`, {
        method: 'POST',
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setSelectedConversation(data);
        loadConversations();
      }
    } catch (error) {
      console.error('Error claiming conversation:', error);
      alert('Failed to claim conversation');
    }
  };

  const connectWebSocket = () => {
    if (!selectedConversation) return null;

    const wsUrl = `ws://localhost:8000/ws/support/chat/${selectedConversation.id}/`;
    const websocket = new WebSocket(wsUrl);

    websocket.onopen = () => {
      setIsConnected(true);
    };

    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
        if (data.type === 'message' || data.type === 'new_message') {
        const newMessage = data.data || data.message;
        
        // Check for duplicates
        setMessages(prev => {
          // Check if message already exists by ID
          if (newMessage.id && prev.some(msg => msg.id === newMessage.id)) {
            return prev;
          }
          
          // Also check by content + timestamp (for messages without IDs or duplicate IDs)
          const isDuplicate = prev.some(msg => {
            const sameContent = msg.content === newMessage.content;
            const sameSender = (msg.sender === newMessage.sender) || (!msg.sender && !newMessage.sender);
            const sameAgent = msg.is_from_agent === newMessage.is_from_agent;
            
            // Safe date parsing
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
            return prev;
          }
          
          // Update sender_name - always use "Support Agent" for agent messages
          let updatedMessage = { ...newMessage };
          
          // Ensure is_from_agent is boolean - handle all possible values
          let isAgent = false;
          if (newMessage.is_from_agent === true || newMessage.is_from_agent === 'true' || newMessage.is_from_agent === 1 || newMessage.is_from_agent === '1') {
            isAgent = true;
          }
          updatedMessage.is_from_agent = isAgent;
          
          if (isAgent) {
            updatedMessage.sender_name = 'Support Agent';
          } else {
            // Customer message - keep customer name or use "Customer" if not available
            updatedMessage.sender_name = newMessage.sender_name || 'Customer';
          }
          
          return [...prev, updatedMessage];
        });
      } else if (data.type === 'history') {
        // History messages - always use "Support Agent" for agent messages
        const historyMessages = (data.messages || []).map(msg => {
          let updatedMsg = { ...msg };
          
          // Ensure is_from_agent is boolean - handle all possible values
          let isAgent = false;
          if (msg.is_from_agent === true || msg.is_from_agent === 'true' || msg.is_from_agent === 1 || msg.is_from_agent === '1') {
            isAgent = true;
          }
          updatedMsg.is_from_agent = isAgent;
          
          if (isAgent) {
            updatedMsg.sender_name = 'Support Agent';
          } else {
            // Keep customer name
            updatedMsg.sender_name = msg.sender_name || 'Customer';
          }
          
          return updatedMsg;
        });
        setMessages(historyMessages);
      }
    };

    websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    websocket.onclose = () => {
      setIsConnected(false);
      setWs(null);
      // Only reconnect if conversation is still selected
      setTimeout(() => {
        if (selectedConversation) {
          connectWebSocket();
        }
      }, 3000);
    };

    setWs(websocket);
    return websocket;
  };

  const sendMessage = () => {
    if (!ws || !isConnected) return;

    const messageContent = inputMessage;
    setInputMessage('');

    // Send via WebSocket - message will be added to UI when received from server
    // Don't add optimistic update to avoid duplicates
    ws.send(JSON.stringify({
      type: 'message',
      content: messageContent
    }));
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file || !selectedConversation) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('conversation_id', selectedConversation.id);

    try {
      const response = await fetch(`${API_BASE_URL}/upload/`, {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      if (!response.ok) {
        alert('File upload failed');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Error uploading file');
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const waitingConversations = conversations.filter(c => c.status === 'waiting');
  const activeConversations = conversations.filter(c => c.status === 'active');
  const closedConversations = conversations.filter(c => c.status === 'closed');

  // Show loading/unauthorized message
  if (!isAuthorized) {
    return (
      <div className="support-agent-dashboard" style={{ padding: '40px', textAlign: 'center' }}>
        <p>Checking authorization...</p>
      </div>
    );
  }

  return (
    <div className="support-agent-dashboard">
      <div className="dashboard-header">
        <h1>Support Agent Dashboard</h1>
        <div className="stats">
          <div className="stat-item">
            <span className="stat-label">Waiting:</span>
            <span className="stat-value">{waitingConversations.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Active:</span>
            <span className="stat-value">{activeConversations.length}</span>
          </div>
        </div>
      </div>

      <div className="dashboard-content">
        {/* Conversation List */}
        <div className="conversation-list">
          <div className="conversation-section">
            <h2>Waiting ({waitingConversations.length})</h2>
            {waitingConversations.map(conv => (
              <div 
                key={conv.id} 
                className={`conversation-item ${selectedConversation?.id === conv.id ? 'selected' : ''}`}
                onClick={() => {
                  claimConversation(conv.id);
                }}
              >
                <div className="conversation-header">
                  <strong>{conv.customer_name}</strong>
                  <button 
                    className="claim-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      claimConversation(conv.id);
                    }}
                  >
                    Claim
                  </button>
                </div>
                <div className="conversation-meta">
                  <span>{new Date(conv.created_at).toLocaleString()}</span>
                  <span>{conv.message_count} messages</span>
                </div>
                {conv.last_message && (
                  <div className="last-message">
                    {conv.last_message.content.substring(0, 50)}...
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="conversation-section">
            <h2>Active ({activeConversations.length})</h2>
            {activeConversations.map(conv => (
              <div 
                key={conv.id} 
                className={`conversation-item ${selectedConversation?.id === conv.id ? 'selected' : ''}`}
                onClick={() => setSelectedConversation(conv)}
              >
                <div className="conversation-header">
                  <strong>{conv.customer_name}</strong>
                  {conv.agent_name && <span className="agent-badge">You</span>}
                </div>
                <div className="conversation-meta">
                  <span>{new Date(conv.updated_at).toLocaleString()}</span>
                  <span>{conv.message_count} messages</span>
                </div>
                {conv.last_message && (
                  <div className="last-message">
                    {conv.last_message.content.substring(0, 50)}...
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Chat Panel */}
        <div className="chat-panel">
          {selectedConversation ? (
            <>
              <div className="chat-header">
                <div>
                  <h3>{selectedConversation.customer_name}</h3>
                  <span className={`status-badge ${selectedConversation.status}`}>
                    {selectedConversation.status}
                  </span>
                </div>
                <div className="connection-status">
                  <span className={`status-indicator ${isConnected ? 'online' : 'offline'}`}></span>
                  {isConnected ? 'Connected' : 'Connecting...'}
                </div>
              </div>

              <div className="chat-content">
                <div className="messages-container">
                  {messages.map((message) => {
                    // CRITICAL: Determine if message is from agent
                    // Check is_from_agent value - handle all formats
                    const rawValue = message.is_from_agent;
                    let isAgent = false;
                    
                    // Try all possible true values
                    if (rawValue === true || rawValue === 'true' || rawValue === 1 || rawValue === '1') {
                      isAgent = true;
                    }
                    
                    // Always show "Support Agent" for agent messages
                    const displayName = isAgent ? 'Support Agent' : (message.sender_name || 'Customer');
                    
                    // SIMPLE: Use inline styles with !important values removed
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
                          <span className="sender-name">{displayName}</span>
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
                  <div ref={messagesEndRef} />
                </div>

                <div className="chat-input">
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
                  >
                    📎
                  </button>
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
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
            </>
          ) : (
            <div className="no-conversation-selected">
              <p>Select a conversation to start chatting</p>
            </div>
          )}
        </div>

        {/* Customer Details Sidebar */}
        {selectedConversation && customerDetails && (
          <div className="customer-details">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: 0 }}>Customer Details</h3>
              {customerDetails.username !== 'Guest User' && (
                <button 
                  onClick={loadCustomerDetails}
                  style={{ 
                    padding: '6px 12px', 
                    background: '#5c0f4e', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '4px', 
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  Refresh
                </button>
              )}
            </div>
            {customerDetails.username === 'Guest User' ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
                <p>Customer details require login</p>
              </div>
            ) : (
              <>
                <div className="customer-info">
                  <p><strong>Username:</strong> {customerDetails.username}</p>
                  <p><strong>Email:</strong> {customerDetails.email}</p>
                  <p><strong>Orders:</strong> {customerDetails.order_count}</p>
                  <p><strong>Cart Items:</strong> {customerDetails.cart_item_count}</p>
                  <p><strong>Wishlist Items:</strong> {customerDetails.wishlist_item_count || 0}</p>
                </div>

            {customerDetails.orders && customerDetails.orders.length > 0 && (
              <div className="orders-section">
                <h4>Recent Orders</h4>
                {customerDetails.orders.map((order, idx) => {
                  const itemsCount = order.items ? order.items.length : 0;
                  return (
                  <div key={idx} className="order-item">
                    <p><strong>Order {order.order_id || `#${order.id}`}</strong></p>
                    <p>{new Date(order.created_at || order.order_date).toLocaleDateString()}</p>
                    <p><strong>{itemsCount} item{itemsCount !== 1 ? 's' : ''}</strong></p>
                    {order.items && order.items.length > 0 && (
                      <ul style={{ marginTop: '8px', paddingLeft: '20px', fontSize: '12px' }}>
                        {order.items.map((item, itemIdx) => (
                          <li key={itemIdx}>
                            {item.product_name} x{item.quantity} - {typeof item.price === 'number' ? `$${item.price.toFixed(2)}` : item.price}
                          </li>
                        ))}
                      </ul>
                    )}
                    {order.status && order.status !== 'unknown' && (
                      <p>
                        <strong>Status:</strong> 
                        <span className={`status-badge ${order.status.toLowerCase().replace('-', '_')}`}>
                          {order.status}
                        </span>
                      </p>
                    )}
                    {order.delivery_date && (
                      <p><strong>Delivered:</strong> {new Date(order.delivery_date).toLocaleDateString()}</p>
                    )}
                  </div>
                );
                })}
              </div>
            )}

            <div className="cart-section">
              <h4>Cart Items ({customerDetails.cart_item_count || 0})</h4>
              {customerDetails.cart_items && customerDetails.cart_items.length > 0 ? (
                customerDetails.cart_items.map((item, idx) => (
                  <div key={idx} className="cart-item">
                    <p>{item.product_name} x{item.quantity}</p>
                    {item.price && <p style={{ fontSize: '12px', color: '#666' }}>₺{typeof item.price === 'number' ? item.price.toFixed(2) : item.price}</p>}
                  </div>
                ))
              ) : (
                <p style={{ fontSize: '12px', color: '#999', fontStyle: 'italic' }}>Cart is empty</p>
              )}
            </div>

                {customerDetails.wishlist_items && customerDetails.wishlist_items.length > 0 && (
                  <div className="wishlist-section">
                    <h4>Wishlist Items</h4>
                    {customerDetails.wishlist_items.map((item, idx) => (
                      <div key={idx} className="wishlist-item">
                        <p>{item.product_name}</p>
                        {item.price && <p style={{ fontSize: '12px', color: '#666' }}>${typeof item.price === 'number' ? item.price.toFixed(2) : item.price}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default SupportAgentDashboard;

