import React from 'react';
import renderer from 'react-test-renderer';
import Intro from './Intro';

describe('Intro', () => {
  it('renders correctly', () => {
    const props = {
      author: {
        name: 'name',
        photo: '/photo.jpg',
        bio: 'bio'
      }
    };

    const tree = renderer.create(<Intro {...props} />).toJSON();
    expect(tree).toMatchSnapshot();
  });
});
