import wrapSections from './wrap-sections';

const classNames = {
  section: 's',
  sectionTop: 's--top',
  sectionSub: 's--sub',
  sectionBody: 'b'
};

describe('wrapSections', () => {
  it('returns html unchanged when there is no heading', () => {
    expect(wrapSections('<p>a</p><p>b</p>', classNames)).toBe('<p>a</p><p>b</p>');
  });

  it('keeps the lead before the first heading and wraps h2 sections', () => {
    const html = '<p>lead</p>\n<h2>One</h2>\n<p>1</p>\n<h2>Two</h2>\n<p>2</p>';

    expect(wrapSections(html, classNames)).toBe(
      '<p>lead</p>\n'
      + '<div class="s s--top"><h2>One</h2><div class="b">\n<p>1</p>\n</div></div>'
      + '<div class="s s--top"><h2>Two</h2><div class="b">\n<p>2</p></div></div>'
    );
  });

  it('nests the second heading level inside the first', () => {
    const html = '<h2>A</h2><p>a</p><h3>A-1</h3><p>a1</p><h3>A-2</h3><p>a2</p><h2>B</h2><p>b</p>';

    expect(wrapSections(html, classNames)).toBe(
      '<div class="s s--top"><h2>A</h2><div class="b"><p>a</p>'
      + '<div class="s s--sub"><h3>A-1</h3><div class="b"><p>a1</p></div></div>'
      + '<div class="s s--sub"><h3>A-2</h3><div class="b"><p>a2</p></div></div>'
      + '</div></div>'
      + '<div class="s s--top"><h2>B</h2><div class="b"><p>b</p></div></div>'
    );
  });

  it('uses the two highest levels in the post and leaves deeper headings inline', () => {
    const html = '<h1>A</h1><h2>A-1</h2><h3>deep</h3><p>x</p>';

    expect(wrapSections(html, classNames)).toBe(
      '<div class="s s--top"><h1>A</h1><div class="b">'
      + '<div class="s s--sub"><h2>A-1</h2><div class="b"><h3>deep</h3><p>x</p></div></div>'
      + '</div></div>'
    );
  });

  it('keeps headings above minLevel as dividers that close open sections', () => {
    const html = '<h2>Contact</h2><ul></ul><h1>Part</h1><p>lead</p><h2>Co</h2><p>p</p><h3>Team</h3><h4>g</h4><h1>Skill</h1><ul></ul>';

    expect(wrapSections(html, classNames, { minLevel: 2 })).toBe(
      '<div class="s s--top"><h2>Contact</h2><div class="b"><ul></ul></div></div>'
      + '<h1>Part</h1><p>lead</p>'
      + '<div class="s s--top"><h2>Co</h2><div class="b"><p>p</p>'
      + '<div class="s s--sub"><h3>Team</h3><div class="b"><h4>g</h4></div></div>'
      + '</div></div>'
      + '<h1>Skill</h1><ul></ul>'
    );
  });

  it('ignores escaped headings inside code blocks', () => {
    const html = '<h2>A</h2><pre><code>&lt;h2&gt;not a heading&lt;/h2&gt;</code></pre>';

    expect(wrapSections(html, classNames)).toBe(
      '<div class="s s--top"><h2>A</h2><div class="b"><pre><code>&lt;h2&gt;not a heading&lt;/h2&gt;</code></pre></div></div>'
    );
  });
});
