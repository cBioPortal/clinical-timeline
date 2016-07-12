var trimClinicalTimeline = function (maxDays, minDays, getZoomLevel, width, getTickValues, margin, formatTime, daysToTimeObject, divId) {
  //cuts the timeline to areas of interest

  $(divId+" > svg > g > g.axis").css("visibility", "hidden");
  
  var tolerance = (maxDays - minDays) * 0.2; //cut the timeline after how much of inactivity
  var timelineElements = [];
  var breakTimelineForKink = [];
  var tickCoordinatesKink = [];
  var svg = d3.select(".timeline");

  var zoomLevel = getZoomLevel(minDays, maxDays, width);
  var tickValues = getTickValues(minDays, maxDays, zoomLevel);

  //drawing the kink svg
  var kinkLineData = [{ "x": 75,  "y": 0  }, { "x": 80,  "y": 5 },
                      { "x": 85,  "y": -5 }, { "x": 90,  "y": 5 },
                      { "x": 95,  "y": -5 }, { "x": 100, "y": 5 },
                      { "x": 105, "y": -5 }, { "x": 110, "y": 0 }];
  
  var kinkLine = d3.svg.line()
    .x(function(d) { return d.x; })
    .y(function(d) { return d.y; })
    .interpolate("linear");

  var tickValuesInt = tickValues.map(function(x) {
    return Math.round(x);
  });

  var ticksToShow = [tickValuesInt[0], tickValuesInt[tickValuesInt.length - 1]];

  d3.selectAll(".timeline g rect, .timeline g circle").each(function(d, i) {
   for (var i = parseInt(d.starting_time); i <= parseInt(d.ending_time); i += clinicalTimelineUtil.getDifferenceTicksDays(zoomLevel)) {
      if (timelineElements.indexOf(i) === -1) {
        timelineElements.push(parseInt(i));
      }
    }
  });

  timelineElements.sort(function(a, b) { return a - b; });

  timelineElements.forEach(function(value, index) {
    if (value > tickValuesInt[0] && value < tickValuesInt[tickValuesInt.length - 1]) {
      for (var i = 0; i < tickValuesInt.length - 1; i++) {
        //TODO : Optimise with binary search
        if (value >= tickValuesInt[i] && value <= tickValuesInt[i+1]) {
          break;
        }
      }
      if (i !== tickValuesInt.length - 1) {
        if (ticksToShow.indexOf(tickValuesInt[i]) === -1) {
          ticksToShow.push(tickValuesInt[i]);
        }
        if (ticksToShow.indexOf(tickValuesInt[i + 1]) === -1) {
          ticksToShow.push(tickValuesInt[i + 1]);
        }
      }
    }
  });

  ticksToShow.sort(function(a, b) { return a - b; });

  var prevPush = 0;
  ticksToShow.forEach(function(item, index) {
    //calculate the position to place the kinks
    if (index < ticksToShow.length -1) {
      var first = ticksToShow[index];
      var second = ticksToShow[index + 1];
      var toPush = index + 1;
      var noOfTicksDeletedAfterCurrentIndex = parseInt((ticksToShow[index+1] - ticksToShow[index]) / clinicalTimelineUtil.getDifferenceTicksDays(zoomLevel)) - 1;

      if (noOfTicksDeletedAfterCurrentIndex === 1) {
        //avioid trimming off only one tick
        ticksToShow.push(Math.round((first + second) / 2))
      } else if (second - first > tolerance) {
        if (toPush - prevPush > 1 || (prevPush === 0 && (second - first) > clinicalTimelineUtil.getDifferenceTicksDays(zoomLevel))) {
          breakTimelineForKink.push(toPush);
        }
        prevPush = toPush;
      } 
    }
  });

  ticksToShow.sort(function(a, b) { return a - b; });

  var xScale = d3.time.scale()
    .domain([margin.left,  width - margin.right])
    .range([margin.left, width - margin.right]);

  var shiftAtBreak = 0; //make space for adding the kink

  for (var i = 0; i < ticksToShow.length; i++) {
    if (breakTimelineForKink.indexOf(i) > -1) {
      shiftAtBreak += 30;
    }

    var breakAdjust = breakTimelineForKink.length * 30;

    //calculate the position of the tick to be shown after trimming
    tickCoordinatesKink.push(margin.left + shiftAtBreak + (i * ((width - margin.right - margin.left - breakAdjust) / (ticksToShow.length - 1 ))));
  }

  var xAxis = d3.svg.axis()
    .scale(xScale)
    .orient("top")
    .tickValues(tickCoordinatesKink)
    .tickFormat(function(d, i) { return formatTime(daysToTimeObject(ticksToShow[i]), zoomLevel) });

  // Add the trimmmed axis
  svg.append("g") 
    .attr("class", "x axis")
    .attr("transform", "translate(0,20)")
    .call(xAxis);

  var kink = svg.append("g")
    .attr("class", "kink");

  for (var i = 0; i < ticksToShow.length; i++) {
    //add kinks at the places where timeline is cut
    if (breakTimelineForKink.indexOf(i) > -1) {
      var kinkPosition = (tickCoordinatesKink[i-1] + tickCoordinatesKink[i])/2;
      kink.append("rect")
        .attr("height", 10)
        .attr("width", 35)
        .attr("class","kink-bg")
        .attr("x", kinkPosition - 17.5)
        .attr("y", 15)
        .attr("fill", "white");

      kink.append("path")
        .attr("d", kinkLine(kinkLineData))
        .attr("stroke", "black")
        .attr("stroke-width", 1)
        .attr("fill", "none")
        .attr("class","kink-line")
        .attr("transform", "translate("+ (kinkPosition - 92.5) +",20)");
    }
  }

  /**
   * returns the lower index of the indices between which the element, ele lies in an array
   * based on binary search
   */
  function getLowerBoundIndex(ele) {
    var low = 0;
    var high = ticksToShow.length - 1;

    while(low < high){
      var mid = Math.round((low + high)/2);
      if (ticksToShow[mid] > ele) {
        high = mid - 1;
      } else {
        low = mid;
      }
    }
    return low;
  }

  /**
   * returns updated x positions for the data elements according to th trimmed timeline 
   */
  function getXPosAdjustedForKink(x, pos) {   
    var first = getLowerBoundIndex(pos);
    var second = first + 1;

    if (second > ticksToShow.length - 1) {
      return tickCoordinatesKink[first];
    }
    return tickCoordinatesKink[first] + (pos - ticksToShow[first]) * (tickCoordinatesKink[second] - tickCoordinatesKink[first]) / (ticksToShow[second] - ticksToShow[first]);
  }

  d3.selectAll("[id^=timelineItem]").attr("cx", function(x) {
    //update x position for circular elements in the trimmed timeline
    return getXPosAdjustedForKink(x, x.starting_time);
  });

  d3.selectAll("[id^=timelineItem]").attr("x", function(x) {
    //update x position for rectangular elements in the trimmed timeline
    return getXPosAdjustedForKink(x, x.starting_time);
  });

  var widthMultiplier = (tickCoordinatesKink[1] - tickCoordinatesKink[0])/ (d3.transform(d3.select($(".axis .tick")[1]).attr("transform")).translate[0] - d3.transform(d3.select($(".axis .tick")[0]).attr("transform")).translate[0]);
  
  d3.selectAll("[id^=timelineItem]").attr("width", function (x) {
    //update width for rectangular elements in the trimmed timeline
    return d3.select(this).attr("width") * widthMultiplier;  
  });

  d3.selectAll("[id^=timelineItem]").attr("r", function (x) {
    //TODO : update radius for circular elements in the trimmed timeline keeping height same
    return d3.select(this).attr("r");  
  });
};

/* start-test-code-not-included-in-build */
module.exports = trimClinicalTimeline;
/* end-test-code-not-included-in-build */