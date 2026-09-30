/* 글쓰기 편집기 미리보기 — 블로그 글 페이지와 같은 타이포그래피로 보여준다 (preview.css).
 * 섹션 들여쓰기(wrapSections)는 실제 사이트 빌드에서만 적용된다. */
/* global CMS, createClass, h */

// 본문 편집 모드 기본값을 마크다운 원문으로 둔다. Decap CMS는 localStorage의 마지막 선택 → 없으면 리치 텍스트 순으로 정하고
// config의 modes 순서는 보지 않는다. 리치 텍스트는 표·<figure> 같은 HTML을 바꿔 저장할 수 있다. 직접 바꾼 선택은 유지된다.
const MARKDOWN_MODE_KEY = 'cms.md-mode';

try {
  if (!window.localStorage.getItem(MARKDOWN_MODE_KEY)) {
    window.localStorage.setItem(MARKDOWN_MODE_KEY, 'raw');
  }
} catch (error) {
  // 저장소를 쓸 수 없으면 CMS 기본값(리치 텍스트)으로 동작한다
}

const CATEGORY_LABELS = { REACT: 'React', MOBX: 'MobX', JAVASCRIPT: 'JavaScript' };

const formatDate = (value) => {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
};

const PostPreview = createClass({
  render() {
    const data = this.props.entry.get('data');
    const category = data.get('category');
    const meta = [
      data.get('draft') ? '초안' : '공개',
      category ? (CATEGORY_LABELS[category] || category) : '',
      formatDate(data.get('date'))
    ].filter(Boolean).join(' · ');

    return h(
      'article',
      { className: 'preview' },
      h('p', { className: 'preview__meta' }, meta),
      h('h1', { className: 'preview__title' }, data.get('title') || '제목 없음'),
      data.get('description') ? h('p', { className: 'preview__description' }, data.get('description')) : null,
      h('div', { className: 'preview__body' }, this.props.widgetFor('body'))
    );
  }
});

const PagePreview = createClass({
  render() {
    const data = this.props.entry.get('data');

    return h(
      'article',
      { className: 'preview' },
      h('h1', { className: 'preview__title' }, data.get('title')),
      h('div', { className: 'preview__body' }, this.props.widgetFor('body'))
    );
  }
});

CMS.registerPreviewStyle('https://cdn.jsdelivr.net/npm/pretendard@1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css');
CMS.registerPreviewStyle('/admin/preview.css');
CMS.registerPreviewTemplate('posts', PostPreview);
CMS.registerPreviewTemplate('pages', PagePreview);
