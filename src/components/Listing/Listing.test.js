import React from 'react';
import renderer from 'react-test-renderer';
import Listing from './Listing';

describe('Listing', () => {
  it('renders correctly', () => {
    const tree = renderer.create(<Listing title="title">test</Listing>).toJSON();
    expect(tree).toMatchSnapshot();
  });
});
