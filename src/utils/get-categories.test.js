import getCategories from './get-categories';

const edge = (category) => ({
  node: {
    fields: { categorySlug: `/category/${category.toLowerCase()}/` },
    frontmatter: { category }
  }
});

describe('getCategories', () => {
  it('orders categories by their most recent post and counts posts', () => {
    const edges = [edge('AI'), edge('DX'), edge('AI'), edge('MOBX'), edge('DX'), edge('AI')];

    expect(getCategories(edges)).toEqual([
      { name: 'AI', slug: '/category/ai/', count: 3 },
      { name: 'DX', slug: '/category/dx/', count: 2 },
      { name: 'MOBX', slug: '/category/mobx/', count: 1 }
    ]);
  });

  it('skips posts without a category', () => {
    const edges = [{ node: { fields: {}, frontmatter: {} } }, edge('AI')];

    expect(getCategories(edges)).toEqual([{ name: 'AI', slug: '/category/ai/', count: 1 }]);
  });
});
