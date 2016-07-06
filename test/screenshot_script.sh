#!/usr/bin/env bash
# dir of bash script http://stackoverflow.com/questions/59895
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# patient view screenshot
screenshot_error_count=0
for testdata in $(echo ${DIR}/data/data*.json); do
    for view in simple advanced; do
        screenshot_png="${DIR}/screenshots/index_html_$(basename $testdata .json)_${view}.png"

        phantomjs --ignore-ssl-errors=true ${DIR}/make_screenshots.js \
            "${DIR}/../index.html?view=${view}&json=$(cat ${testdata})" \
            $screenshot_png \
            50

        # make sure screenshot is still the same as the one in the repo, if not upload
        # the image
        git diff --quiet -- $screenshot_png
        if [[ $? -ne 0 ]]; then
            screenshot_error_count=$(($screenshot_error_count + 1))
            echo "screenshot differs see:" && curl -F "clbin=@${screenshot_png}" https://clbin.com
        fi
    done
done

if [[ $screenshot_error_count -gt 0 ]]; then
    echo "${screenshot_error_count} SCREENSHOT TESTS FAILED"
    exit 1
else
    exit 0
fi
