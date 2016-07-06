/**
 * Displays the x-coordinate i.e the label and y-coordiante i.e the day
 * when clicked on a timeline element in advanced view.
 */
function initHelperLines(enableHelperLines, zoomFactor, advancedView, divId, formatTime, daysToTimeObject) {
  //enable helper lines only if no zoom and in advanced view
  d3.selectAll("[id^='timelineItem']").on("click", function(x) {
    if (enableHelperLines && zoomFactor === 1 && advancedView) {
      var helperLineGroup = d3.select(divId + " svg").append("g").attr("class", "helper-line-group");
      var elementXCoordinate = parseInt(this.getAttribute("x"));
      var elementYCoordinate = parseInt(this.getAttribute("y"));
      var elementWidth = parseInt(this.getAttribute("width"));
      var elementHeight = parseInt(this.getAttribute("height"));

      //horizontal line
      helperLineGroup.append("line")
        .attr("x1", elementXCoordinate - (x.display === "circle" ? elementWidth : 0))
        .attr("y1", elementYCoordinate +  elementHeight / 2)
        .attr("x2", 120)
        .attr("y2", elementYCoordinate + elementHeight / 2)
        .attr("stroke-width", 1)
        .attr("stroke", "#aaa")
        .attr("class", "helper-line x");
        
      //vertical line
      helperLineGroup.append("line")
        .attr("x1", elementXCoordinate)
        .attr("y1", elementYCoordinate) 
        .attr("x2", elementXCoordinate)
        .attr("y2", 40)
        .attr("stroke-width", 1)
        .attr("stroke", "#aaa")
        .attr("class", "helper-line y");

      //background rectangle for label
      helperLineGroup.append("rect")
        .attr("width", 120)
        .attr("height", 14)
        .attr("x", 0)
        .attr("y", elementYCoordinate - 7)
        .attr("stroke-width", 2)
        .attr("stroke", "rgb(57, 106, 177)")
        .style("fill", "none");

      //triangle pointer for days
      helperLineGroup.append("path")         
        .style("stroke", "rgb(146, 36, 40)")  
        .style("fill", "none")     
        .attr("d", "M " + (elementXCoordinate - 5) + 
              ", 30, L " + elementXCoordinate + 
              ", 20, L " + (elementXCoordinate + 5) + ", 30 Z");

      helperLineGroup.append("text")
        .attr("x", this.getAttribute("x"))
        .attr("y", 40)
        .text(formatTime(daysToTimeObject(x.starting_time), "days"))
        .style("text-anchor", "middle")
        .style("font-size", "10px");
      
      $(this).qtip("hide");  //hide qtip when helper line visible
      //remove the helper lines after 1s 
      setTimeout(function() {
        helperLineGroup.remove();
      }, 1000);
    }
  });  
}