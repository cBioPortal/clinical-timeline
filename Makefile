dist/clinical-timeline.js: js/lib/d3-timeline.js js/clinicalTimeline.js js/parser.js
	mkdir -p $(@D)
	echo "/* $(shell git describe --dirty --tags) */" > $@
	cat $^ >> $@

clean:
	rm -rf dist/

build: dist/clinical-timeline.js


.PHONY: build clean
