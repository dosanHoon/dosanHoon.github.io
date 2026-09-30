import React from 'react';
import renderer from 'react-test-renderer';
import { PureHeader as Header } from './Header';

describe('Header', () => {
  it('renders correctly', () => {
    const props = {
      data: {
        site: {
          siteMetadata: {
            title: 'title',
            menu: [
              { label: 'Item 0', path: '/#0/' },
              { label: 'Item 1', path: '/#1/' }
            ],
            author: {
              photo: '/photo.jpg',
              contacts: {
                github: 'test',
                email: 'test@test.com'
              }
            }
          }
        }
      }
    };

    const tree = renderer.create(<Header {...props} />).toJSON();
    expect(tree).toMatchSnapshot();
  });
});
