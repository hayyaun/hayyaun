import React from 'react';
import styled from 'styled-components';
import { colors } from '../../config/constants';

const Title = ({ children }) => {
  return (
    <Container>
      <h1>{children}</h1>
      <Underline />
    </Container>
  );
};

export default Title;

const Underline = styled.div`
  background-color: ${colors.primary};
  height: 3px;
  width: 64px;
`;

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
`;
