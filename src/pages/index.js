import React, { Suspense } from 'react';
import ReactFullScreenComponent from 'react-easyfullscreen';
import { FiMaximize } from 'react-icons/fi';
import styled from 'styled-components';
import MainScene from '../components/3d/scenes/MainScene/MainScene';
import Navbar from '../components/block/Navbar';

const IndexPage = ({ location }) => {
  const isSSR = typeof window === 'undefined';
  return (
    <ReactFullScreenComponent>
      {({ ref, onToggle }) => (
        <Container>
          <Navbar location={location} />
          {!isSSR && (
            <Suspense fallback={null}>
              <MainScene ref={ref} />
            </Suspense>
          )}
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
  backdrop-filter: blur(20px) brightness(150%);
  box-shadow: 0 0 8px #0003;
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
