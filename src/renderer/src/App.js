import React, { useState, useEffect, useRef } from 'react';
import styled, { createGlobalStyle } from 'styled-components';
import ChatMessage from './components/ChatMessage';
import MessageInput from './components/MessageInput';
import TitleBar from './components/TitleBar';

const GlobalStyle = createGlobalStyle`
  * {
    box-sizing: border-box;
  }
  
  body {
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
    background: #1a1a1a;
    color: #ffffff;
    overflow: hidden;
  }
`;

const AppContainer = styled.div`
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
`;

const ChatContainer = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const MessagesContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  
  &::-webkit-scrollbar-thumb {
    background: #444;
    border-radius: 3px;
  }
`;

const InputContainer = styled.div`
  padding: 20px;
  border-top: 1px solid #333;
  background: rgba(26, 26, 26, 0.95);
  backdrop-filter: blur(10px);
`;

const StatusBar = styled.div`
  padding: 8px 20px;
  background: #111;
  border-top: 1px solid #333;
  font-size: 12px;
  color: #888;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const StatusIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const StatusDot = styled.div`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${props => props.connected ? '#4CAF50' : '#f44336'};
`;

function App() {
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [status, setStatus] = useState({ connected: false, memories: 0 });
  const messagesEndRef = useRef(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Load conversation history on startup
    loadConversationHistory();
    
    // Set initial status
    setStatus({ connected: true, memories: 0 });
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadConversationHistory = async () => {
    try {
      if (window.electronAPI) {
        const history = await window.electronAPI.getConversationHistory();
        const formattedHistory = history.slice(-10).map(conv => ([
          { id: conv.id + '_user', type: 'user', content: conv.content, timestamp: conv.timestamp },
          { id: conv.id + '_assistant', type: 'assistant', content: conv.response, timestamp: conv.timestamp + 1 }
        ])).flat();
        
        setMessages(formattedHistory);
      }
    } catch (error) {
      console.error('Failed to load conversation history:', error);
    }
  };

  const handleSendMessage = async (content) => {
    const userMessage = {
      id: Date.now() + '_user',
      type: 'user',
      content,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);

    try {
      if (window.electronAPI) {
        const response = await window.electronAPI.sendMessage(content);
        
        if (response.error) {
          throw new Error(response.error);
        }

        const assistantMessage = {
          id: Date.now() + '_assistant',
          type: 'assistant',
          content: response.response,
          timestamp: Date.now(),
          hasSearch: response.hasSearch,
          memories: response.memories
        };

        setMessages(prev => [...prev, assistantMessage]);
        setStatus(prev => ({ ...prev, memories: response.memories || prev.memories }));
      } else {
        // Fallback for development
        const assistantMessage = {
          id: Date.now() + '_assistant',
          type: 'assistant',
          content: 'Hello! I\'m Sigma, your local AI assistant. The backend services are not yet connected.',
          timestamp: Date.now()
        };
        setMessages(prev => [...prev, assistantMessage]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = {
        id: Date.now() + '_error',
        type: 'assistant',
        content: `Sorry, I encountered an error: ${error.message}`,
        timestamp: Date.now(),
        isError: true
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      <GlobalStyle />
      <AppContainer>
        <TitleBar />
        <ChatContainer>
          <MessagesContainer>
            {messages.length === 0 && (
              <ChatMessage
                type="assistant"
                content="Hello! I'm Sigma, your local AI assistant. I can help you with questions, remember our conversations, and search the internet when needed. What would you like to know?"
                timestamp={Date.now()}
              />
            )}
            {messages.map(message => (
              <ChatMessage
                key={message.id}
                type={message.type}
                content={message.content}
                timestamp={message.timestamp}
                hasSearch={message.hasSearch}
                isError={message.isError}
              />
            ))}
            {isTyping && (
              <ChatMessage
                type="assistant"
                content="..."
                timestamp={Date.now()}
                isTyping={true}
              />
            )}
            <div ref={messagesEndRef} />
          </MessagesContainer>
          <InputContainer>
            <MessageInput onSendMessage={handleSendMessage} disabled={isTyping} />
          </InputContainer>
        </ChatContainer>
        <StatusBar>
          <StatusIndicator>
            <StatusDot connected={status.connected} />
            <span>{status.connected ? 'Connected' : 'Disconnected'}</span>
          </StatusIndicator>
          <div>
            {status.memories > 0 && `${status.memories} memories`}
          </div>
        </StatusBar>
      </AppContainer>
    </>
  );
}

export default App;