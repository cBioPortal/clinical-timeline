/**
 * Plugin to add rectangular zoom selection. 
 * Use brush to zoom. After zooming in, scroll mouse or drag to pan.
 * @type {clinicalTimelinePlugin}
 */
function clinicalTimelineZoom(name, spec){
  clinicalTimelinePlugin.call(this, name, spec);
  this.id = "zoom";
}

function findNearestTick(position, divId) {
  var regex = /(:?translate.)(\d+)(:?.*)/;
  var ticks = d3.selectAll(divId + " .x .tick")[0];
  if (!ticks[0]) {
    ticks = d3.selectAll(divId + " g .axis .tick")[0];
  }
  var tick = ticks[0];
  var distance = Number.MAX_SAFE_INTEGER;

  for (var i = 0; i < ticks.length; i++) {
    var newTick = ticks[i];
    var tickPosition = newTick.getAttribute("transform").match(regex)[2];
    var newDistance = Math.abs(position - parseInt(tickPosition));
    if (distance < newDistance) {
      return tick;
    } else {
      distance = newDistance;
      tick = newTick;
    }
  }
  return tick;
}

/**
 * The zoom end has to be calculated by taking the pixel distance between
 * the start and end ticks, then translating pixel distance into actual distance
 * because otherwise when you zoom over a trimmed region, you will not zoom in an
 * appropriate ammount.
 */
function calculateZoomEnd(zoomStart, startTick, endTick, timeline) {
  var regex = /(:?translate.)(\d+)(:?.*)/;
  var ticks = d3.selectAll(timeline.divId() + " .x .tick")[0];
  var firstTick = ticks[0];
  var secondTick = ticks[1];
  var tickPixelDistance = (
    parseInt(secondTick.getAttribute("transform").match(regex)[2])
    -
    parseInt(firstTick.getAttribute("transform").match(regex)[2])
  )
  var tickValueDistance = (
    timeline.approximateTickToDayValue(secondTick.textContent)
    -
    timeline.approximateTickToDayValue(firstTick.textContent)
  )
  var zoomPixelDistance = (
    parseInt(endTick.getAttribute("transform").match(regex)[2])
    -
    parseInt(startTick.getAttribute("transform").match(regex)[2])
  )
  return zoomStart + (tickValueDistance / tickPixelDistance)*zoomPixelDistance;
}

/**
 * Gets all the data points, grouped by series, sorted by x position
 * @param {string} divId
 * @returns {Object} mapping from string to element
 */
function getOrderedDataPoints(divId) {
  var dataPoints = d3.selectAll(divId + " g circle,rect");
  var filteredPoints = [];
  var seriesRegex = /(:?timelineSeries_)(\d+)/;

  for (var i = 0; i< dataPoints[0].length; i++) {
    var point = dataPoints[0][i];
    if (!point.getAttribute("id") || !point.getAttribute("id").startsWith("timelineItem")) {
      continue;
    }
    filteredPoints.push(point);
  }


  filteredPoints.sort(function (a, b) {
    return parseFloat(a.getAttribute("x")) - parseFloat(b.getAttribute("x"))
  });

  return filteredPoints;
}

/**
 * @param {string} divId
 * @param {number} brushPixelStart
 * @returns {string | null}
 */
function findIdOfFirstDataPointInZoomRegion(divId, brushPixelStart) {
  var timelineElements = getOrderedDataPoints(divId);

  for (var i = 0; i < timelineElements.length; i++) {
    var tElement = timelineElements[i];

    var x = parseFloat(tElement.getAttribute("x"))
    if (brushPixelStart < x) { // add a buffer of 5 pixels for user error
      return tElement.getAttribute("id");
    }
  }
  return null;
}

/**
 * @param {string} divId
 * @param {number} brushPixelStart
 * @returns {string | null}
 */
function findIdOfLastDataPointInZoomRegion(divId, brushPixelEnd) {
  var timelineElements = getOrderedDataPoints(divId);

  for (var i = 0; i < timelineElements.length; i++) {
    var tElement = timelineElements[i];

    var x = parseFloat(tElement.getAttribute("x"))
    if (brushPixelEnd < x) { // add a buffer of 5 pixels for user error
      return tElement.getAttribute("id");
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

  timeline.zoomStart(null)
  if (timeline.zoomFactor() === 1) {
    /**
     * Add rectangular zoom selection
     * zoom in after brush ends
     */
    var brushend = function() {
      timeline.trimmed(false); // this will get switched back to true by timTimeline
      var extendLeft = parseInt(d3.select(timeline.divId()+" .extent").attr("x"));
      var extendRight = extendLeft + parseInt(d3.select(timeline.divId()+" .extent").attr("width"));
      
      // if the zoom region is tiny, the user clicked instead of clicking 
      // and dragging. In this case, just make the zoom region half of the timeline,
      // centered around where they clicked
      if (extendRight < extendLeft + 2) {
        var zoomFactor = 2.0;
        extendLeft = Math.max(0, extendLeft - width / 4);
        extendRight = Math.min(width, extendRight + width / 4);
      }
      var startTick = findNearestTick(extendLeft, timeline.divId());
      var endTick = findNearestTick(extendRight, timeline.divId());
      var zoomStart = timeline.approximateTickToDayValue(startTick.textContent);
      if (d3.selectAll(timeline.divId() + " .x .tick")[0][0]) {
        var zoomEnd = calculateZoomEnd(zoomStart, startTick, endTick, timeline);
      } else {
        var zoomEnd = timeline.approximateTickToDayValue(endTick.textContent);
      }
      timeline.zoomStart(zoomStart);
      if (!zoomFactor) {
        var points = getOrderedDataPoints(divId);
        var zoomStartId = findIdOfFirstDataPointInZoomRegion(divId, extendLeft);
        var zoomEndId = findIdOfLastDataPointInZoomRegion(divId, extendRight);
        var firstPointId = points[0].getAttribute("id");
        var lastPointId = points[points.length - 1].getAttribute("id");
        timeline.zoomStartId(zoomStartId);
        timeline.zoomEndId(zoomEndId);
        timeline.firstElementId(firstPointId);
        timeline.lastElementId(lastPointId);
      }

      var originalZoomLevel = timeline.computeZoomLevel(minDays, maxDays, width, timeline.fractionTimelineShown());
      //handle positioning of the overview rectangle post zoom in.
      var overViewScale = d3.time.scale()
        .domain([roundDown(minDays, clinicalTimelineUtil.getDifferenceTicksDays(originalZoomLevel)), roundUp(maxDays, clinicalTimelineUtil.getDifferenceTicksDays(originalZoomLevel))])
        .range([0 + margin.overviewAxis.left, overviewAxisWidth - margin.overviewAxis.right]);

      timeline.overviewX(overViewScale(brush.extent()[0].valueOf()));

      var xDaysRect = brush.extent()[0].valueOf();
      var selectWidth = parseInt(d3.select(timeline.divId()+" .extent").attr("width"));

      // Zoom factor is a number representing how zoomed in the timeline should be.
      // 1 is not zoomed in at all, and values greater than 1 zoom the timeline in.
      // Zoom factor is calculated one of three ways:
      // 1. If the user clicked but did not drag, the zoom factor is 2
      // 2. If the user clicked and dragged and created a region with at least two timeline
      //    events within it, the zoom factor will be the pixel distance between
      //    the start of the first event and the end of the second event divided by the
      //    timeline width.
      // 3. If the user clicked and dragged but selected a region with one or fewer
      //    timeline events, the closest markers on the timeline ruler will be used
      //    to calculate the zoom region.
      if (zoomStartId && zoomEndId && zoomStartId !== zoomEndId) {
        zoomStart = parseFloat(d3.select("#" + zoomStartId)[0][0].getAttribute("x"));

        var zoomEndElement = d3.select("#" + zoomEndId)[0][0];
        zoomEnd = parseFloat(zoomEndElement.getAttribute("x"));
        if (zoomEndElement.localname === "rect") {
          zoomEnd += parseFloat(zoomEndElement.getAttribute("width"))
        }
        zoomFactor = width / (zoomEnd - zoomStart);
      }
      timeline.zoomFactor(zoomFactor ? zoomFactor : width / selectWidth);
      if (timeline.zoomFactor() > 0) {
        timeline.zoomFactor(Math.min(timeline.zoomFactor(), timeline.computeZoomFactor("days", minDays, maxDays, width)));
      } else {
        timeline.zoomFactor(timeline.computeZoomFactor("days", minDays, maxDays, width));
      }

      var zoomLevel = timeline.computeZoomLevel(zoomStart, zoomEnd, timeline.width(), 1);
      var tickValues = timeline.getTickValues(readOnlyVars.minDays, readOnlyVars.maxDays, zoomLevel);
      // TODO: Translation post zooming is not entirely correct
      if (xDaysRect > minDays) {
        var xZoomScale = d3.time.scale()
           .domain([tickValues[0], tickValues[tickValues.length-1]])
           .range([margin.left, width * timeline.zoomFactor() - margin.right]);
        timeline.translateX(-xZoomScale(xDaysRect));
      } else {
        timeline.translateX(0);
      }
      $('.'+divId.substr(1)+'-qtip').qtip("hide");
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

    if (timeline.computeZoomLevel(minDays, maxDays, width * timeline.zoomFactor(), timeline.fractionTimelineShown()) !== "days") {
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
    if (d3.selectAll("#timelineZoomOut")[0].length > 1) {
      return;
    }
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