// 마크다운 HTML을 제목 기준 섹션으로 감싼다. 제목 아래 본문을 들여써서 단락 구분을 만들기 위함.
// 글에서 쓰인 제목 레벨(minLevel 이상) 중 가장 높은 두 단계만 섹션이 된다(최근 글은 h2/h3, 옛 글은 h1/h2).
// minLevel보다 높은 제목(예: About의 h1)은 섹션을 모두 닫는 구역 구분선으로 그대로 둔다.
// 첫 제목 앞의 도입부는 감싸지 않는다.
const HEADING_START = /(?=<h[1-6][\s>])/i;
const HEADING_LEVEL = /^<h([1-6])[\s>]/i;

const wrapSections = (html, classNames, { minLevel = 1 } = {}) => {
  if (!html) {
    return html;
  }

  const parts = html.split(HEADING_START);
  const levels = parts
    .map((part) => part.match(HEADING_LEVEL))
    .filter(Boolean)
    .map((match) => Number(match[1]))
    .filter((level) => level >= minLevel);

  if (levels.length === 0) {
    return html;
  }

  const [topLevel, subLevel] = Array.from(new Set(levels)).sort((a, b) => a - b);
  const stack = [];
  let out = '';

  const close = () => {
    stack.pop();
    out += '</div></div>';
  };

  const closeAll = () => {
    while (stack.length) {
      close();
    }
  };

  const open = (kind, part, level) => {
    const headingEnd = part.search(new RegExp(`</h${level}>`, 'i'));
    const splitAt = headingEnd === -1 ? part.length : headingEnd + `</h${level}>`.length;
    const modifier = kind === 'top' ? classNames.sectionTop : classNames.sectionSub;

    out += `<div class="${classNames.section} ${modifier}">`;
    out += part.slice(0, splitAt);
    out += `<div class="${classNames.sectionBody}">`;
    out += part.slice(splitAt);
    stack.push(kind);
  };

  parts.forEach((part) => {
    const match = part.match(HEADING_LEVEL);
    const level = match ? Number(match[1]) : null;

    if (level !== null && level < topLevel) {
      closeAll();
      out += part;
    } else if (level === topLevel) {
      closeAll();
      open('top', part, level);
    } else if (subLevel && level === subLevel) {
      if (stack[stack.length - 1] === 'sub') {
        close();
      }
      open('sub', part, level);
    } else {
      out += part;
    }
  });

  closeAll();

  return out;
};

export default wrapSections;
