# How to contribute
Thank you for contributing to clinical-timeline! This document provides a brief set of guidelines for contributing.

## Background
The clinical-timeline currently uses a "fork and pull" model for collaborative software development.

From the [GitHub Help Page of Using Pull Requests](https://help.github.com/articles/using-pull-requests/):

"The fork & pull model lets anyone fork an existing repository and push changes to their personal fork without requiring access be granted to the source repository. The changes must then be pulled into the source repository by the project maintainer. This model reduces the amount of friction for new contributors and is popular with open source projects because it allows people to work independently without upfront coordination."

## Contributing via a Pull Request
- Fork the [clinical-timleline](https://github.com/cBioPortal/clinical-timeline) project on GitHub. For general instructions on forking a GitHub project, see [Forking a Repo](https://help.github.com/articles/fork-a-repo/) and [Syncing a fork](https://help.github.com/articles/syncing-a-fork/).

- Once you have forked the repo, you need to create your code contributions within a new branch of your forked repo. For general background on creating and managing branches within GitHub, see: [Git Branching and Merging](https://git-scm.com/book/en/v2/Git-Branching-Basic-Branching-and-Merging).

- To begin, create a topic branch from where master. You usually create a branch like so:

`git checkout master`
`git checkout -b [name_of_your_new_branch]`

- You then usually commit code changes, and push your branch back to GitHub like so:

`git push origin [name_of_your_new_branch]`

- Open a Pull Request on GitHub to the master branch on clinical-timeline.

## Automated Testing on Travis

All Pull Requests are automatically tested on [Travis CI](https://travis-ci.org/cBioPortal/clinical-timeline/pull_requests). Currently there is a set of unit tests for the some features and a visual regression test that makes some screenshots and compares them to the ones stored in the repository.

### What to do if the screenshot test fails
When the screenshot test fails, it means that the screenshot taken from your
instance of the portal differs from the screenshot stored in the repo.
To view the difference in the image online one can use the files view in the PR ([example](https://github.com/cBioPortal/clinical-timeline/pull/98/files)).

If you prefer to compare the images locally, you need to first download the
failing screenshot. The Travis CI log will show you where the image was
uploaded on [clbin.com](https://clbin.com). First, download the image and
replace the screenshot in the repo. For instance run in the root dir of
cBioPortal:

```bash
curl 'https://clbin.com/[replace-with-clbin-image-from-log].png' > test/end-to-end/screenshots/[replace-with-image-from-repo].png
``` 

Then follow the steps outlined in [this blog post](http://www.akikoskinen.info/image-diffs-with-git/) to compare the 
images locally. Run `git diff` from your repo to see the ImageMagick diff.

Once you downloaded the images you do the following for each screenshot:

- If the change in the screenshot is **undesired**, i.e. there is regression, you
  should fix your PR.
- If the change in the screenshot is **desired**, add the screenshot to the
  repo, commit it and push it to your PR's branch.