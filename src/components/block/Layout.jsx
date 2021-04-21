/* eslint react/jsx-pascal-case: 0  */

import React, { Fragment } from 'react';
import SEO from '../SEO';

const Layout = ({ children, ...props }) => {
  return (
    <Fragment>
      <SEO />
      {children}
    </Fragment>
  );
};

export default Layout;
