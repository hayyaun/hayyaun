import React, { forwardRef } from 'react';
import styled from 'styled-components';
import Title from '../micro/Title';

const ContactSection = forwardRef((_, ref) => {
  return (
    <Container ref={ref}>
      <Title>Contact</Title>
    </Container>
  );
});

export default ContactSection;

const Container = styled.section`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 100vh;
`;
