import React from 'react';
import styled from 'styled-components';
import { colors } from '../../config/constants';

const Button = ({ variant, active, title, children, ...props }) => {
  return (
    <Container variant={variant} {...props}>
      {children || title}
    </Container>
  );
};

export default Button;

const Container = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-family: 'Poppins';
  border-radius: 10px;
  ${(props) =>
    props.variant === 'outline'
      ? `border: 3px solid ${colors.primary};`
      : props.variant === 'filled'
      ? `background-color: ${colors.primary};`
      : ''}
  padding: 10px 38px;
  box-sizing: border-box;
  cursor: pointer;
  user-select: none;
`;
