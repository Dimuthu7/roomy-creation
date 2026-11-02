<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Pull-request workflow

For any code change or bug fix, work on a branch, never directly on `main`:

1. Create a branch off the latest `main` (use the branch name the session was given, otherwise a short descriptive one).
2. Commit the changes there with a clear message.
3. Push the branch and open a pull request into `main`.
4. Stop and leave the review and the merge to the user. Do not merge the pull request, and do not push to `main`.

Run the relevant checks (`npm test`, `npm run lint`, and `npm run build` when the change could affect it) before opening the pull request, and say in the description what was and was not verified.

Markdown files (including this one and memory files) follow the same flow when they are part of the change. Do not leave unrelated edits in the same pull request.
