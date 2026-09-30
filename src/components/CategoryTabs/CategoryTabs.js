import React from 'react';
import { graphql, Link, StaticQuery } from 'gatsby';
import { getCategories, getCategoryLabel } from '../../utils';
import styles from './CategoryTabs.module.scss';

const Tab = ({
  to, label, count, active
}) => (
  <li className={styles['tabs__item']}>
    <Link
      to={to}
      className={`${styles['tabs__link']} ${active ? styles['tabs__link--active'] : ''}`}
      aria-current={active ? 'page' : undefined}
    >
      {label}
      <span className={styles['tabs__count']}>{count}</span>
    </Link>
  </li>
);

export const PureCategoryTabs = ({ data, activeCategory }) => {
  const { edges } = data.allMarkdownRemark;
  const categories = getCategories(edges);

  return (
    <nav className={styles['tabs']} aria-label="카테고리">
      <ul className={styles['tabs__list']}>
        <Tab to="/" label="전체" count={edges.length} active={!activeCategory} />
        {categories.map((category) => (
          <Tab
            key={category.name}
            to={category.slug}
            label={getCategoryLabel(category.name)}
            count={category.count}
            active={category.name === activeCategory}
          />
        ))}
      </ul>
    </nav>
  );
};

export const CategoryTabs = (props) => (
  <StaticQuery
    query={graphql`
      query CategoryTabsQuery {
        allMarkdownRemark(
          filter: { frontmatter: { template: { eq: "post" }, draft: { ne: true } } },
          sort: { order: DESC, fields: [frontmatter___date] }
        ) {
          edges {
            node {
              fields {
                categorySlug
              }
              frontmatter {
                category
              }
            }
          }
        }
      }
    `}
    render={(data) => <PureCategoryTabs {...props} data={data} />}
  />
);

export default CategoryTabs;
