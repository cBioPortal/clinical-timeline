/**
 * Utility object for clinical-timeline
 * Contains utility functions and variables required by different files
 * @type {Object}
 */
var clinicalTimelineUtil = {
  /**
   * stores various contstants shared between different functions and plugins of clinical-timeline
   * @type {Object}
   */
	timelineConstants: {
		ALLOWED_ZOOM_LEVELS: ["days", "3days", "10days", "months", "years"],
		DAYS_PER_YEAR: 365,
		DAYS_PER_MONTH: 30
	},
  /**
   * calculates the the difference (in days) between ticks on x-axis
   * based on current zoom level
   * @param  {string} zoomLevel current zoom-level
   * @return {number}           difference between ticks on clinical-timeline
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
   * uses binary search to calculate the lower index of the indices between which the element(ele) lies in an array(arr)
   * @param  {number[]} arr array to calculate index upon
   * @param  {number}   ele value of the element whose index has to be calculated
   * @return {number}       lower index
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
  },
 /**
  * rounds up to the nearest multiple of a number
  * @param  {number} numToRound number to round
  * @param  {number} multiple   nearest multiple of a number to round off to
  * @return {number}            rounded up number
  */
  roundUp : function(numToRound, multiple) {
    var remainder = numToRound % multiple;
    if (multiple === 0 || remainder === 0) {
      return numToRound;
    } else{
      if (numToRound < 0) {
        return -1 * clinicalTimelineUtil.roundDown(-1 * numToRound, multiple);
      } else {
        return Math.round(numToRound + multiple - remainder);
      }
    }
  },
 /**
  * rounds down to the nearest multiple of a number
  * @param  {number} numToRound number to round
  * @param  {number} multiple   nearest multiple of a number to round off to
  * @return {number}            rounded down number
  */
  roundDown : function(numToRound, multiple) {
    var remainder = numToRound % multiple;
    if (multiple === 0 || remainder === 0) {
      return numToRound;
    } else{
        if (numToRound < 0) {
          return -1 * clinicalTimelineUtil.roundUp(-1 * numToRound, multiple);
        } else {
          return Math.round(numToRound - remainder);
        }
    }
  }
}

/* start-test-code-not-included-in-build */
module.exports = clinicalTimelineUtil;
/* end-test-code-not-included-in-build */