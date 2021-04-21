import React, { forwardRef } from 'react';
import styled from 'styled-components';
import Title from '../micro/Title';

const information = [
  { title: 'Email', data: 'hayyaun@outlook.com' },
  { title: 'Website', data: 'hayyaun.com' },
];

const ContactSection = forwardRef((_, ref) => {
  return (
    <Container ref={ref}>
      <Title>Contact</Title>
      <SecContainer>
        <Section>
          {information.map((e, key) => (
            <div style={{ marginBottom: 16 }} key={key}>
              <H3>{e.title}</H3>
              <p style={{ maxWidth: 360 }}>{e.data}</p>
            </div>
          ))}
        </Section>
        <Form>
          <InputContainer>
            <Input placeholder="Name" type="text" />
            <Input placeholder="Email" type="email" />
          </InputContainer>
          <TextArea placeholder="Message" rows={8} />
          <SubmitBtn type="submit">Submit Your Email</SubmitBtn>
        </Form>
      </SecContainer>
    </Container>
  );
});

export default ContactSection;

const Container = styled.section`F`;
const SecContainer = styled.div`
  display: flex;
  justify-content: space-around;
  margin-top: 42px;
`;
const Section = styled.div`
  display: flex;
  flex-direction: column;
`;
const Form = styled.form`
  display: flex;
  flex-direction: column;
`;
const H3 = styled.h3`
  color: #4f81f3;
`;
const Input = styled.input`
  font-size: 1rem;
  font-weight: 800;
  font-family: 'Poppins';
  padding: 1rem;
  border-radius: 0.5rem;
  border: 1.5px solid #0e2431;
  outline: none;
  margin-bottom: 2rem;
  width: 140px;
`;
const TextArea = styled.textarea`
  font-size: 1rem;
  font-weight: 800;
  font-family: 'Poppins';
  padding: 1rem;
  border-radius: 0.5rem;
  border: 1.5px solid #0e2431;
  outline: none;
  margin-bottom: 2rem;
`;
const InputContainer = styled.div`
  width: 370px;
  display: flex;
  justify-content: space-between;
`;
const SubmitBtn = styled.button`
  display: block;
  border: none;
  outline: none;
  cursor: pointer;
  margin-left: auto;
  width: 100%;
  font-size: 1rem;
  font-weight: 600;
  padding: 1rem;
  border-radius: 0.5rem;
  background-color: #4f81f3;
  outline: none;
  margin-bottom: 2rem;
  color: #ffffff;
`;
