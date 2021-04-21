import React, { forwardRef } from 'react';
import styled from 'styled-components';
import ObjectsScene from '../3d/scenes/ObjectsScene';
import Title from '../micro/Title';

const AboutSection = forwardRef((_, ref) => {
  return (
    <Container ref={ref}>
      <Title>About Me</Title>
      <ContentBox>
        <AnimeBox>
          <ObjectsScene />
        </AnimeBox>
      </ContentBox>
    </Container>
  );
});

export default AboutSection;

const AnimeBox = styled.div`
  flex: 0 0 50%;
  height: 100%;
`;

const ContentBox = styled.div`
  flex: 1;
  display: flex;
  position: relative;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  margin: 0 24px 0 0;
  gap: 32px;
`;

const Container = styled.section`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 100vh;
`;
