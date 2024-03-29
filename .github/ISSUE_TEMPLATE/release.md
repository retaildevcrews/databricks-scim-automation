---
name: Release Template
about: Verify code is ready to release
labels: Release

---

This checklist is for verifing the release is ready to publish and published correctly.

## Release
- Title / Repo
- vx.x.x.x

### Validation
- [ ] All packages up to date (or task created)
- [ ] Remove any unused flags or conditional compilation
- [ ] Remove unused packages
- [ ] Code Version updated
- [ ] Code Review completed
- [ ] All existing automated tests (unit and e2e) pass successfully, new tests added as needed
- [ ] Code changes checked into master
- [ ] Sync github actions from master template
- [ ] Existing documentation is updated (readme, .md's)
- [ ] New documentation needed to support the change is created
- [ ] CI completes successfully
- [ ] CD completes successfully
- [ ] Smoke test deployed for 48 hours

### Release
- [ ] Tag repo with version tag
- [ ] Ensure CI-CD runs correctly
- [ ] Close Release Task
