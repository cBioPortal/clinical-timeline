# clinical-timeline
[![Build Status](https://travis-ci.org/cBioPortal/clinical-timeline.svg?branch=master)](https://travis-ci.org/cBioPortal/clinical-timeline)
[![Code Climate](https://codeclimate.com/github/cBioPortal/clinical-timeline/badges/gpa.svg)](https://codeclimate.com/github/cBioPortal/clinical-timeline)
[![Coverage Status](https://coveralls.io/repos/github/cBioPortal/clinical-timeline/badge.svg)](https://coveralls.io/github/cBioPortal/clinical-timeline)
[![Join the chat at https://gitter.im/cBioPortal/clinical-timeline](https://badges.gitter.im/cBioPortal/clinical-timeline.svg)](https://gitter.im/cBioPortal/clinical-timeline?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)
[![API Doc](https://doclets.io/cBioPortal/clinical-timeline/master.svg)](https://doclets.io/cBioPortal/clinical-timeline/master)

clinical-timeline builds upon the popular [d3-timeline](https://github.com/jiahuang/d3-timeline) library, which displays a collection of timepoints in JSON format as a timeline. It focusses on visualization of clinical data on a timeline and extends the JSON format and the API with some new features and various plugins.

With the correct configuration one can instantiate a timeline as follows:

![timeline-example](http://i.imgur.com/UwD05Cz.gif)

The [index.html](http://rawgit.com/cBioPortal/clinical-timeline/master/index.html) showcases clinical-timeline's features in an exhuastive way.

## Building
Building the javascript files in clinical-timeline is handled by a Makefile. Makefiles are primarily used for building software on unix, but they are also great task runners. Executing the command `make build` in the root directory of clinical-timeline generates the distributable version of the timeline `clinical-timeline.min.js` in the `dist/` directory post concatination with minification and the documentation is generated in `docs/` directory. Whereas the command `make clean` can be used to clean the `dist/` directory, the command `make docs` updates only the documentation without building the distributable files.

## Examples
- [Stable](http://cbioportal.github.io/clinical-timeline/)
- [Development](http://rawgit.com/cBioPortal/clinical-timeline/master/index.html)
- [Various Usage](http://rawgit.com/cBioPortal/clinical-timeline/master/examples.html)
- [Live Deployment on cBioPortal](http://www.cbioportal.org/case.do?cancer_study_id=lgg_ucsf_2014&case_id=P15#nav_case_ids=P01,P02,P04,P05,P06,P07,P08,P09,P10,P11,P12,P13,P15,P16,P17,P18,P21,P24,P25,P26,P27,P28,P29)

## Documentation
Documentation for the library can be found [here](https://doclets.io/cBioPortal/clinical-timeline/master)

## Contributing
clinical-timeline is being actively developed and any kind of contribution to the repository is highly encouraged. For detailed instructions on contributing, one can use the [Contributing Guide](https://github.com/cBioPortal/clinical-timeline/CONTRIBUTING.md).

Checks before sending a PR:
- Single commit and [No merge commits](http://nathanleclaire.com/blog/2014/09/14/dont-be-scared-of-git-rebase/). Make commits in logical/cohesive units.
- Make sure your commit messages end with a Signed-off-by string (this line
  can be automatically added by git if you run the `git-commit` command with
  the `-s` option).
- Please add a before/after screenshot or gif here with e.g. [GifGrabber](http://www.gifgrabber.com/) if there is a new visual feature.
- Run all tests to assure nothing else was accidentally broken. This is done by running: `npm test`.
- Make sure you have added the necessary tests for your changes.

clinical-timeline uses [code-climate](https://codeclimate.com/) to maintain code quality and [coveralls](https://coveralls.io) for code-coverage. Please ensure that the [repo GPA](https://codeclimate.com/github/cBioPortal/clinical-timeline) and [code-coverage](https://coveralls.io/github/cBioPortal/clinical-timeline) doesn't falls if not increase post the new commit. Adding new [unit tests](https://github.com/cBioPortal/clinical-timeline/tree/master/test/unit-tests) is most welcomed. 

## License
[LGPL](https://github.com/cBioPortal/clinical-timeline/blob/master/LICENSE)
