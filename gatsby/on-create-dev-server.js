'use strict';

const fs = require('fs');
const path = require('path');

// 글쓰기 편집기(admin/)는 로컬 개발 서버에서만 /admin/ 으로 제공한다.
// static/ 밖에 두어 운영 빌드(public/)에는 포함되지 않는다. 사용법은 WRITING.md.
const ADMIN_DIR = path.resolve(__dirname, '..', 'admin');
const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.yml': 'text/yaml; charset=utf-8'
};

const onCreateDevServer = ({ app }) => {
  // CMS는 config.yml을 현재 주소 기준 상대 경로로 읽으므로 /admin → /admin/ 으로 맞춘다.
  // 문자열 '/admin'은 Express 기본 설정에서 '/admin/'에도 걸려 무한 리다이렉트가 되므로 정규식으로 정확히 맞춘다.
  app.get(/^\/admin$/, (req, res) => res.redirect('/admin/'));

  app.get(/^\/admin\/(.*)$/, (req, res, next) => {
    const relative = req.params[0] || 'index.html';
    const file = path.resolve(ADMIN_DIR, relative);
    const isInside = file.startsWith(`${ADMIN_DIR}${path.sep}`);

    if (!isInside || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      next();
      return;
    }

    res.setHeader('Content-Type', CONTENT_TYPES[path.extname(file)] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'no-store');
    fs.createReadStream(file).pipe(res);
  });
};

module.exports = onCreateDevServer;
