import React from 'react';
import { wrapSections } from '../../utils';
import styles from './Page.module.scss';

// 마크다운 페이지(About)는 h1을 구역 구분선으로 두고 h2(회사)·h3(팀)을 섹션으로 감싼다.
const SECTION_CLASS_NAMES = {
  section: styles['section'],
  sectionTop: styles['section--top'],
  sectionSub: styles['section--sub'],
  sectionBody: styles['section__body']
};

const renderMarkdown = (html) => wrapSections(html, SECTION_CLASS_NAMES, { minLevel: 2 });

const Page = ({ title, html, children }) => (
  <div className={styles['page']}>
    <div className={styles['page__inner']}>
      { title && <h1 className={styles['page__title']}>{title}</h1>}
      {html ? (
        <div
          className={`${styles['page__body']} ${styles['page__body--markdown']}`}
          dangerouslySetInnerHTML={{ __html: renderMarkdown(html) }}
        />
      ) : (
        <div className={styles['page__body']}>
          {children}
        </div>
      )}
    </div>
  </div>
);

export default Page;
