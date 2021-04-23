import React, { Suspense } from 'react';
import ReactFullScreenComponent from 'react-easyfullscreen';
import styled from 'styled-components';
import MainScene from '../components/3d/scenes/MainScene';
import { FiMaximize } from 'react-icons/fi';

const IndexPage = ({ location }) => {
  return (
    <ReactFullScreenComponent>
      {({ ref, onToggle }) => (
        <Container>
          <Suspense fallback={null}>
            <MainScene ref={ref} />
          </Suspense>
          <FullscreenButton onClick={onToggle}>
            <FiMaximize size={22} />
          </FullscreenButton>
        </Container>
      )}
    </ReactFullScreenComponent>
  );
};

export default IndexPage;

const FullscreenButton = styled.div`
  position: absolute;
  bottom: 12px;
  right: 12px;
  background-color: #000;
  box-shadow: 0 0 8px #0002;
  padding: 4px;
  border-radius: 8px;

  svg {
    display: block;
  }
`;

const Container = styled.main`
  display: flex;
  flex-direction: column;
  position: relative;
  height: 100vh;
`;
