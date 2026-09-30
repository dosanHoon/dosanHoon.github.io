import React from 'react';
import renderer from 'react-test-renderer';
import { PureFooter as Footer } from './Footer';

describe('Footer', () => {
  it('renders correctly', () => {
    const props = {
      data: {
        site: {
          siteMetadata: {
            copyright: 'copyright'
          }
        }
      }
    };

    const tree = renderer.create(<Footer {...props} />).toJSON();
    expect(tree).toMatchSnapshot();
  });
});
