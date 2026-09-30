import React from 'react';
import renderer from 'react-test-renderer';
import Feed from './Feed';

describe('Feed', () => {
  const props = {
    edges: [
      {
        node: {
          fields: {
            slug: '/test_0',
            categorySlug: '/test_0',
            thumbnail: ''
          },
          frontmatter: {
            date: '2016-09-01',
            description: 'test_0',
            category: 'test_0',
            title: 'test_0'
          }
        }
      },
      {
        node: {
          fields: {
            slug: '/test_1',
            categorySlug: '/test_1',
            thumbnail: '/media/test_1.svg'
          },
          frontmatter: {
            date: '2016-09-01',
            description: 'test_1',
            category: 'AI',
            title: 'test_1'
          }
        }
      },
      {
        node: {
          fields: {
            slug: '/test_2',
            categorySlug: '/test_2',
            thumbnail: 'https://example.com/test_2.png'
          },
          frontmatter: {
            date: '2016-09-01',
            description: 'test_2',
            category: 'MOBX',
            title: 'test_2'
          }
        }
      }
    ]
  };

  it('renders correctly', () => {
    const tree = renderer.create(<Feed {...props} />).toJSON();
    expect(tree).toMatchSnapshot();
  });
});
