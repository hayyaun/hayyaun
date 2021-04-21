import React from 'react';
import styled from 'styled-components';
import NavLink from '../micro/NavLink';

const links = [
  { name: 'Home', to: '#home' },
  { name: 'About Me', to: '#about' },
  { name: 'Skills', to: '#skills' },
  { name: 'Gallery', to: '#gallery' },
  { name: 'Contact', to: '#contact' },
];

const Navbar = ({ location }) => {
  return (
    <Container>
      <ContentBox>
        <div>
          <span>Hayyan Hami</span>
        </div>
        <LinksBox>
          {links.map(({ name, to }, i) => (
            <NavLink key={i} to={to} active={location.hash === to}>
              {name}
            </NavLink>
          ))}
        </LinksBox>
      </ContentBox>
    </Container>
  );
};

export default Navbar;

const LinksBox = styled.div`
  display: flex;
  gap: 20px;

  @media screen and (max-width: 780px) {
    display: none;
  }
`;

const ContentBox = styled.div`
  display: flex;
  flex-basis: 1020px;
  align-items: center;
  justify-content: space-between;
  margin: 0 24px;
`;

const Container = styled.div`
  position: fixed;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  top: 0;
  width: 100%;
  height: 64px;
  box-sizing: border-box;
  border-bottom: 1px solid #ffffff15;
  font-family: 'Poppins';
  font-weight: 700;
  backdrop-filter: blur(20px) brightness(150%);
  box-shadow: 0 0 8px #0009;
`;
