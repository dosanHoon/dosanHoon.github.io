import React from 'react';
import { Link } from 'gatsby';
import { getCategoryLabel } from '../../utils';
import Author from './Author';
import Comments from './Comments';
import Content from './Content';
import Meta from './Meta';
import Tags from './Tags';
import styles from './Post.module.scss';

const Post = ({ post }) => {
  const {
    tags,
    title,
    date,
    category
  } = post.frontmatter;

  const { html } = post;
  const { tagSlugs, categorySlug } = post.fields;

  return (
    <div className={styles['post']}>
      <div className={styles['post__content']}>
        <Content body={html} title={title} />
      </div>

      <div className={styles['post__footer']}>
        <Meta date={date} />
        {tags && tagSlugs && <Tags tags={tags} tagSlugs={tagSlugs} />}

        <nav className={styles['post__nav']} aria-label="글 목록">
          <Link className={styles['post__nav-link']} to="/">← 전체 글</Link>
          {category && categorySlug && (
            <Link className={styles['post__nav-link']} to={categorySlug}>
              {`${getCategoryLabel(category)} 글 더 보기 →`}
            </Link>
          )}
        </nav>

        <Author />
      </div>

      <div className={styles['post__comments']}>
        <Comments postSlug={post.fields.slug} postTitle={post.frontmatter.title} />
      </div>
    </div>
  );
};

export default Post;
