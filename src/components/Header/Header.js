import React from 'react';
import {
  graphql,
  Link,
  StaticQuery,
  withPrefix
} from 'gatsby';
import { getContactHref, getIcon } from '../../utils';
import Icon from '../Icon';
import styles from './Header.module.scss';

const CONTACT_LABELS = {
  github: 'GitHub',
  email: 'Email'
};

export const PureHeader = ({ data }) => {
  const { title, menu, author } = data.site.siteMetadata;

  return (
    <header className={styles['header']}>
      <div className={styles['header__inner']}>
        <Link className={styles['header__brand']} to="/">
          <img className={styles['header__brand-photo']} src={withPrefix(author.photo)} alt="" width="32" height="32" />
          <span className={styles['header__brand-title']}>{title}</span>
        </Link>
        <nav className={styles['header__nav']} aria-label="사이트 메뉴">
          {menu.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={styles['header__link']}
              activeClassName={styles['header__link--active']}
            >
              {item.label}
            </Link>
          ))}
          {Object.keys(author.contacts).map((name) => (
            <a
              key={name}
              className={`${styles['header__icon']} ${styles[`header__icon--${name}`] || ''}`}
              href={getContactHref(name, author.contacts[name])}
              aria-label={CONTACT_LABELS[name] || name}
              rel="noopener noreferrer"
              target="_blank"
            >
              <Icon icon={getIcon(name)} />
            </a>
          ))}
        </nav>
      </div>
    </header>
  );
};

export const Header = () => (
  <StaticQuery
    query={graphql`
      query HeaderQuery {
        site {
          siteMetadata {
            title
            menu {
              label
              path
            }
            author {
              photo
              contacts {
                github
                email
              }
            }
          }
        }
      }
    `}
    render={(data) => <PureHeader data={data} />}
  />
);

export default Header;
