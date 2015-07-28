// vim: ts=2 sw=2
window.clinicalTimelineParser = (function() {
  function transformToTimelineJSON(clinical_timeline_data) {
    var transformToTrack = function(clin_events) {
      var track = {
        "label":clin_events[0].eventType,
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

  return transformToTimelineJSON;
})();
