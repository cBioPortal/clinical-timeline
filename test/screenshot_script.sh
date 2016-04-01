#!/usr/bin/env bash
# halt on error
set -e

# dir of bash script http://stackoverflow.com/questions/59895
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# patient view screenshot
phantomjs --ignore-ssl-errors=true ${DIR}/make_screenshots.js \
	${DIR}'/../index.html' \
	${DIR}'/screenshots/index_html.png' \
	50  

# make sure screenshot is still the same as the one in the repo, if not upload
# the image
git diff --quiet -- ${DIR}/screenshots/index_html.png || \
    (echo "screenshot differs see:" && curl -F "clbin=@${DIR}/screenshots/index_html.png" https://clbin.com && exit 1)
