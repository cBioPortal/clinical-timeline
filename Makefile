dist/clinical-timeline.js: js/lib/d3-timeline.js js/clinicalTimeline.js js/parser.js js/sanity.js
	mkdir -p $(@D)
	echo "/* cBioPortal Clinical Timeline $(shell git describe --dirty --tags) | Maintained @ github.com/cbioportal/clinical-timeline */" > $@
	cat $^ >> $@

dist/clinical-timeline.min.js: dist/clinical-timeline.js
	echo "/* cBioPortal Clinical Timeline $(shell git describe --dirty --tags) | Maintained @ github.com/cbioportal/clinical-timeline */" > $@
	uglifyjs $< >> $@

clean:
	rm -rf dist/

build: dist/clinical-timeline.js dist/clinical-timeline.min.js


.PHONY: build clean
