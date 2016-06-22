window.clinicalTimeline.trimTimeline = function (maxDays, minDays, getZoomLevel, width, getTickValues, margin, formatTime, daysToTimeObject) {
  //cuts the timeline to areas of interest

  $(".x-axis").css("visibility", "hidden");
  
  var tolerance = (maxDays - minDays) * 0.3; //cut the timeline after how much of inactivity
  var timelineElements = []
  var breakTimelineForKink = []
  var toDelete = []
  var tickCoordiantesKink = []
  var extraKink;
  var svg = d3.select(".timeline")

  var zoomLevel = getZoomLevel(minDays, maxDays, width);
  var tickValues = getTickValues(minDays, maxDays, zoomLevel);

  //drawing the kink svg
  var kinkLineData = [ { "x": 70,  "y": 0 }, { "x": 75, "y": 5 },
                       { "x": 80,  "y": -5}, { "x": 85, "y": 5},
                       { "x": 90,  "y": -5}, { "x": 95, "y": 5},
                       { "x": 100,  "y": -5},  { "x": 105,  "y": 0}];
  
  var kinkLine = d3.svg.line()
                  .x(function(d) { return d.x; })
                  .y(function(d) { return d.y; })
                  .interpolate("linear");

  function getExraKink (zoomLevel) {
    switch(zoomLevel) {
          case "days": return 1;
          case "3days": return 3;
          case "10days": return 10;
          case "months": return 30;
          case "years": return 365;
          default:
            console.log("Undefined zoomLevel");
        }
  }

  d3.selectAll(".timeline g rect, .timeline g circle").each(function(d, i){
    if (d.starting_time) {
      timelineElements.push(parseInt(d.starting_time))
    }
  });

  timelineElements.sort(function(a, b) { return a - b; })

  timelineElements.forEach(function (item, index) {
    var first = timelineElements[index];
    var second = index != (timelineElements.length - 1) ? timelineElements[index + 1] : maxDays;;

    if (second - first > tolerance) {
      //delete ticks where there is no activity.
      for (var i = first + getExraKink(zoomLevel) ; i < second - getExraKink(zoomLevel); i++) {
        toDelete.push(i)
      }
    } 
  });

  //calculate the ticks to be shown after trimmming 
  var tickValuesInt = tickValues.map( function (x) {
      return Math.round(x);
  });
  var ticksToShowKink = tickValuesInt.filter(function(x) { return toDelete.indexOf(x) < 0 })

  if (tickValues.length > 5) {
      ticksToShowKink.forEach(function (item, index) {
      //calculate the position to place the kinks

      if (index < ticksToShowKink.length -1) {
        var first = ticksToShowKink[index];
        var second = ticksToShowKink[index + 1];

        if (second - first > tolerance) {
          breakTimelineForKink.push(index + 1)
        } 
      }
    });
  }

  

  var xScale = d3.time.scale()
      .domain([margin.left,  width - margin.right])
      .range([margin.left, width - margin.right]);

  var shiftAtBreak = 0; //make space for adding the kink

  for (var i = 0; i < ticksToShowKink.length; i++) {
    if (breakTimelineForKink.indexOf(i) > -1) {
      shiftAtBreak += 30;
    }
    //calculate the position of the tick to be shown after trimming
    tickCoordiantesKink.push(margin.left + shiftAtBreak + (i * ((width - 3 * margin.right - margin.left) / (ticksToShowKink.length - 1 ))))
  }

  var xAxis = d3.svg.axis()
    .scale(xScale)
    .orient("top")
    .tickValues(tickCoordiantesKink)
    .tickFormat(function(d, i) { return formatTime(daysToTimeObject(ticksToShowKink[i]), zoomLevel) });

  // Add the trimmmed axis
  svg.append("g") 
      .attr("class", "x axis")
      .attr("transform", "translate(0,20)")
      .call(xAxis);

  var kink = svg.append("g")
        .attr("class", "kink")

  for (var i = 0; i < ticksToShowKink.length; i++) {
    //add kinks at the places where timeline is cut
    if (breakTimelineForKink.indexOf(i) > -1) {
      shiftAtBreak += 30;
      var kinkPosition= (shiftAtBreak + (i * ((width - margin.right - margin.left) / (ticksToShowKink.length)))); 

      kink.append("rect")
        .attr("height", 10)
        .attr("width", 35)
        .attr("class","kink-bg")
        .attr("x", 70 + kinkPosition)
        .attr("y", 15)
        .attr("fill", "white");

      kink.append("path")
        .attr("d", kinkLine(kinkLineData))
        .attr("stroke", "black")
        .attr("stroke-width", 1)
        .attr("fill", "none")
        .attr("class","kink-line")
        .attr("transform", "translate("+ kinkPosition +",20)");
    }
  }

  function getLowerBoundIndex(ele) {
    //returns the lower index of the indices between which the element, ele lies in an array
    //based on binary search

    var low = 0;
    var high = ticksToShowKink.length - 1;

    while(low < high){
      var mid = Math.round((low + high)/2);
      if (ticksToShowKink[mid] > ele) {
        high = mid - 1;
      } else {
        low = mid;
      }
    }

    return low;
  }

  function getXPosAdjustedForKink(x) {
    //returns updated x positions for the data elements according to th trimmed timeline    
    var first = getLowerBoundIndex(x.starting_time);
    var second = first + 1;

    if (second > ticksToShowKink.length - 1) {
      return tickCoordiantesKink[first];
    }

    return tickCoordiantesKink[first] + (x.starting_time - ticksToShowKink[first]) * (tickCoordiantesKink[second] - tickCoordiantesKink[first]) / (ticksToShowKink[second] - ticksToShowKink[first]);
  }

  d3.selectAll(".timelineDataPoint").attr("cx", function(x) {
    //update x position for circle elements in the trimmed timeline
    return getXPosAdjustedForKink(x);
  });

  var widthMultiplier = ((maxDays - minDays)/((maxDays - minDays) - toDelete.length));

  d3.selectAll(".timelineDataPoint").attr("x", function(x) {
    //update x position for rectangular elements in the trimmed timeline
    return getXPosAdjustedForKink(x);
  })
  .attr("width", function (x) {
    //update width for rectangular elements in the trimmed timeline
    return d3.select(this).attr("width") * widthMultiplier;
  });

}