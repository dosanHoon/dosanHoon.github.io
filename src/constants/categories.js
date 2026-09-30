// 카테고리 표시 이름. frontmatter 값은 URL(/category/<kebab>)에 쓰이므로 그대로 두고 화면 표시만 바꾼다.
export const CATEGORY_LABELS = {
  REACT: 'React',
  MOBX: 'MobX',
  JAVASCRIPT: 'JavaScript'
};

// bg/fg: 칩, from/to: 자동 썸네일 그라디언트. fg는 bg·to 위에서 대비 4.5:1 이상.
export const CATEGORY_COLORS = {
  AI: {
    bg: '#E6FCF5', fg: '#087F5B', from: '#E6FCF5', to: '#C3FAE8'
  },
  DX: {
    bg: '#E7F5FF', fg: '#1864AB', from: '#E7F5FF', to: '#D0EBFF'
  },
  Frontend: {
    bg: '#FFF4E6', fg: '#B8400D', from: '#FFF4E6', to: '#FFE8CC'
  },
  DevOps: {
    bg: '#F3F0FF', fg: '#5F3DC4', from: '#F3F0FF', to: '#E5DBFF'
  },
  REACT: {
    bg: '#E3FAFC', fg: '#0B7285', from: '#E3FAFC', to: '#C5F6FA'
  },
  MOBX: {
    bg: '#FFF0F6', fg: '#A61E4D', from: '#FFF0F6', to: '#FFDEEB'
  },
  JAVASCRIPT: {
    bg: '#FFF9DB', fg: '#7A5200', from: '#FFF9DB', to: '#FFF3BF'
  }
};

export const DEFAULT_CATEGORY_COLORS = {
  bg: '#F1F3F5', fg: '#495057', from: '#F8F9FA', to: '#E9ECEF'
};
