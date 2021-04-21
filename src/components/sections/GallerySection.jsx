import React, { forwardRef } from 'react';
import styled from 'styled-components';
import Title from '../micro/Title';

const GallerySection = forwardRef((_, ref) => {
  return (
    <Container ref={ref}>
      <Title>Showcases</Title>
    </Container>
  );
});

export default GallerySection;

const Container = styled.section`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 60vh;
  background-color: #121212;
  border-top: 1px solid #ffffff12;
  border-bottom: 1px solid #ffffff12;
`;
