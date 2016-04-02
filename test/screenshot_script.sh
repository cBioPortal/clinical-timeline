#!/usr/bin/env bash
# halt on error
set -e

# dir of bash script http://stackoverflow.com/questions/59895
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# patient view screenshot
phantomjs --ignore-ssl-errors=true ${DIR}/make_screenshots.js \
	${DIR}'/../index.html?json=
[{"label":"Surgery", "times":[{"starting_time": 0, "ending_time": 1, "tooltip_tables":[[["Location","Torso"],["Source","External Hospital"]]]},
{"starting_time": 1, "ending_time": 2,"tooltip_tables":[[["Location","Spine"],["Source","Hospital"]]]}],"visible":true},
{"label":"Diagnosis", "times": [
{"starting_time": 2, "ending_time":
2,"display":"circle","tooltip_tables":[[["Health",1],["MRI","good"]]]},
{"starting_time": 5, "ending_time":
5,"display":"circle","tooltip_tables":[[["Health",2],["MRI","bad left"]]]},
{"starting_time": 5, "ending_time":
5,"display":"circle","tooltip_tables":[[["Health",3],["MRI","bad right"]]]}
],"visible":true},
{"label":"Status", "times": [
{"starting_time": -465, "ending_time": -465, "display":"square", "tooltip_tables":[[["TOOLTIP","TEST"],["TOOLTIP2","TEST3"]]]},
{"starting_time": -10, "ending_time": -10, "display":"square", "tooltip_tables":[[["TOOLTIP","TEST"],["TOOLTIP2","TEST3"]]]}],"visible":true},
{"label":"Test", "times": [
{"starting_time": 1, "ending_time": 1,
"display":"circle","tooltip_tables":[[["Type","PSA"],["Result",10]]]},
{"starting_time": 2, "ending_time": 2,
"display":"circle","tooltip_tables":[[["Type","PSA"],["Result",20]]]},
{"starting_time": 3, "ending_time": 3,
"display":"circle","tooltip_tables":[[["Type","PSA"],["Result",30]]]},
{"starting_time": 4, "ending_time": 4,
"display":"circle","tooltip_tables":[[["Type","PSA"],["Result",40]]]},
{"starting_time": 5, "ending_time": 5,
"display":"circle","tooltip_tables":[[["Type","PSA"],["Result",50]]]},
{"starting_time": 6, "ending_time": 6,
"display":"circle","tooltip_tables":[[["Type","PSA"],["Result",60]]]},
{"starting_time": 7, "ending_time": 7,
"display":"circle","tooltip_tables":[[["Type","PSA"],["Result",70]]]},
{"starting_time": 8, "ending_time": 8,
"display":"circle","tooltip_tables":[[["Type","PSA"],["Result",80]]]},
{"starting_time": -200, "ending_time": -200,
"display":"circle","tooltip_tables":[[["Type","Phos"],["Result",10]]]},
{"starting_time": -210, "ending_time": -210,
"display":"circle","tooltip_tables":[[["Type","Phos"],["Result",50]]]},
{"starting_time": -220, "ending_time": -220,
"display":"circle","tooltip_tables":[[["Type","Phos"],["Result",80]]]}
],
"collapse":true,
"visible":true},
{"label":"TreatmentType", "times": [
{"starting_time": -220, "ending_time": -200,
"tooltip_tables":[[["TREATMENT_TYPE","Radio"]]]},
{"starting_time": -220, "ending_time": -200,
"tooltip_tables":[[["TREATMENT_TYPE","Chemo"],["AGENT","ABC"]]]}
],
"visible":true},
{"label":"TreatmentTypeStuff", "times": [
{"starting_time": -220, "ending_time": -200,
"tooltip_tables":[[["TREATMENT_TYPE","Special"],["STUFF","XYZ"]]]},
{"starting_time": -220, "ending_time": -200,
"tooltip_tables":[[["TREATMENT_TYPE","Special"],["STUFF","ABC"]]]}
],
"visible":true}
]' \
	${DIR}'/screenshots/index_html.png' \
	50  

# make sure screenshot is still the same as the one in the repo, if not upload
# the image
git diff --quiet -- ${DIR}/screenshots/index_html.png || \
    (echo "screenshot differs see:" && curl -F "clbin=@${DIR}/screenshots/index_html.png" https://clbin.com && exit 1)
