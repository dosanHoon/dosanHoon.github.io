import React from 'react';
import moment from 'moment';
import { Link } from 'gatsby';
import { getCategoryColors, getCategoryLabel } from '../../utils';
import styles from './Feed.module.scss';

// 썸네일은 모든 글 공통으로 카테고리 색 박스에 제목을 그린다. 썸네일의 제목이 곧 카드 제목(링크)이다.
const Feed = ({ edges }) => (
  <ul className={styles['feed']}>
    {edges.map(({ node }) => {
      const { fields, frontmatter } = node;
      const label = getCategoryLabel(frontmatter.category);
      const colors = getCategoryColors(frontmatter.category);

      return (
        <li className={styles['feed__item']} key={fields.slug}>
          <article className={styles['card']}>
            <div
              className={styles['card__thumb']}
              style={{ backgroundImage: `linear-gradient(135deg, ${colors.from} 0%, ${colors.to} 100%)` }}
            >
              <h2 className={styles['card__title']}>
                <Link className={styles['card__title-link']} to={fields.slug} style={{ color: colors.fg }}>
                  {frontmatter.title}
                </Link>
              </h2>
            </div>
            <div className={styles['card__body']}>
              {frontmatter.category && (
                <Link
                  to={fields.categorySlug}
                  className={styles['card__category']}
                  style={{ backgroundColor: colors.bg, color: colors.fg }}
                >
                  {label}
                </Link>
              )}
              {frontmatter.description && (
                <p className={styles['card__description']}>{frontmatter.description}</p>
              )}
              <time className={styles['card__date']} dateTime={moment(frontmatter.date).format('YYYY-MM-DD')}>
                {moment(frontmatter.date).format('YYYY년 M월 D일')}
              </time>
            </div>
          </article>
        </li>
      );
    })}
  </ul>
);

export default Feed;
