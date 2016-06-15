#!/usr/bin/env bash
# halt on error
set -e

# dir of bash script http://stackoverflow.com/questions/59895
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

#read data1 - normal data set (months)
data1file=${DIR}'/data/data1.json'
data1=$(cat "$data1file")

#read data2 - for beginning at 0 (days)
data2file=${DIR}'/data/data2.json'
data2=$(cat "$data2file")

#read data3 (years)
data3file=${DIR}'/data/data3.json'
data3=$(cat "$data3file")

# patient view screenshot
phantomjs --ignore-ssl-errors=true ${DIR}/make_screenshots.js \
	${DIR}'/../index.html?json='"$data1" \
	${DIR}'/screenshots/index_html_data1_advanced.png' \
	50

phantomjs --ignore-ssl-errors=true ${DIR}/make_screenshots.js \
	${DIR}'/../index.html?json='"$data2" \
	${DIR}'/screenshots/index_html_data2_advanced.png' \
	50

phantomjs --ignore-ssl-errors=true ${DIR}/make_screenshots.js \
	${DIR}'/../index.html?json='"$data3" \
	${DIR}'/screenshots/index_html_data3_advanced.png' \
	50

phantomjs --ignore-ssl-errors=true ${DIR}/make_screenshots.js \
	${DIR}'/../index.html?json='"$data1"'?view=simple' \
	${DIR}'/screenshots/index_html_data1_simple.png' \
	50

phantomjs --ignore-ssl-errors=true ${DIR}/make_screenshots.js \
	${DIR}'/../index.html?json='"$data2"'?view=simple' \
	${DIR}'/screenshots/index_html_data2_simple.png' \
	50

phantomjs --ignore-ssl-errors=true ${DIR}/make_screenshots.js \
	${DIR}'/../index.html?json='"$data3"'?view=simple' \
	${DIR}'/screenshots/index_html_data3_simple.png' \
	50

# make sure screenshot is still the same as the one in the repo, if not upload
# the image
git diff --quiet -- ${DIR}/screenshots/index_html_data1_advanced.png || \
    (echo "screenshot differs see:" && curl -F "clbin=@${DIR}/screenshots/index_html_data1_advanced.png" https://clbin.com && exit 1)

git diff --quiet -- ${DIR}/screenshots/index_html_data2_advanced.png || \
    (echo "screenshot differs see:" && curl -F "clbin=@${DIR}/screenshots/index_html_data2_advanced.png" https://clbin.com && exit 1)

git diff --quiet -- ${DIR}/screenshots/index_html_data3_advanced.png || \
    (echo "screenshot differs see:" && curl -F "clbin=@${DIR}/screenshots/index_html_data3_advanced.png" https://clbin.com && exit 1)

git diff --quiet -- ${DIR}/screenshots/index_html_data1_simple.png || \
    (echo "screenshot differs see:" && curl -F "clbin=@${DIR}/screenshots/index_html_data1_simple.png" https://clbin.com && exit 1)

git diff --quiet -- ${DIR}/screenshots/index_html_data2_simple.png || \
    (echo "screenshot differs see:" && curl -F "clbin=@${DIR}/screenshots/index_html_data2_simple.png" https://clbin.com && exit 1)

git diff --quiet -- ${DIR}/screenshots/index_html_data3_simple.png || \
    (echo "screenshot differs see:" && curl -F "clbin=@${DIR}/screenshots/index_html_data3_simple.png" https://clbin.com && exit 1)
