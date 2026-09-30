# 로컬에서 글쓰기

브라우저 편집기([Decap CMS](https://decapcms.org), Netlify CMS 후속)로 글을 쓰고 고칩니다. 편집기는 **이 PC의 파일을 직접 읽고 씁니다.**
저장해도 커밋·push는 되지 않으니 확인한 뒤 직접 커밋합니다.

## 실행

```bash
yarn cms
```

개발 서버가 뜨면 http://localhost:8000/admin/ 을 엽니다. 끝낼 때는 `Ctrl+C`.

필요한 것: `nvm`, Node 10(+ `yarn`, 블로그 개발 서버용), Node 14 이상(nvm `default`, 편집기 저장 서버용).
Node 버전은 `CMS_SITE_NODE`, `CMS_PROXY_NODE` 환경변수로 바꿀 수 있습니다.

## 글 쓰는 흐름

1. **글 → 새 글**. 제목, URL(`/posts/영문-소문자-하이픈`), 카테고리, 요약, 본문을 채웁니다.
2. 새 글은 **초안**으로 시작합니다. 초안은 사이트에 나오지 않습니다.
3. 오른쪽 미리보기는 블로그 글 페이지와 같은 글꼴·크기로 보여줍니다.
   제목 아래 본문 들여쓰기(섹션)는 실제 사이트에서만 적용됩니다. http://localhost:8000 에서 확인하세요.
4. **저장**하면 `content/posts/YYYY-MM-DD-제목.markdown` 파일이 생기거나 바뀝니다.
5. 공개할 때는 초안을 끄고 저장한 뒤 커밋합니다. `develop`에 push하면 바로 배포됩니다.
   바로 올리기 부담되면 브랜치를 만들어 PR로 올리세요.

```bash
git diff
git switch -c post/<글-이름>
git add content/ static/media/
git commit -m "post: <제목>"
git push -u origin post/<글-이름>
```

## 주의

- 본문은 **마크다운 원문 모드**가 기본입니다. 리치 텍스트 모드는 표나 `<figure>` 같은 HTML을 바꿔 저장할 수 있으니, 기존 글을 고칠 때는 원문 모드를 쓰세요.
- 편집기로 저장하면 frontmatter 따옴표나 날짜 표기 형식이 바뀔 수 있습니다. 내용은 같습니다.
- 이미지를 올리면 `static/media/`에 저장되고 본문에는 `/media/파일명`으로 들어갑니다.
- 카테고리는 목록에서만 고릅니다. 새 카테고리가 필요하면 `admin/config.yml`의 `options`와 `src/constants/categories.js`(표시 이름·색)를 함께 추가하세요.
- About에는 `draft` 필드가 없습니다. 추가하면 About 페이지가 사라집니다.
- 공개된 글의 URL은 바꾸지 마세요. 주소가 바뀌어 기존 링크가 깨집니다.
- `/admin`은 운영 사이트에 배포되지 않습니다. 개발 서버에서만 열립니다.
