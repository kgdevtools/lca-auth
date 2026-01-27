# Git Quick Reference

This is a compact reference of safe Git commands and recommended flows — keep it handy.

**Basic Flow (local work)**
- Work on a branch (recommended):

```bash
git checkout -b feat/my-change
git add <files>
git commit -m "Short message"
git push -u origin feat/my-change
```

- Fast single-branch push (only when remote hasn't advanced):

```bash
git add <files>
git commit -m "Message"
git push origin <branch>
```

**If `git push` is rejected (remote moved forward)**
- Inspect differences:

```bash
git fetch origin
git log --oneline origin/<branch>..HEAD
```

- Rebase your local commits on top of remote (clean, linear history):

```bash
git pull --rebase origin <branch>
# resolve conflicts, then
git add <file(s)>
git rebase --continue
git push origin <branch>
```

- Or merge instead of rebase (keeps merge commits):

```bash
git pull origin <branch>
# resolve conflicts, then
git add <file(s)>
git commit   # if merge created conflicts resolution
git push origin <branch>
```

**Safe feature release (what we used for auth work)**
1. Backup local work if needed:

```bash
git checkout master
git branch backup-local-master
```

2. Create a branch from remote production `master` and cherry-pick your auth commits:

```bash
git fetch origin
git checkout -b release-auth origin/master
git cherry-pick <commit-sha>
# if conflicts: edit files, then
git add <file(s)>
git cherry-pick --continue
git push -u origin release-auth
```

3. Open a Pull Request from `release-auth` → `master` on GitHub for review and CI.

**Add files from another branch without cherry-pick**
- If the changes are uncommitted or you want specific files only:

```bash
git checkout release-auth          # target branch
git checkout backup-local-master -- path/to/file path/to/dir
git commit -m "Add specific files"
git push origin release-auth
```

**Reset local `master` to remote (be careful)**
- Use only if you no longer need local differences (we kept a backup branch earlier):

```bash
git fetch origin
git checkout master
git reset --hard origin/master
```

**Force push (dangerous) — use only with coordination**

```bash
git push --force-with-lease origin <branch>
```

**Open a PR**
- Web: Go to repo → compare & pull request, choose base `master`, compare `release-auth`, add title & description.
- GitHub CLI (if installed):

```bash
gh pr create --base master --head release-auth --title "Auth: signup/signin/reset" --body "Short description" --draft
```

**Useful safety tips / aliases**
- Keep habit: create and push feature branches, not direct commits to `master`.
- Quick alias to fetch + rebase current branch onto remote counterpart:

```bash
git config --global alias.sync '!f() { git fetch origin && git rebase origin/$(git rev-parse --abbrev-ref HEAD); }; f'
# use: git sync
```

**Troubleshooting**
- See what files a commit changed:

```bash
git show --name-status <commit-sha>
```

- List branches and current tracking info:

```bash
git branch -vv
```

**Short glossary**
- PR (Pull Request): a request on GitHub to merge one branch into another, with review and CI.
- `cherry-pick`: copy a single commit from another branch into the current branch.
- `rebase`: replay local commits on top of another branch's tip (rewrites history).
- `merge`: combine histories, may create a merge commit.

---
File created as a quick reference. Update as your workflow evolves.
