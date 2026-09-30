import React from 'react';
import moment from 'moment';
import styles from './Meta.module.scss';

const Meta = ({ date }) => (
  <div className={styles['meta']}>
    <time className={styles['meta__date']} dateTime={moment(date).format('YYYY-MM-DD')}>
      {moment(date).format('YYYY년 M월 D일')}
    </time>
  </div>
);

export default Meta;
