import React, { forwardRef } from 'react';
import styled from 'styled-components';
import Title from '../micro/Title';

const SkillsSection = forwardRef((_, ref) => {
  return (
    <Container ref={ref}>
      <Title>My Skills</Title>
    </Container>
  );
});

export default SkillsSection;

const Container = styled.section`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 100vh;
`;
