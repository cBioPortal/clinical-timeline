// vim: ts=2 sw=2
var clinicalTimelineParser = (function() {
  function transformToTimelineJSON(clinical_timeline_data) {
    var transformToTrack = function(clin_events) {
      var track = {
        "label":transformLabel(clin_events[0].eventType),
        visible:true,
        "times":[]
      };
      clin_events.forEach(function(x) {
        var timepoint = {
          "starting_time":x.startDate,
          "ending_time":x.stopDate !== null? x.stopDate:x.startDate,
          "display":x.stopDate !== null? "rect":"circle",
          tooltip_tables:[Object.keys(x.eventData).map(function(k) {
            return [k, x.eventData[k]];
          })]
        };
        timepoint.tooltip_tables[0].push(["START_DATE", x.startDate]);
        if (x.stopDate !== null) {
          timepoint.tooltip_tables[0].push(["STOP_DATE", x.stopDate]);
        }
        track.times.push(timepoint);
      });
      return track;
    };
    var g = _.groupBy(clinical_timeline_data, "eventType");
    var tracks = [];
    _.each(g, function(x) {tracks.push(transformToTrack(x));});
    return tracks;
  }

  /*
   * http://stackoverflow.com/questions/1026069/
   */
  function capitalizeFirstLetterLowerCaseRest(string) {
      return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
  }
  
  /*
   * If label is uppercase and less than 5 characters (deemed as abbreviation),
   * or has both lowercase and uppercase characters,
   * it is assumed to be intentional and kept intact,
   * otherwise will be transformed by capitalizeFirstLetterLowerCaseRest
   */
  function transformLabel(label) {
    const mixedCase = /(?=.*[a-z])(?=.*[A-Z])/;
    const upperCaseOnly = /[A-Z]+[a-z]{0}/;
    if (mixedCase.test(label) || (upperCaseOnly.test(label) && label.length < 5)) {
      return label;
    }
    return capitalizeFirstLetterLowerCaseRest(label);
  }

  return transformToTimelineJSON;
})();
/* start-test-code-not-included-in-build */
if (typeof module === "object" && module.exports) {
  module.exports = clinicalTimelineParser;
}
/* end-test-code-not-included-in-build */
