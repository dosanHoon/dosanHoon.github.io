import React from 'react';
import styles from './Listing.module.scss';

// 카드 목록 페이지(홈·카테고리·태그)의 넓은 컨테이너
const Listing = ({ title, children }) => (
  <div className={styles['listing']}>
    {title && <h1 className={styles['listing__title']}>{title}</h1>}
    {children}
  </div>
);

export default Listing;
