import React from 'react';
import Helmet from 'react-helmet';
import styles from './Layout.module.scss';

const Layout = ({ children, title, description }) => (
  <div className={styles.layout}>
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="google-site-verification" content="lpAHpWtJQjy1Lhv6UTgNM4hzCePecRn5ixX9OKRalZg" />
      <meta name="naver-site-verification" content="c5a3100ee74684026d3150177a533e4dbe147d6d" />
    </Helmet>
    {children}
  </div>
);

export default Layout;
