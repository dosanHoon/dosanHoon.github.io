'use strict';

const _ = require('lodash');
const { createFilePath } = require('gatsby-source-filesystem');
const { fmImagesToRelative } = require('gatsby-remark-relative-images');

// 본문의 첫 이미지(마크다운 ![]() 또는 <img src>)를 카드 썸네일로 쓴다. 없으면 빈 문자열 → 카드에서 제목 썸네일을 그린다.
// 코드 블록 안의 예시는 제외하고, 외부 URL은 링크가 죽으면 카드가 깨지므로 블로그가 직접 호스팅하는 이미지만 쓴다.
const getFirstImage = (markdown) => {
  const body = (markdown || '').replace(/```[\s\S]*?```/g, '');
  const isLocal = (src) => !/^([a-z]+:)?\/\//i.test(src);
  const images = [];
  const patterns = [/!\[[^\]]*\]\(\s*<?([^)\s>]+)/g, /<img[^>]+src=["']([^"']+)["']/gi];

  patterns.forEach((pattern) => {
    let match = pattern.exec(body);
    while (match) {
      images.push({ index: match.index, src: match[1] });
      match = pattern.exec(body);
    }
  });

  const first = images
    .filter((image) => isLocal(image.src))
    .sort((a, b) => a.index - b.index)[0];

  return first ? first.src : '';
};

const onCreateNode = ({ node, actions, getNode }) => {
  const { createNodeField } = actions;

  fmImagesToRelative(node);

  if (node.internal.type === 'MarkdownRemark') {
    if (typeof node.frontmatter.slug !== 'undefined') {
      createNodeField({
        node,
        name: 'slug',
        value: node.frontmatter.slug
      });
    } else {
      const value = createFilePath({ node, getNode });
      createNodeField({
        node,
        name: 'slug',
        value
      });
    }

    if (node.frontmatter.tags) {
      const tagSlugs = node.frontmatter.tags.map((tag) => `/tag/${_.kebabCase(tag)}/`);
      createNodeField({ node, name: 'tagSlugs', value: tagSlugs });
    }

    if (node.frontmatter.category) {
      const categorySlug = `/category/${_.kebabCase(node.frontmatter.category)}/`;
      createNodeField({ node, name: 'categorySlug', value: categorySlug });
    }

    createNodeField({ node, name: 'thumbnail', value: getFirstImage(node.rawMarkdownBody) });
  }
};

module.exports = onCreateNode;
