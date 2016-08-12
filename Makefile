PATH  := node_modules/.bin:$(PATH)
HEADER="/* cBioPortal Clinical Timeline $(shell git describe --dirty --tags) | Maintained @ github.com/cbioportal/clinical-timeline */"

dist/clinical-timeline.js: js/lib/d3-timeline.js js/plugins/* js/clinicalTimeline.js js/parser.js js/sanity.js
	mkdir -p $(@D)
	echo $(HEADER) > $@
	sed -e '/start-test-code-not-included-in-build/','/end-test-code-not-included-in-build/d' $^ >> $@

dist/clinical-timeline.min.js: dist/clinical-timeline.js
	echo $(HEADER) > $@
	if [ ! -d "node_modules" ]; then \
		echo "installing node_modules"; \
		npm install;  \
	fi
	uglifyjs $< >> $@

clean:
	rm -rf dist/

build: dist/clinical-timeline.js dist/clinical-timeline.min.js

.PHONY: build clean