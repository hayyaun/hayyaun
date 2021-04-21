import React, { useEffect, useRef } from 'react';
import styled from 'styled-components';
import Footer from '../components/block/Footer';
import Navbar from '../components/block/Navbar';
import AboutSection from '../components/sections/AboutSection';
import ContactSection from '../components/sections/ContactSection';
import GallerySection from '../components/sections/GallerySection';
import MainSection from '../components/sections/MainSection';
import SkillsSection from '../components/sections/SkillsSection';

const IndexPage = ({ location }) => {
  const _home = useRef(null);
  const _about = useRef(null);
  const _skills = useRef(null);
  const _gallery = useRef(null);
  const _contact = useRef(null);

  const executeScroll = (ref) => ref.current.scrollIntoView();
  useEffect(() => {
    const hashes = [
      { name: '#home', ref: _home },
      { name: '#about', ref: _about },
      { name: '#skills', ref: _skills },
      { name: '#gallery', ref: _gallery },
      { name: '#contact', ref: _contact },
    ];

    const ref = hashes.find((hash) => hash.name === location.hash)?.ref;
    if (ref) executeScroll(ref);
  }, [location]);

  return (
    <Container>
      <Navbar location={location} />
      <MainSection location={location} ref={_home} />
      <AboutSection location={location} ref={_about} />
      <SkillsSection location={location} ref={_skills} />
      <GallerySection location={location} ref={_gallery} />
      <ContactSection location={location} ref={_contact} />
      <Footer />
    </Container>
  );
};

export default IndexPage;

const Container = styled.main`
  display: flex;
  flex-direction: column;
  align-items: stretch;
`;
