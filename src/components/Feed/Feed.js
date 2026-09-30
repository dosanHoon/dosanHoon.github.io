import React from 'react';
import moment from 'moment';
import { Link, withPrefix } from 'gatsby';
import { getCategoryColors, getCategoryLabel } from '../../utils';
import styles from './Feed.module.scss';

const resolveSrc = (src) => (/^(https?:)?\/\//.test(src) ? src : withPrefix(src));

// 본문에 이미지가 있으면 첫 이미지, 없으면 카테고리 색 네모 박스에 제목을 그린다.
const Thumbnail = ({ src, title, colors }) => {
  if (src) {
    const isVector = /\.svg(\?|#|$)/i.test(src);

    return (
      <div className={`${styles['card__thumb']} ${isVector ? styles['card__thumb--vector'] : ''}`}>
        <img className={styles['card__thumb-image']} src={resolveSrc(src)} alt="" loading="lazy" />
      </div>
    );
  }

  return (
    <div
      className={`${styles['card__thumb']} ${styles['card__thumb--generated']}`}
      style={{ backgroundImage: `linear-gradient(135deg, ${colors.from} 0%, ${colors.to} 100%)`, color: colors.fg }}
      aria-hidden="true"
    >
      <span className={styles['card__thumb-title']}>{title}</span>
    </div>
  );
};

const Feed = ({ edges }) => (
  <ul className={styles['feed']}>
    {edges.map(({ node }) => {
      const { fields, frontmatter } = node;
      const label = getCategoryLabel(frontmatter.category);
      const colors = getCategoryColors(frontmatter.category);

      return (
        <li className={styles['feed__item']} key={fields.slug}>
          <article className={styles['card']}>
            <Thumbnail src={fields.thumbnail} title={frontmatter.title} colors={colors} />
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
              <h2 className={styles['card__title']}>
                <Link className={styles['card__title-link']} to={fields.slug}>{frontmatter.title}</Link>
              </h2>
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
