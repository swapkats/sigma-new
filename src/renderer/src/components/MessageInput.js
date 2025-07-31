import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';

const InputContainer = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 12px;
  background: #2d2d2d;
  border-radius: 24px;
  padding: 8px;
  border: 1px solid #444;
  transition: border-color 0.2s;

  &:focus-within {
    border-color: #007AFF;
  }
`;

const TextArea = styled.textarea`
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: #fff;
  font-size: 14px;
  font-family: inherit;
  resize: none;
  min-height: 20px;
  max-height: 120px;
  padding: 8px 12px;
  line-height: 1.4;

  &::placeholder {
    color: #888;
  }

  &::-webkit-scrollbar {
    width: 4px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: #555;
    border-radius: 2px;
  }
`;

const SendButton = styled.button`
  background: ${props => props.disabled ? '#555' : '#007AFF'};
  border: none;
  border-radius: 20px;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  transition: all 0.2s;
  color: white;
  font-size: 16px;

  &:hover {
    background: ${props => props.disabled ? '#555' : '#0056CC'};
    transform: ${props => props.disabled ? 'none' : 'scale(1.05)'};
  }

  &:active {
    transform: ${props => props.disabled ? 'none' : 'scale(0.95)'};
  }
`;

const CharCount = styled.div`
  position: absolute;
  bottom: -20px;
  right: 0;
  font-size: 11px;
  color: #666;
`;

const InputWrapper = styled.div`
  position: relative;
  width: 100%;
`;

function MessageInput({ onSendMessage, disabled }) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef(null);
  const maxLength = 2000;

  useEffect(() => {
    adjustTextareaHeight();
  }, [message]);

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSendMessage(message.trim());
      setMessage('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleChange = (e) => {
    const value = e.target.value;
    if (value.length <= maxLength) {
      setMessage(value);
    }
  };

  return (
    <InputWrapper>
      <InputContainer>
        <TextArea
          ref={textareaRef}
          value={message}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={disabled ? "Thinking..." : "Ask me anything... (Shift+Enter for new line)"}
          disabled={disabled}
          rows={1}
        />
        <SendButton
          type="submit"
          disabled={disabled || !message.trim()}
          onClick={handleSubmit}
        >
          {disabled ? '⏳' : '↗'}
        </SendButton>
      </InputContainer>
      {message.length > maxLength * 0.8 && (
        <CharCount>
          {message.length}/{maxLength}
        </CharCount>
      )}
    </InputWrapper>
  );
}

export default MessageInput;