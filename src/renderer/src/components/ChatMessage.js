import React from 'react';
import styled from 'styled-components';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';

const MessageContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: ${props => props.type === 'user' ? 'flex-end' : 'flex-start'};
  max-width: 100%;
`;

const MessageBubble = styled.div`
  max-width: 80%;
  padding: 12px 16px;
  border-radius: 18px;
  background: ${props => {
    if (props.isError) return '#ff4444';
    if (props.type === 'user') return '#007AFF';
    return '#333';
  }};
  color: ${props => props.isError ? '#fff' : '#fff'};
  font-size: 14px;
  line-height: 1.4;
  word-wrap: break-word;
  position: relative;
  animation: ${props => props.isTyping ? 'pulse 1.5s infinite' : 'none'};

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  /* Markdown styling */
  p {
    margin: 0 0 8px 0;
    &:last-child {
      margin-bottom: 0;
    }
  }

  ul, ol {
    margin: 8px 0;
    padding-left: 20px;
  }

  li {
    margin: 4px 0;
  }

  blockquote {
    border-left: 3px solid #555;
    padding-left: 12px;
    margin: 8px 0;
    color: #ccc;
  }

  code {
    background: rgba(255, 255, 255, 0.1);
    padding: 2px 4px;
    border-radius: 3px;
    font-family: 'Monaco', 'Menlo', monospace;
    font-size: 13px;
  }

  pre {
    margin: 8px 0;
    border-radius: 6px;
    overflow: hidden;
  }

  pre code {
    background: none;
    padding: 0;
  }
`;

const MessageMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
  font-size: 11px;
  color: #888;
`;

const SearchIndicator = styled.div`
  background: #4CAF50;
  color: white;
  padding: 2px 6px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 500;
`;

const Timestamp = styled.div`
  font-size: 11px;
  color: #666;
`;

function ChatMessage({ type, content, timestamp, hasSearch, isError, isTyping }) {
  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const components = {
    code({ node, inline, className, children, ...props }) {
      const match = /language-(\w+)/.exec(className || '');
      return !inline && match ? (
        <SyntaxHighlighter
          style={tomorrow}
          language={match[1]}
          PreTag="div"
          customStyle={{
            margin: 0,
            background: '#1e1e1e',
            fontSize: '13px'
          }}
          {...props}
        >
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      ) : (
        <code className={className} {...props}>
          {children}
        </code>
      );
    }
  };

  return (
    <MessageContainer type={type}>
      <MessageBubble type={type} isError={isError} isTyping={isTyping}>
        {isTyping ? (
          content
        ) : (
          <ReactMarkdown components={components}>
            {content}
          </ReactMarkdown>
        )}
      </MessageBubble>
      {!isTyping && (
        <MessageMeta>
          {hasSearch && <SearchIndicator>🔍 Web Search</SearchIndicator>}
          <Timestamp>{formatTime(timestamp)}</Timestamp>
        </MessageMeta>
      )}
    </MessageContainer>
  );
}

export default ChatMessage;