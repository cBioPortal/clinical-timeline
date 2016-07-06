// vim: ts=2 sw=2
/*
 * Check sanity of JSON data representing timeline
 */
var clinicalTimelineSanityChecker = (function() {
  function validateData(data) {
    for (var i=0; i < data.length; i++) {
      validateTrack(data[i]);
    }
  }

  function validateTrack(track) {
    required_track_attrs = ["label", "times", "visible"];
    for (var i=0; i < required_track_attrs.length; i++) {
      if (!(required_track_attrs[i] in track)) {
        throw required_track_attrs[i] + " not in track";
      }
    }
    validateTimes(track.times);
  }

  function validateTimes(times) {
    for (var i=0; i < times.length; i++) {
      validateTime(times[i]);
    }
  }

  function validateTime(time) {
    return validateTooltipTables(time.tooltip_tables);
  }

  function validateTooltipTables(tooltip_tables) {
    for (var i=0; i < tooltip_tables.length; i++) {
      validateTooltipTable(tooltip_tables[i]);
    }
  }

  function validateTooltipTable(tooltip_table) {
    if (tooltip_table) {
      for (var i=0; i < tooltip_table.length; i++) {
        if (!tooltip_table[i]) {
          throw "tooltip_table err missing array: " + tooltip_table[i];
        }
        if (tooltip_table[i].length !== 2) {
          throw "tooltip_table err expected array of key and value pair: " + tooltip_table[i];
        }
      }
    } else {
      throw "tooltip_table err no table: " + tooltip_table;
    }
  }

  return validateData;
})();
/* start-test-code-not-included-in-build */
if (typeof module === "object" && module.exports) {
  module.exports = clinicalTimelineSanityChecker;
}
/* end-test-code-not-included-in-build */