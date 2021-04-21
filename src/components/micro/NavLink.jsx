import { Link } from 'gatsby';
import React from 'react';
import styled from 'styled-components';

const NavLink = ({ active, title, children, to }) => {
  return (
    <Link to={to}>
      <Container active={active}>{children || title}</Container>
    </Link>
  );
};

export default NavLink;

const Container = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-family: 'Poppins';
  padding: 10px 0;
  margin: 0 12px;
  box-sizing: border-box;
  cursor: pointer;
  user-select: none;
  ${(props) => props.active && `border-bottom: 2px solid #fff;`}
`;
