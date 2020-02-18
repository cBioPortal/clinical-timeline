/**
 * Plugin which trims the timeline to areas of interest
 * by cutting off portions with no timeline-elements
 * @type {clinicalTimelinePlugin}
 */
function trimClinicalTimeline(name, spec){
  clinicalTimelinePlugin.call(this, name, spec);
  this.id = "trimClinicalTimeline";
}

/**
 * runs the trimClinicalTimeline plugin
 * @param  {function} timeline    clinicalTimeline object
 * @param  {Object}   [spec=null] specification specific to the plugin
 */
trimClinicalTimeline.prototype.run = function (timeline, spec) {
  var toleranceRatio = 0.2, //cut the timeline after how much of inactivity in terms of percentage of width of timeline
    timelineElements = [],
    breakTimelineForKinkIndex = [],
    breakTimelineForKink = [],
    tickCoordinatesKink = [],
    divId = timeline.divId(),
    svg = timeline.zoomFactor() > 1 ? d3.select(timeline.divId()+" .scrollable g") : d3.select(timeline.divId()+" .timeline"),
    maxDays = timeline.getReadOnlyVars().maxDays,
    minDays = timeline.getReadOnlyVars().minDays,
    width = timeline.zoomFactor() > 1 ? timeline.zoomFactor() * timeline.width() : timeline.width(),
    margin = timeline.getReadOnlyVars().margin,
    zoomLevel = timeline.computeZoomLevel(minDays, maxDays, width, timeline.fractionTimelineShown()),
    tickValues = timeline.getTickValues(minDays, maxDays, zoomLevel),
    kinkLineData = [{ "x": 75,  "y": 0  }, { "x": 80,  "y": 5 }, //drawing the kink svg
                    { "x": 85,  "y": -5 }, { "x": 90,  "y": 5 },
                    { "x": 95,  "y": -5 }, { "x": 100, "y": 5 },
                    { "x": 105, "y": -5 }, { "x": 110, "y": 0 }],
    tolerance = Math.max((maxDays - minDays) * toleranceRatio, clinicalTimelineUtil.getDifferenceTicksDays(zoomLevel)),
    kinkLine = d3.svg.line()
      .x(function(d) { return d.x; })
      .y(function(d) { return d.y; })
      .interpolate("linear"),
    tickValuesInt = tickValues.map(function(x) {
      return Math.round(x);
    }),
    // the first and last ticks on the timeline, as ints
    ticksToShow = [tickValuesInt[0], tickValuesInt[tickValuesInt.length - 1]],
    expandedXAxis = d3.select(timeline.divId()+" > svg > g > g.axis");
  
  if (timeline.trimmingDidNothing()) {
    // if the first trim, which happens when not zoomed
    // does nothing, future trims should also do nothing.
    // without this, there is a chance that they do, as zooming in
    // changes the precision of the tick values, which decreases the duration
    // needed to trigger a trim
    return;
  }

  
  expandedXAxis.style("visibility", "hidden");

  var select = timeline.zoomFactor() > 1 ?
    (divId+" .scrollable g rect,"+divId+" .scrollable g circle") :
    (divId+" .timeline g rect,"+divId+" .timeline g circle")
  d3.selectAll(select).each(function(d, e) {
   for (var i = parseInt(d.starting_time); i <= parseInt(d.ending_time) + parseInt(clinicalTimelineUtil.getDifferenceTicksDays(zoomLevel)); i += clinicalTimelineUtil.getDifferenceTicksDays(zoomLevel)) {
      if (timelineElements.indexOf(i) === -1) {
        timelineElements.push(parseInt(i));
      }
    }
  });

  timelineElements.sort(function(a, b) { return a - b; });

  timelineElements.forEach(function(value, index) {
    // if point is within the timeline range
    if (value > tickValuesInt[0] && value < tickValuesInt[tickValuesInt.length - 1]) {
      // find the index of the tick directly to the left of the value
      for (var i = 0; i < tickValuesInt.length - 1; i++) {
        if (value >= tickValuesInt[i] && value <= tickValuesInt[i + 1]) {
          break;
        }
      }
      if (ticksToShow.indexOf(tickValuesInt[i]) === -1 && i !== tickValuesInt.length - 1) {
        ticksToShow.push(tickValuesInt[i]);
      }
      if (ticksToShow.indexOf(tickValuesInt[i + 1]) === -1 && i !== tickValuesInt.length - 1) {
        ticksToShow.push(tickValuesInt[i + 1]);
      }
    }
  });

  ticksToShow.sort(function(a, b) { return a - b; });

  var prevPush = 0;
  ticksToShow.forEach(function(item, index) {
    //calculate the position to place the kinks
    if (index < ticksToShow.length -1) {
      var first = ticksToShow[index],
        second = ticksToShow[index + 1],
        toPush = index + 1,
        noOfTicksDeletedAfterCurrentIndex = parseInt((ticksToShow[index+1] - ticksToShow[index]) / clinicalTimelineUtil.getDifferenceTicksDays(zoomLevel)) - 1;

      if (noOfTicksDeletedAfterCurrentIndex === 1) {
        //avoid trimming off only one tick
        ticksToShow.push(Math.round((first + second) / 2))
      } else if (second - first > tolerance) {
        if (toPush - prevPush > 1 || (prevPush === 0 && (second - first) > clinicalTimelineUtil.getDifferenceTicksDays(zoomLevel))) {
          breakTimelineForKinkIndex.push(toPush);
          breakTimelineForKink.push(second);
        }
        prevPush = toPush;
      } else if (noOfTicksDeletedAfterCurrentIndex > 1) {
          // add the ticks back if they were deleted but didn't pass tolerance
          for (var i = 0; i < noOfTicksDeletedAfterCurrentIndex; i++) {
              ticksToShow.push(first + (i + 1) * clinicalTimelineUtil.getDifferenceTicksDays(zoomLevel));
          }
      } 
    }
  });

  ticksToShow.sort(function(a, b) { return a - b; });

  // redetermine breakTimelineForKinkIndex after sorting
  breakTimelineForKinkIndex = [];
  for (var i = 0; i < breakTimelineForKink.length; i++) {
      breakTimelineForKinkIndex.push(ticksToShow.indexOf(breakTimelineForKink[i]));
  }

  var xScale = d3.time.scale()
    .domain([margin.left,  width - margin.right])
    .range([margin.left, width - margin.right]);

  var shiftAtBreak = 0; //make space for adding the kink

  for (var j = 0; j < ticksToShow.length; j++) {
    if (breakTimelineForKinkIndex.indexOf(j) > -1) {
      shiftAtBreak += 30;
    }
    var breakAdjust = breakTimelineForKinkIndex.length * 30;
    //calculate the position of the tick to be shown after trimming
    tickCoordinatesKink.push(margin.left + shiftAtBreak + (j * ((width - margin.right - margin.left - breakAdjust) / (ticksToShow.length - 1 ))));
  }

  var xAxis = d3.svg.axis()
    .scale(xScale)
    .orient("top")
    .tickValues(tickCoordinatesKink)
    .tickFormat(function(d, i) { return timeline.formatTime(timeline.daysToTimeObject(ticksToShow[i]), zoomLevel) });

  // Add the trimmmed axis
  var trimmedXAxis = svg.append("g") 
    .attr("class", "x axis")
    .attr("transform", "translate(0,20)")
    .call(xAxis);

  var kink = svg.append("g")
    .attr("class", "kink");

  for (i = 0; i < ticksToShow.length; i++) {
    //add kinks at the places where timeline is cut
    if (breakTimelineForKinkIndex.indexOf(i) > -1) {
      var kinkPosition = (tickCoordinatesKink[i-1] + tickCoordinatesKink[i])/2;
      kink.append("rect")
        .attr("height", 10)
        .attr("width", 35)
        .attr("class","kink-bg")
        .attr("x", kinkPosition - 17.5)
        .attr("y", 15)
        .attr("fill", "white")

      kink.append("path")
        .attr("d", kinkLine(kinkLineData))
        .attr("stroke", "black")
        .attr("stroke-width", 1)
        .attr("fill", "none")
        .attr("class","kink-line")
        .attr("transform", "translate("+ (kinkPosition - 92.5) +",20)")
    }
  }

  d3.selectAll(divId+" .kink-bg, "+divId+" .kink-line")
    .style("cursor", "pointer")
    .on("click", clickHandlerKink)
    .append("svg:title")
    .text("Click to expand the timeline");

  /**
   * returns updated x coordinate for the data elements according to th trimmed timeline 
   * @param  {int} pos starting time of the clinical timeline element
   * @return {int}     updated x coordinate post-trimming
   */
  function getXPosAdjustedForKink(pos) {   
    var first = clinicalTimelineUtil.getLowerBoundIndex(ticksToShow, pos);
    var second = first + 1;

    if (second > ticksToShow.length - 1) {
      return tickCoordinatesKink[first];
    }
    return tickCoordinatesKink[first] + (pos - ticksToShow[first]) * (tickCoordinatesKink[second] - tickCoordinatesKink[first]) / (ticksToShow[second] - ticksToShow[first]);
  }

  var diffCoordinatesPostTrim = tickCoordinatesKink[1] - tickCoordinatesKink[0],
    diffTicksSVGPreTrim = d3.transform(d3.select($(divId+" .axis .tick")[1]).attr("transform")).translate[0] - d3.transform(d3.select($(divId+" .axis .tick")[0]).attr("transform")).translate[0],
    widthMultiplier = diffCoordinatesPostTrim / diffTicksSVGPreTrim;
  
  d3.selectAll(divId+" [id^=timelineItem]").each(function (x) {
    if (this.tagName === "circle") {
      d3.select(this)
        //update x position for circular elements in the trimmed timeline
        .attr("cx", getXPosAdjustedForKink(x.starting_time))
        //update radius for circular elements in the trimmed timeline keeping height same
        .attr("r", d3.select(this).attr("r"));
    } else if (this.tagName === "rect") {
      d3.select(this)
        //update x position for rectangular elements in the trimmed timeline
        .attr("x", getXPosAdjustedForKink(x.starting_time))
      if (!(x.hasOwnProperty("display") && (x.display === "square"))) {
        //update width for non-square elements in the trimmed timeline
        d3.select(this).attr("width", d3.select(this).attr("width") * widthMultiplier);
      }
    } else {
      console.log("No such element as " + this)
    }
  });

  /**
   * Handles double clicking of the kinks in trimmed timeline
   * by extending back the timeline 
   * and also handles coming back to trimmed timeline
   */
  function clickHandlerKink() {
    timeline.pluginSetOrGetState("trimClinicalTimeline", false);
    //create a bounding box to ease the clicking of axis
    xAxisBBox = d3.select(timeline.divId()+" > svg > g > g.axis")[0][0].getBBox()
    d3.select(timeline.divId()+"> svg > g")
      .insert("rect")
      .attr("x", xAxisBBox.x)
      .attr("y", 4)
      .attr("width", xAxisBBox.width)
      .attr("height", xAxisBBox.height)
      .attr("fill", "rgba(0,0,0,0)")
      .style("cursor", "pointer")
      .on("click", function () {
        timeline.pluginSetOrGetState("trimClinicalTimeline", true);
      })
      .append("svg:title")
      .text("Click to trim the timeline");
  }

  // Adjust where in the timeline we are, since zoom doesn't know about
  // The trimmed timeline, as it renders after zoom
  if (timeline.zoomStart() !== null && !timeline.trimmed()) {
    timeline.trimmed(true);
    var regex = /(:?translate.)(\d+)(:?.*)/;
    var ticks = d3.select(divId + " svg g .x")[0][0].children;
    var tick = ticks[0];
    for (var i = 0; i < ticks.length; i++) {
      var newTick = ticks[i];
      if (timeline.zoomStart() - timeline.approximateTickToDayValue(newTick.textContent) < 0) {
        break;
      }
      tick = newTick;
    }
    var translate = "-" + tick.getAttribute("transform").match(regex)[2];
    timeline.translateX(translate)
    d3.select(divId).style("visibility", "hidden");
    timeline();
    d3.select(divId).style("visibility", "visible");
  }

  timeline.fractionTimelineShown(ticksToShow.length / tickValues.length);
  if (ticksToShow.length === tickValues.length) {
    timeline.trimmingDidNothing(true);
  }
}

Object.setPrototypeOf(trimClinicalTimeline.prototype, clinicalTimelinePlugin.prototype);

/* start-test-code-not-included-in-build */
module.exports = trimClinicalTimeline;
/* end-test-code-not-included-in-build */
