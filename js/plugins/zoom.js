/**
 * Plugin to add rectangular zoom selection. 
 * Use brush to zoom. After zooming in, scroll mouse or drag to pan.
 * @type {clinicalTimelinePlugin}
 */
function clinicalTimelineZoom(name, spec){
  clinicalTimelinePlugin.call(this, name, spec);
  this.id = "zoom";
}

/**
 * Gets all the data points, grouped by series, sorted by x position
 * @param {string} divId
 * @returns {Object} mapping from string to element
 */
function getOrderedDataPoints(divId) {
  var dataPoints = d3.selectAll(divId + " g circle,rect");
  var filteredPoints = [];

  for (var i = 0; i< dataPoints[0].length; i++) {
    var point = dataPoints[0][i];
    if (!point.getAttribute("id") || !point.getAttribute("id").startsWith("timelineItem")) {
      continue;
    }
    filteredPoints.push(point);
  }


  filteredPoints.sort(function (a, b) {
    return getPixelStartEndOfElement(a).start - getPixelStartEndOfElement(b).start;
  });

  return filteredPoints;
}

function getPixelStartEndOfElement(element) {
  if (element.localName === "circle") {
    // some circles don't have centers (!)
    var x = element.getAttribute("cx") ? element.getAttribute("cx") : element.getAttribute("x");
    var start = parseFloat(x) - parseFloat(element.getAttribute("width"));
    var end = parseFloat(x) + parseFloat(element.getAttribute("width"));
  } else { // rect
    var start = parseFloat(element.getAttribute("x"));
    var end = start + parseFloat(element.getAttribute("width"));
  }

  return {
    start: start,
    end: end,
  }
}

/**
 * @param {string} divId
 * @param {number} brushPixelStart
 * @returns {string | null}
 */
function findFirstDataPointInZoomRegion(divId, brushPixelStart) {
  var timelineElements = getOrderedDataPoints(divId);

  for (var i = 0; i < timelineElements.length; i++) {
    var tElement = timelineElements[i];

    var start = getPixelStartEndOfElement(tElement).start;
    if (brushPixelStart < start + 10) { // add a buffer for user error
      var id = "#" + tElement.getAttribute("id");
      var day;
      d3.select(id).each(function (e) {day = e.ending_time ? e.ending_time : e.starting_time;});
      return {id: id, day: day};
    }
  }
  return null;
}

/**
 * @param {string} divId
 * @param {number} brushPixelStart
 * @returns {string | null}
 */
function findDateLastDataPointInZoomRegion(divId, brushPixelEnd) {
  var timelineElements = getOrderedDataPoints(divId);

  for (var i = 0; i < timelineElements.length; i++) {
    var tElement = timelineElements[i];

    var end = getPixelStartEndOfElement(tElement).end
    if (brushPixelEnd < end - 10) { // add a buffer of 10 pixels for user error
      var id = tElement.getAttribute("id");
      var time;
      d3.select("#" + id).each(function (x) {time = x.starting_time;});
      return time;
    }
  }
  return null;
}

/**
 * runs the clinicalTimelineZoom plugin
 * @param  {function} timeline    clinicalTimeline object
 * @param  {Object}   [spec=null] specification specific to the plugin
 */
clinicalTimelineZoom.prototype.run = function(timeline, spec) {
  var readOnlyVars = timeline.getReadOnlyVars(),
    maxDays = readOnlyVars.maxDays,
    minDays = readOnlyVars.minDays,
    beginning = readOnlyVars.beginning,
    ending = readOnlyVars.ending,
    margin = readOnlyVars.margin,
    divId = timeline.divId(),
    width = timeline.width(),
    roundDown = clinicalTimelineUtil.roundDown,
    roundUp = clinicalTimelineUtil.roundUp,
    overviewAxisWidth = timeline.overviewAxisWidth(),
    chart = readOnlyVars.chart,
    svg = d3.select(divId + " svg"),
    g = d3.select(divId + " svg g"),
    gBoundingBox = g[0][0].getBoundingClientRect();

  if (timeline.zoomFactor() === 1) {
    /**
     * Add rectangular zoom selection
     * zoom in after brush ends
     */
    var brushend = function() {
      var extentStart = parseInt(d3.select(divId + " .extent").attr("x"));
      var extentEnd = extentStart + parseInt(d3.select(divId+" .extent").attr("width"));
      var zoomFactor, translate;
      // if the zoom region is tiny, the user clicked instead of clicking
      // and dragging. In this case, just make the zoom region half of the timeline,
      // centered around where they clicked
      if (extentStart + 2 > extentEnd) {
        var zoomFactor = 2.0;
        var translate = (zoomFactor * width) / 4;
        extentEnd = Math.max(0, extentEnd - width / 4);
        extentStart = Math.min(width, extentStart + width / 4);
      } else {
        var zoomStartDay, zoomStartId;
        var zoomStart = findFirstDataPointInZoomRegion(divId, extentStart);
        zoomStartId = zoomStart ? zoomStart.id : null;
        zoomStartDay = zoomStart ? zoomStart.day : null;
        var zoomEndDay = findDateLastDataPointInZoomRegion(divId, extentEnd);
        zoomFactor = zoomFactor ? zoomFactor : 0.9 * (maxDays - minDays) / (zoomEndDay - zoomStartDay);
      }

      var originalZoomLevel = timeline.computeZoomLevel(minDays, maxDays, width);
      //handle positioning of the overview rectangle post zoom in.
      var overViewScale = d3.time.scale()
        .domain([roundDown(minDays, clinicalTimelineUtil.getDifferenceTicksDays(originalZoomLevel)), roundUp(maxDays, clinicalTimelineUtil.getDifferenceTicksDays(originalZoomLevel))])
        .range([0 + margin.overviewAxis.left, overviewAxisWidth - margin.overviewAxis.right]);

      timeline.overviewX(zoomStartDay !== undefined ? zoomStartDay : overViewScale(brush.extent()[0].valueOf()));

      timeline.zoomFactor(zoomFactor);
      if (timeline.zoomFactor() > 0) {
        timeline.zoomFactor(Math.min(timeline.zoomFactor(), timeline.computeZoomFactor("days", minDays, maxDays, width)));
      } else {
       timeline.zoomFactor(timeline.computeZoomFactor("days", minDays, maxDays, width));
      }

      $('.'+divId.substr(1)+'-qtip').qtip("hide");
      d3.select(divId).style("visibility", "hidden");
      timeline();
      d3.select(divId).style("visibility", "visible");

      //now that the timeline is at its zoom level, translate and rerender
      if (translate) {
        timeline.translateX(-translate);
      } else  if (zoomStartDay && zoomStartDay > minDays) {
        translate = parseFloat(d3.select(zoomStartId)[0][0].getAttribute("x")) - 200;
        timeline.translateX(-translate);
      } else {
        timeline.translateX(0);
      }
      d3.select(divId).style("visibility", "hidden");
      timeline();
      d3.select(divId).style("visibility", "visible");
      
      d3.select(divId + " svg")
        .insert("rect")
        .attr("transform", "translate("+(parseInt(svg.attr("width"))-72)+", "+parseInt(svg.attr("height")-16)+")")
        .attr("width", 68)
        .attr("height", 14)
        .attr("ry", 2)
        .attr("rx", 2)
        .style("stroke-width", 1)
        .style("fill", "lightgray")
        .style("stroke", "gray");
      var zoomBtn = d3.select(divId + " svg")
        .insert("text")
        .attr("transform", "translate("+(parseInt(svg.attr("width"))-70)+", "+parseInt(svg.attr("height")-5)+")")
        .attr("class", "timeline-label")
       .text("Reset zoom")
        .style("cursor", "zoom-out")
        .attr("id", "timelineZoomOut");
      zoomBtn.on("click", function() {
        timeline.zoomFactor(1);
        timeline.overviewX(margin.overviewAxis.left);
        $('.'+divId.substr(1)+'-qtip').qtip("hide");
        d3.select(divId).style("visibility", "hidden");
        timeline();
        d3.select(divId).style("visibility", "visible");
        chart.scrolledX(null);
        this.remove();
      });
    };

    if (timeline.computeZoomLevel(minDays, maxDays, width * timeline.zoomFactor()) !== "days") {
      // add brush overlay
      var xScale = d3.time.scale()
         .domain([beginning, ending])
         .range([margin.left - 10, width - margin.right + 10]);
      var brush = d3.svg.brush()
        .x(xScale)
        .on("brush", function() {
          var extent = d3.event.target.extent();
        })
        .on("brushend", brushend);
      var overlayBrush = g.insert("g", ".axis")
        .attr("id", "overlayBrush");
      overlayBrush.attr("class", "brush")
        .call(brush)
        .selectAll(divId+' .extent,'+divId+' .background,'+divId+' .resize rect')
          .attr("height", gBoundingBox.height + 20)
          .attr("y", 0)
          .style("cursor", "zoom-in");
      zoomExplanation(divId, svg, "Click + drag to zoom", "hidden", 120);
      d3.select(divId+' .background').on("mouseover", function() {
          d3.select(divId+" #timelineZoomExplanation").style("visibility", "visible");
      }).on("mouseout", function() {
          d3.select(divId+" #timelineZoomExplanation").style("visibility", "hidden");
      });
    }
  } else {
    // Add panning explanation and visual indicator
    zoomExplanation(divId, svg, "Scroll/drag to move", "visible", 180);
    d3.select(divId + " svg").style("cursor", "move");
  }
  /**
   * adds textual explanation for the present current zoom state 
   * @param  {string} divId      divId for clinical-timeline
   * @param  {Object} svg        clinical-timeline's svg object
   * @param  {string} text       explanation's text
   * @param  {string} visibility css property to hide/show the explanation
   * @param  {number} pos        position of the explanation's text
   */
  function zoomExplanation(divId, svg, text, visibility, pos) {
    d3.select(divId + " svg")
      .insert("text")
      .attr("transform", "translate("+(parseInt(svg.attr("width"))-pos)+", "+parseInt(svg.attr("height")-5)+")")
      .attr("class", "timeline-label")
      .text("")
      .attr("id", "timelineZoomExplanation")
      .text(text)
      .style("visibility", visibility);
  }
}

Object.setPrototypeOf(clinicalTimelineZoom.prototype, clinicalTimelinePlugin.prototype);

/* start-test-code-not-included-in-build */
module.exports = clinicalTimelineZoom;
/* end-test-code-not-included-in-build */
