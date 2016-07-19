/*
 * Utility object for clinical-timeline
 */
var clinicalTimelineUtil = {
	timelineConstants: {
		ALLOWED_ZOOM_LEVELS: ["days", "3days", "10days", "months", "years"],
		DAYS_PER_YEAR: 365,
		DAYS_PER_MONTH: 30
	},
	/*
	 * returns the difference (in days) between ticks on x-axis
	 * based on current zoom level
	 */
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
	},
  /**
   * returns the lower index of the indices between which the element(ele) lies in an array(arr)
   * based on binary search
   */
   getLowerBoundIndex: function(arr, ele) {
    var low = 0;
    var high = arr.length - 1;

    while(low < high){
      var mid = Math.round((low + high)/2);
      if (arr[mid] > ele) {
        high = mid - 1;
      } else {
        low = mid;
      }
    }
    return low;
  }
}

/* start-test-code-not-included-in-build */
module.exports = clinicalTimelineUtil;
/* end-test-code-not-included-in-build */