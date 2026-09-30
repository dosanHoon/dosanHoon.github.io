import React from 'react';
import { graphql, StaticQuery } from 'gatsby';
import styles from './Footer.module.scss';

export const PureFooter = ({ data }) => (
  <footer className={styles['footer']}>
    <div className={styles['footer__inner']}>{data.site.siteMetadata.copyright}</div>
  </footer>
);

export const Footer = () => (
  <StaticQuery
    query={graphql`
      query FooterQuery {
        site {
          siteMetadata {
            copyright
          }
        }
      }
    `}
    render={(data) => <PureFooter data={data} />}
  />
);

export default Footer;
