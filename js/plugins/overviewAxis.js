/*
 * Handles the drawing and panning of the overviewAxis
 * drawn below the actual timeline
 */  
var clinicalTimelineOverviewAxis = function (overviewSVG, getTickValues, minDays, maxDays, overviewAxisWidth, formatTime, daysToTimeObject) {
  var overviewAxisTicks = getTickValues(minDays, maxDays, "months");
  var minDayTick = overviewAxisTicks[0];
  var maxDayTick =  overviewAxisTicks[overviewAxisTicks.length-1];

  var overviewBorderData = [{"height" : 2, "width" : overviewAxisWidth, "x" : 0, "y" : 24, "fill" : "#ccc"},
    {"height" : 2, "width" : overviewAxisWidth, "x" : 0, "y" : 44, "fill" : "#ccc"},
		{"height" : 18, "width" : 2, "x" : 0, "y" : 26, "fill" : "#ccc"},
		{"height" : 18, "width" : 2, "x" : overviewAxisWidth - 2, "y" : 26, "fill" : "#ccc"}];	 

  //scale for drawing the the overviewAxis and ticks in the specified width
  var xScaleOverview = d3.time.scale()
    .domain([minDayTick, maxDayTick])
    .range([0 , overviewAxisWidth]);

  //Draws the ticks at bottom of time-stamp labels in the overviewAxis
  var overviewAxis = d3.svg.axis().scale(xScaleOverview).orient("bottom")
    .tickFormat(function(d) { 
      return formatTime(daysToTimeObject(d.valueOf()), "months");
    })
    .ticks(overviewAxisTicks.length)
    .tickSize(3)
    .tickPadding(4);

  //Draws the ticks at top of time-stamp labels in the overviewAxis
  var overviewAxisMirror = d3.svg.axis().scale(xScaleOverview).orient("top")
    .tickFormat(function(d) { 
      return formatTime(daysToTimeObject(d.valueOf()), "months");
    })
    .ticks(overviewAxisTicks.length)
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

  overviewSVG.selectAll("rect.overview-border").data(overviewBorderData).enter().append("rect")
    .attr("height", function(d) { return d.height; })
    .attr("width", function(d) { return d.width; })
    .attr("x", function(d) { return d.x; })
    .attr("y", function(d) { return d.y; })
    .attr("fill", function(d) { return d.fill; })
    .attr("class", "overview-border");
}

/* start-test-code-not-included-in-build */
module.exports = clinicalTimelineOverviewAxis;
/* end-test-code-not-included-in-build */