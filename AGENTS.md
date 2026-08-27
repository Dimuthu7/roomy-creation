<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Review-before-proceeding workflow

After completing any requested code modification, stop and ask the user to review it (they will run/check the project themselves) before doing anything further.

Do not run `git commit`, and do not create or edit any markdown file (including auto-memory files under `~/.claude/projects/**/memory/`, or any other `.md` file in or outside this repo), until the user has explicitly confirmed after their own review. This applies even if a broader task seems to call for it — wait for confirmation first, every time.
