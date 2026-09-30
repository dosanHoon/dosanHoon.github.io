import React from 'react';
import { wrapSections } from '../../../utils';
import styles from './Content.module.scss';

const SECTION_CLASS_NAMES = {
  section: styles['section'],
  sectionTop: styles['section--top'],
  sectionSub: styles['section--sub'],
  sectionBody: styles['section__body']
};

const Content = ({ body, title }) => (
  <div className={styles['content']}>
    <h1 className={styles['content__title']}>{title}</h1>
    <div className={styles['content__body']} dangerouslySetInnerHTML={{ __html: wrapSections(body, SECTION_CLASS_NAMES) }} />
  </div>
);

export default Content;
