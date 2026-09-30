import React from 'react';
import { withPrefix } from 'gatsby';
import styles from './Intro.module.scss';

const Intro = ({ author }) => (
  <section className={styles['intro']} aria-label="블로그 소개">
    <img className={styles['intro__photo']} src={withPrefix(author.photo)} alt={`${author.name} 프로필 이미지`} width="72" height="72" />
    <div>
      <h1 className={styles['intro__name']}>{author.name}</h1>
      <p className={styles['intro__bio']}>{author.bio}</p>
    </div>
  </section>
);

export default Intro;
