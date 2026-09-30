// 날짜 내림차순으로 정렬된 글 목록에서 카테고리를 뽑는다.
// 처음 등장한 순서 = 가장 최근 글이 있는 순서.
const getCategories = (edges) => {
  const categories = [];
  const byName = {};

  edges.forEach(({ node }) => {
    const name = node.frontmatter.category;
    if (!name) {
      return;
    }

    if (!byName[name]) {
      byName[name] = { name, slug: node.fields.categorySlug, count: 0 };
      categories.push(byName[name]);
    }

    byName[name].count += 1;
  });

  return categories;
};

export default getCategories;
