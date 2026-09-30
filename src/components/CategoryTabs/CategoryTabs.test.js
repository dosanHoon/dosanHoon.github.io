import React from 'react';
import renderer from 'react-test-renderer';
import { PureCategoryTabs as CategoryTabs } from './CategoryTabs';

describe('CategoryTabs', () => {
  const edge = (category) => ({
    node: {
      fields: { categorySlug: `/category/${category.toLowerCase()}/` },
      frontmatter: { category }
    }
  });

  const data = {
    allMarkdownRemark: {
      edges: [edge('AI'), edge('MOBX'), edge('AI')]
    }
  };

  it('renders all categories with "전체" active on the index', () => {
    const tree = renderer.create(<CategoryTabs data={data} />).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('marks the active category', () => {
    const tree = renderer.create(<CategoryTabs data={data} activeCategory="MOBX" />).toJSON();
    expect(tree).toMatchSnapshot();
  });
});
