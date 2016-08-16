/**
 * Plugin to handle the drawing of a vertical line 
 * on hovering over the timeline
 * @type {clinicalTimelinePlugin}
 */
function clinicalTimelineVerticalLine(name, spec){
  clinicalTimelinePlugin.call(this, name, spec);
  this.id = "verticalLine";
}

/**
 * runs the clinicalTimelineVerticalLine plugin
 * @param  {function} timeline    clinicalTimeline object
 * @param  {Object}   [spec=null] specification specific to the plugin
 */
clinicalTimelineVerticalLine.prototype.run = function(timeline, spec) {
  var divId = timeline.divId(),
    hoverLineGroup = d3.select(divId + " svg").append("g")
      .attr("class", "hover-line"),
    hoverLine = hoverLineGroup
      .append("line")
      .attr("x1", 0)
      .attr("x2", 0) 
      .attr("y1", 20)
      .attr("y2", 268)
      .style("stroke", "#ccc"),
    svgHeight = d3.select(divId + " svg")[0][0].getBoundingClientRect().height,
    /**
     * text to be displayed along with hoverLine
     */
    hoverText = hoverLineGroup.append("text")
      .attr("class", "hover-text")
      .attr("y", svgHeight - 10) //place text 10 pixels above the bottom of the svg
      .attr("font-size", 12)
      .attr("fill", "#888"),
    /**
     * variables to confine the hoverable area
     * @type {number}
     */
    hoverBegin = spec.hoverBegin, 
    hoverEnd = spec.hoverEnd,
    /**
     * scale to map the coordinates hovered upon (according to the svg coordinates) to the clinical-timeline days
     */
    hoverScale = d3.time.scale()
      .domain([hoverBegin, hoverEnd])
      .range([timeline.getReadOnlyVars().beginning , timeline.getReadOnlyVars().ending]),
    /**
     * Boolean to toggle the visibility of tooltips along with the vertical line
     * @type {boolean}
     */
    tooltipOnVerticalLine = true;


  hoverLineGroup.style("opacity", 0);

  d3.select(divId+" svg").on("mousemove", function() {
    var hoverX = d3.mouse(this)[0];
    if (hoverX > hoverBegin && hoverX < hoverEnd) {
      hoverText.text(parseInt(hoverScale(hoverX)) + "d");
      hoverText.attr("x", hoverX + 4);
      hoverLine.attr("x1", hoverX).attr("x2", hoverX)
      hoverLineGroup.style("opacity", 1);
      
      if(tooltipOnVerticalLine){         
        $(divId+" .timeline g rect, "+divId+" .timeline g circle").each(function(index) {
          var element = $(divId+" .timeline g rect, "+divId+" .timeline g circle")[index];
          var elementX = parseInt(element.getBBox().x);
          var elementWidth = parseInt(element.getBBox().width);
          var tolerance = 2;
          if(hoverX > (elementX + elementWidth/2 - tolerance) && hoverX < (elementX + elementWidth/2 + tolerance)){
            $(element).qtip("disable", false);
            $(element).qtip("show");
          } else {
            $(element).qtip("hide");
            $(element).qtip("disable", true);
          }
        });
      }
    }  
  }).on("mouseout", function() {
      hoverLineGroup.style("opacity", 0);
  });
  var tooltipControllerId = spec.tooltipControllerId;
  $(tooltipControllerId).css("visibility", "visible");
  $(tooltipControllerId+' a').on("click", function () {
    if (tooltipOnVerticalLine) {
      $(tooltipControllerId+' a').text("Show tooltips on vertical-line");
      tooltipOnVerticalLine = false;
    } else {
      $(tooltipControllerId+' a').text("Hide tooltips on vertical-line");
      tooltipOnVerticalLine = true;
    }
  });
}

/**
 * cleans up the HTML of the verticalLine
 * @param  {function} timeline    clinicalTimeline object
 * @param  {Object}   [spec=null] specification specific to the plugin
 */
clinicalTimelineVerticalLine.prototype.remove = function(timeline, spec) {
  $(spec.tooltipControllerId).css("visibility", "hidden");
}

Object.setPrototypeOf(clinicalTimelineVerticalLine.prototype, clinicalTimelinePlugin.prototype);

/* start-test-code-not-included-in-build */
module.exports = clinicalTimelineVerticalLine;
/* end-test-code-not-included-in-build */