# SNS 공유용 요약글

---

## Threads / X (트위터)

AI Agent에게 기능 구현 시키려면 결국 프로젝트 맥락을 전달해야 하는데, 매번 프롬프트로 설명하면 토큰 낭비가 심하다.

그래서 기획서/회의록을 마크다운으로 축적하고, Agent가 직접 참조하는 체계를 만들었다.

핵심:
- CLAUDE.md, .cursorrules, copilot-instructions.md에 동일한 가이드 세팅
- 어떤 Agent를 쓰든 같은 맥락 전달
- "이 파일 참고해" 한마디면 끝
- 구두 합의 → 문서화로 기억 의존 제거

블로그에 자세히 정리했습니다.
https://dosanhoon.github.io/posts/ai-agent-markdown-docs-workflow

---

## LinkedIn

### AI Agent 시대, 문서 관리 방식을 바꿔야 합니다

AI Agent(Claude Code, Cursor, GitHub Copilot)를 활용해 개발하는 팀이 많아지고 있습니다. 그런데 Agent에게 기능 구현을 요청할 때마다 프로젝트 맥락을 장황하게 설명하고 계신가요?

저는 최근 프로젝트에서 기획서와 회의록을 마크다운으로 관리하는 문서 체계를 구축했습니다. 단순한 정리가 아니라, AI Agent가 직접 참조할 수 있는 구조입니다.

이 방식의 핵심은 세 가지입니다.

첫째, Agent별 가이드 파일을 동일한 내용으로 세팅합니다. Claude Code는 CLAUDE.md, Cursor는 .cursorrules, GitHub Copilot은 .github/copilot-instructions.md를 읽습니다. 팀원이 어떤 도구를 쓰든 같은 프로젝트 맥락을 전달받습니다.

둘째, 회의에서의 구두 합의를 마크다운으로 축적합니다. "그때 어떻게 하기로 했지?" 하고 기억에 의존하는 상황을 제거할 수 있습니다. Agent에게 물어보면 바로 관련 회의록을 찾아 답해줍니다.

셋째, context와 token을 절약합니다. 매번 프롬프트로 설명하는 대신 "specs/search.md 참고해서 수정해줘"라고 하면 Agent가 필요한 파일만 읽습니다.

이 체계가 자리 잡은 뒤로는 Agent 활용 생산성이 확실히 달라졌습니다. AI Agent를 적극 활용하는 팀이라면 도입을 추천합니다.

자세한 구조와 실전 패턴은 블로그에 정리했습니다.
https://dosanhoon.github.io/posts/ai-agent-markdown-docs-workflow

#AI #AIAgent #DeveloperExperience #Productivity #Documentation #ClaudeCode #Cursor #GitHubCopilot #DX #개발생산성
