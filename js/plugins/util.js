var clinicalTimelineUtil = {
	timelineConstants: {
		ALLOWED_ZOOM_LEVELS: ["days", "3days", "10days", "months", "years"],
		DAYS_PER_YEAR: 365,
		DAYS_PER_MONTH: 30
	},
	getDifferenceTicksDays: function(zoomLevel) {
		var diff;
		switch (zoomLevel) {
			case "days":
				diff = 1;
				break;
			case "3days":
				diff = 3;
				break;
			case "10days":
				diff = 10;
				break;
			case "months":
				diff = 30;
				break;
			case "years":
				diff = 365;
				break;
		}
		return diff;
	}
}

/* start-test-code-not-included-in-build */
module.exports = clinicalTimelineUtil;
/* end-test-code-not-included-in-build */