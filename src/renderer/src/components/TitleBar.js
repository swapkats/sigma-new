import React from 'react';
import styled from 'styled-components';

const TitleBarContainer = styled.div`
  height: 32px;
  background: #2d2d2d;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  -webkit-app-region: drag;
  border-bottom: 1px solid #333;
`;

const Title = styled.div`
  font-size: 13px;
  font-weight: 500;
  color: #fff;
  -webkit-app-region: no-drag;
`;

const WindowControls = styled.div`
  position: absolute;
  right: 12px;
  display: flex;
  gap: 8px;
  -webkit-app-region: no-drag;
`;

const ControlButton = styled.button`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  transition: opacity 0.2s;

  &:hover {
    opacity: 0.8;
  }

  &.close {
    background: #ff5f56;
  }

  &.minimize {
    background: #ffbd2e;
  }

  &.maximize {
    background: #27ca3f;
  }
`;

function TitleBar() {
  const handleMinimize = () => {
    if (window.electronAPI) {
      window.electronAPI.minimize();
    }
  };

  const handleClose = () => {
    if (window.electronAPI) {
      window.electronAPI.close();
    }
  };

  return (
    <TitleBarContainer>
      <Title>Sigma AI Chat</Title>
      <WindowControls>
        <ControlButton className="close" onClick={handleClose} />
        <ControlButton className="minimize" onClick={handleMinimize} />
        <ControlButton className="maximize" />
      </WindowControls>
    </TitleBarContainer>
  );
}

export default TitleBar;