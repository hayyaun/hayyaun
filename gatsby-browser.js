import React from 'react';
import Layout from './src/components/block/Layout';
import './src/config/global-styles.scss';

export const wrapPageElement = ({ element, props }) => {
  // props provide same data to Layout as Page element will get
  // including location, data, etc - you don't need to pass it
  return <Layout {...props}>{element}</Layout>;
};
