/**
 * Plugin which dandles the drawing and panning of the overviewAxis
 * drawn below the actual timeline
 * @type {clinicalTimelinePlugin}
 */
function clinicalTimelineOverviewAxis(name, spec){
  clinicalTimelinePlugin.call(this, name, spec);
  this.id = "overviewAxis";
}

/**
 * runs the clinicalTimelineOverviewAxis plugin
 * @param  {function} timeline    clinicalTimeline object
 * @param  {Object}   [spec=null] specification specific to the plugin
 */
clinicalTimelineOverviewAxis.prototype.run = function(timeline, spec) {
  var readOnlyVars = timeline.getReadOnlyVars(),
    margin = readOnlyVars.margin,
    overviewAxisWidth = timeline.overviewAxisWidth(),
    chart = readOnlyVars.chart,
    zoomFactor = timeline.zoomFactor(),
    divId = timeline.divId(),
    overviewSVG = d3.select(divId+" .overview"),
    originalZoomLevel = timeline.computeZoomLevel(readOnlyVars.minDays, readOnlyVars.maxDays, timeline.width()),
    overviewAxisTicks = timeline.getTickValues(readOnlyVars.minDays, readOnlyVars.maxDays, originalZoomLevel),
    minDayTick = overviewAxisTicks[0],
    maxDayTick =  overviewAxisTicks[overviewAxisTicks.length-1],
    overViewScale = d3.time.scale()
      .domain([clinicalTimelineUtil.roundDown(readOnlyVars.minDays, clinicalTimelineUtil.getDifferenceTicksDays(originalZoomLevel)), clinicalTimelineUtil.roundUp(readOnlyVars.maxDays, clinicalTimelineUtil.getDifferenceTicksDays(originalZoomLevel))])
      .range([0 + margin.overviewAxis.left, overviewAxisWidth - margin.overviewAxis.right]),
    zoomLevel = timeline.computeZoomLevel(readOnlyVars.minDays, readOnlyVars.maxDays, timeline.width() * zoomFactor),
    startAllowedOverview = overViewScale(clinicalTimelineUtil.roundDown(readOnlyVars.minDays, clinicalTimelineUtil.getDifferenceTicksDays(zoomLevel))) - overViewScale(clinicalTimelineUtil.roundDown(readOnlyVars.minDays, clinicalTimelineUtil.getDifferenceTicksDays(originalZoomLevel))),
    endAllowedOverview = overViewScale(clinicalTimelineUtil.roundUp(readOnlyVars.maxDays, clinicalTimelineUtil.getDifferenceTicksDays(originalZoomLevel))) - overViewScale(clinicalTimelineUtil.roundUp(readOnlyVars.maxDays, clinicalTimelineUtil.getDifferenceTicksDays(zoomLevel)));

  var overviewBorderData = [{"height" : 2, "width" : overviewAxisWidth, "x" : 0, "y" : 24, "fill" : "#ccc"},
    {"height" : 2, "width" : overviewAxisWidth, "x" : 0, "y" : 44, "fill" : "#ccc"},
    {"height" : 18, "width" : 2, "x" : 0, "y" : 26, "fill" : "#ccc"},
    {"height" : 18, "width" : 2, "x" : overviewAxisWidth - 2, "y" : 26, "fill" : "#ccc"}];   
  
  /**
   * scale for drawing the the overviewAxis and ticks in the specified width
   */
  var xScaleOverview = d3.time.scale()
    .domain([minDayTick, maxDayTick])
    .range([0 + margin.overviewAxis.left , overviewAxisWidth - margin.overviewAxis.right]);

  //Draws the ticks at bottom of time-stamp labels in the overviewAxis
  var overviewAxis = d3.svg.axis().scale(xScaleOverview).orient("bottom")
    .tickFormat(function(d) { 
      return timeline.formatTime(timeline.daysToTimeObject(d.valueOf()), originalZoomLevel);
    })
    .ticks(overviewAxisTicks.length)
    .tickValues(overviewAxisTicks)
    .tickSize(3)
    .tickPadding(4);

  //Draws the ticks at top of time-stamp labels in the overviewAxis
  var overviewAxisMirror = d3.svg.axis().scale(xScaleOverview).orient("top")
    .tickFormat(function(d) { 
      return timeline.formatTime(timeline.daysToTimeObject(d.valueOf()), originalZoomLevel);
    })
    .ticks(overviewAxisTicks.length)
    .tickValues(overviewAxisTicks)
    .tickSize(3)
    .tickPadding(0);

  overviewSVG.append("g")
    .attr("class", "x axis overview-axis")
    .attr("transform", "translate(0,25)")
    .call(overviewAxis);

  overviewSVG.append("g")
    .attr("class", "x axis overview-axis overview-axis-mirror")
    .attr("transform", "translate(0,44)")
    .call(overviewAxisMirror);

  overviewSVG.selectAll(divId+" rect.overview-border").data(overviewBorderData).enter().append("rect")
    .attr("height", function(d) { return d.height; })
    .attr("width", function(d) { return d.width; })
    .attr("x", function(d) { return d.x; })
    .attr("y", function(d) { return d.y; })
    .attr("fill", function(d) { return d.fill; })
    .attr("class", "overview-border");

  var zoomedWidth = chart.width();
  var rectangleOverviewWidth = (overviewAxisWidth - margin.overviewAxis.left - margin.overviewAxis.right) / zoomFactor;

  /**
   * scale to map the amount dragged on the zoomedWidth of original timeline to the overviewAxis width
   * helps position the overview-rectangle correctly if original timeline dragged
   */
  var xScaleOverviewZoomed = d3.time.scale()
    .domain([0, -zoomedWidth])
    .range([0 + startAllowedOverview, overviewAxisWidth - endAllowedOverview]);
  /**
   * scale to map the amount dragged on the overview-rectangle to the orignal timeline's zoomedWidth
   * helps position the original-timeline correctly if the overview rectagle is dragged
   */
  var xScaleRectangle = d3.time.scale()
    .domain([0 + startAllowedOverview, overviewAxisWidth - endAllowedOverview])
    .range([0 , -zoomedWidth]);

  var dragChart = d3.behavior.drag()
    .on("drag", function(d,i) {
      //handle overview rectangle if the original-timeline is dragged
      if(chart.scrolledX()){
        var zoomedBeginTick = xScaleOverviewZoomed(chart.scrolledX()); 
        d3.select(divId+" .overview-rectangle").attr("x", zoomedBeginTick);
        timeline.overviewX(zoomedBeginTick);
      }
    });

  var dragRectangle = d3.behavior.drag()
    .on("drag", function(d,i) {
      //handle the timeline if the overview rectangle is dragged
      var x  = parseInt(d3.select(divId+" .overview-rectangle").attr("x"))+d3.event.dx;
      if(x > startAllowedOverview && x < overviewAxisWidth - rectangleOverviewWidth - endAllowedOverview && zoomFactor > 1){
        d3.select(divId+" svg g").attr("transform","translate("+xScaleRectangle(x)+",0)");
        d3.select(divId+" .overview-rectangle").attr("x", x); 
        timeline.overviewX(x);
      }
    });

  var rectangleOverview = overviewSVG.append("rect")
      .attr("height", 16)
      .attr("width", rectangleOverviewWidth)
      .attr("x", timeline.overviewX())
      .attr("y", 27)
      .attr("fill", "rgba(25,116,255, 0.4)")
      .attr("class", "overview-rectangle")
      .style("cursor", "move")
      .call(dragRectangle);     
  d3.select(divId+" svg").call(dragChart);
}

Object.setPrototypeOf(clinicalTimelineOverviewAxis.prototype, clinicalTimelinePlugin.prototype);

/* start-test-code-not-included-in-build */
module.exports = clinicalTimelineOverviewAxis;
/* end-test-code-not-included-in-build */