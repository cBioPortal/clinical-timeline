// vim: ts=2 sw=2
window.clinicalTimeline = (function(){
  var allData,
      colorCycle = d3.scale.category20(),
      margin = {left: 200, right:30, top: 15, bottom:0},
      itemHeight = 6,
      itemMargin = 8,
      divId = null,
      width = null,
      zoomFactor = 1,
      postTimelineHooks = [],
      enableTrackTooltips = true,
      enableZoom = true,
      stackSlack = null,
      translateX = 0,
      // first tick
      beginning = 0,
      // last tick
      ending = 0,
      // first day
      minDays = 0,
      // last day
      maxDays = 0,
      overviewAxisWidth = 0,
      overviewX = 0,
      advancedView=false,
      chart=null,
      enableVerticalLine = false,
      tooltipOnVerticalLine = true,
      enableTrimmedTimeline=false;

  function getTrack(data, track) {
    return data.filter(function(x) {
      return $.trim(x.label) === $.trim(track);
    })[0];
  }

  function timeline() {
    visibleData = allData.filter(function(x) {
        return x.visible;
    });

    maxDays = Math.max.apply(Math, [getMaxEndingTime(allData), 1]);
    
    if (stackSlack === null) {
      if (maxDays > 300) {
        stackSlack = 5;
      }
      if (maxDays > 600) {
        stackSlack = 10;
      }
      if (maxDays > 900) {
        stackSlack = 20;
      }
    }
    
    minDays = Math.min.apply(Math, [getMinStartingTime(allData), 0]);
    var zoomLevel = getZoomLevel(minDays, maxDays, width * zoomFactor);
    var tickValues = getTickValues(minDays, maxDays, zoomLevel);
    
    beginning = tickValues[0];
    ending = tickValues[tickValues.length-1];
    overviewAxisWidth = width - 200;

    chart = d3.timeline()
      .stack()
      .margin(margin)
      .tickFormat({
        format: function(d) { return formatTime(daysToTimeObject(d.valueOf()), zoomLevel); },
        tickValues: getTickValues(minDays, maxDays, zoomLevel),
        tickSize: 6
      })
      .translate(translateX)
      .width(width * zoomFactor)
      // TODO: hack to handle problem when start is day 0 in d3-timeline
      .beginning(String(beginning))
      .ending(ending)
      .stackSlack(stackSlack)
      .orient('top')
      .itemHeight(itemHeight)
      .itemMargin(itemMargin)
      .colors(colorCycle);

    handleOverviewAxis();

    $(divId).html("");
    var svg = d3.select(divId).append("svg").attr("width", width).attr("class", "timeline");
    svg.append("rect")
      .attr("width", "100%")
      .attr("height", "100%")
      .attr("fill", "white");

    // Add dropshadow filter
    svg.append('defs').html('' +
      '<filter id="dropshadow" x="0" y="0" width="200%" height="200%">' +
      '  <feOffset result="offOut" in="SourceAlpha" dx="1.5" dy="1.5" />' +
      '  <feGaussianBlur result="blurOut" in="offOut" stdDeviation="1" />' +
      '  <feBlend in="SourceGraphic" in2="blurOut" mode="normal" />' +
      '</filter>');

    svg.datum(mergeAllTooltipTablesAtEqualTimepoint(visibleData)).call(chart);

    $("[id^='timelineItem']").each(function() {
      timeline.addDataPointTooltip($(this));
    });
    $("[id^='timelineItem']").each(function() {
      $(this).on("mouseover", function() {
          $(this).attr("r", parseInt($(this).attr("r")) + 2);
          $(this).attr("height", parseInt($(this).attr("height")) + 2);
      });
      $(this).on("mouseout", function() {
          $(this).attr("r",  parseInt($(this).attr("r")) - 2);
          $(this).attr("height", parseInt($(this).attr("height")) - 2);
      });
    });
    if (enableTrackTooltips) {
      $(".timeline-label").each(function(i) {
        if ($(this).prop("__data__")[i].split && !$(this).prop("__data__")[i].parent_track) {
          addSplittedTrackTooltip($(this), allData);
        } else {
          addTrackTooltip($(this), allData);
        }
      });
      // Add track button
      svg.attr("height", parseInt(svg.attr("height")) + 15);
      svg.insert("text")
        .attr("transform", "translate(0,"+svg.attr("height")+")")
        .attr("class", "timeline-label")
        .text("Add track")
        .attr("id", "addtrack");
      addNewTrackTooltip($("#addtrack"));
    }
    svg.insert("text")
      .attr("transform", "translate(0, 15)")
      .attr("class", "timeline-label")
      .text("Time since diagnosis");
    d3.select(".axis").attr("transform", "translate(0,20)");

    // preserve whitespace for easy indentation of labels
    $(".timeline-label").each(function(i, x) {
      x.setAttributeNS("http://www.w3.org/XML/1998/namespace", "xml:space", "preserve");
    });

    if (enableZoom) {
      addZoomOptions();
    }

    // Add white background for labels to prevent timepoint overlap
    var g = d3.select(divId + " svg g");
    var gBoundingBox = g[0][0].getBoundingClientRect();
    d3.select(divId + " svg")
      .insert("rect", ".timeline-label")
      .attr("width", 130)
      .attr("height", 20)
      .attr("x", 0)
      .attr("y", 0)
      .style("fill", "rgb(255, 255, 255)");
    d3.select(divId + " svg")
      .insert("rect", ".timeline-label")
      .attr("width", 130)
      .attr("height", gBoundingBox.height - 15)
      .attr("x", 0)
      .attr("y", 20)
      .style("fill", "rgb(255, 255, 255)");

    // change mouse to pointer for all timeline items
    $("[id^='timelineItem']").css("cursor", "pointer");

    postTimelineHooks.forEach(function(hook) {
      hook.call();
    });

    handleVerticalLine(enableVerticalLine);
    handleOverviewAxis();

  }

  /*
   * Add rectangular zoom selection. Use brush to zoom. After zooming in, scroll mouse or drag to pan.
   */
  function addZoomOptions() {
    $(".dropdown-toggle").prop("disabled", true);
    var svg = d3.select(divId + " svg");
    var g = d3.select(divId + " svg g");
    var gBoundingBox = g[0][0].getBoundingClientRect();

    if (zoomFactor === 1) {
      // Add rectangular zoom selection
      // zoom in after brush ends
      var brushend = function() {

        //handle positioning of the overview rectangle post zoom in.
        var overViewScale = d3.time.scale()
          .domain([beginning, ending])
          .range([0 , overviewAxisWidth]);

        overviewX = overViewScale(brush.extent()[0].valueOf());

        var xDaysRect = brush.extent()[0].valueOf();
        zoomFactor = (parseInt(width) - parseInt(margin.left) - parseInt(margin.right)) / (parseInt(d3.select(".extent").attr("width")));
        if (zoomFactor > 0) {
          zoomFactor = Math.min(zoomFactor, getZoomFactor("days", minDays, maxDays, width));
        } else {
          zoomFactor = getZoomFactor("days", minDays, maxDays, width);
        }
        // TODO: Translation post zooming is not entirely correct

        if (xDaysRect > minDays) {
          var zoomLevel = getZoomLevel(minDays, maxDays, width * zoomFactor);
          var tickValues = getTickValues(minDays, maxDays, zoomLevel);
          var xZoomScale = d3.time.scale()
             .domain([tickValues[0], tickValues[tickValues.length-1]])
             .range([margin.left, width * zoomFactor - margin.right]);
          translateX = -xZoomScale(xDaysRect);
        } else {
          translateX = 0;
        }
        $('.'+divId.substr(1)+'-qtip').qtip("hide");
        d3.select(divId).style("visibility", "hidden");
        timeline();
        d3.select(divId).style("visibility", "visible");
        var zoomBtn = d3.select(divId + " svg")
          .insert("text")
          .attr("transform", "translate("+(parseInt(svg.attr("width"))-70)+", "+parseInt(svg.attr("height")-5)+")")
          .attr("class", "timeline-label")
          .text("Zoom out")
          .style("cursor", "zoom-out")
          .attr("id", "timelineZoomOut");
        zoomBtn.on("click", function() {
          zoomFactor = 1;
          beginning = 0;
          ending = 0;
          $('.'+divId.substr(1)+'-qtip').qtip("hide");
          d3.select(divId).style("visibility", "hidden");
          timeline();
          d3.select(divId).style("visibility", "visible");
          chart.scrolledX(null);
          overviewX = 0;
          d3.select(".overview-rectangle").attr("x", overviewX).attr("width", width);
          this.remove();
        });
      };

      if (getZoomLevel(minDays, maxDays, width * zoomFactor) !== "days") {
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
          .selectAll('.extent,.background,.resize rect')
            .attr("height", gBoundingBox.height)
            .attr("y", 20)
            .style("cursor", "zoom-in");
        zoomExplanation = d3.select(divId + " svg")
          .insert("text")
          .attr("transform", "translate("+(parseInt(svg.attr("width"))-120)+", "+parseInt(svg.attr("height")-5)+")")
          .attr("class", "timeline-label")
          .text("")
          .attr("id", "timelineZoomExplanation")
          .text("Click + drag to zoom")
          .style("visibility", "hidden");
        d3.select('.background').on("mouseover", function() {
            d3.select("#timelineZoomExplanation").style("visibility", "visible");
        });
        d3.select('.background').on("mouseout", function() {
            d3.select("#timelineZoomExplanation").style("visibility", "hidden");
        });
      }
    } else {
      // Add panning explanation and visual indicator
      zoomExplanation = d3.select(divId + " svg")
        .insert("text")
        .attr("transform", "translate("+(parseInt(svg.attr("width"))-180)+", "+parseInt(svg.attr("height")-5)+")")
        .attr("class", "timeline-label")
        .text("")
        .attr("id", "timelineZoomExplanation")
        .text("Scroll/drag to move")
        .style("visibility", "visible");
      d3.select(divId + " svg").style("cursor", "move");
    }
  }

  /**
   * Hanles the drawing and panning of the overviewAxis
   */
  function handleOverviewAxis() {
    var overviewAxisTicks = getTickValues(minDays, maxDays, "months");
    var minDayTick = overviewAxisTicks[0];
    var maxDayTick =  overviewAxisTicks[overviewAxisTicks.length-1];

    var overviewSVG = d3.select(divId).append("svg")
      .attr("height", 75)
      .attr("width", overviewAxisWidth)
      .attr("class", "overview");

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

    overviewSVG.append("rect")
      .attr("height", 3)
      .attr("width", overviewAxisWidth)
      .attr("x", 0)
      .attr("y", 22)
      .attr("fill", "#ccc");

    overviewSVG.append("rect")
      .attr("height", 3)
      .attr("width", overviewAxisWidth)
      .attr("x", 0)
      .attr("y", 44)
      .attr("fill", "#ccc");

    overviewSVG.append("rect")
      .attr("height", 18)
      .attr("width", 3)
      .attr("x", 0)
      .attr("y", 26)
      .attr("fill", "#ccc");

    overviewSVG.append("rect")
      .attr("height", 18)
      .attr("width", 3)
      .attr("x", overviewAxisWidth-3)
      .attr("y", 26)
      .attr("fill", "#ccc");
      
    if(advancedView){
      initAdvancedView(overviewSVG)
    } else {
      initSimpleView(overviewSVG);
    }
  }

  function initAdvancedView(overviewSVG) {
    var zoomedWidth = chart.width();
    var rectangleOverviewWidth = width/zoomFactor;

    //scale to map the amount dragged on the zoomedWidth of original timeline to the overviewAxis width
    //helps position the overview-rectangle correctly if original timeline dragged
    var xScaleOverviewZoomed = d3.time.scale()
      .domain([0, -zoomedWidth])
      .range([0 , overviewAxisWidth]);

    //scale to map the amount dragged on the overview-rectangle to the orignal timeline's zoomedWidth
    //helps position the original-timeline correctly if the overview rectagle is dragged
    var xScaleRectangle = d3.time.scale()
      .domain([0, overviewAxisWidth])
      .range([0 , -zoomedWidth]);


    var dragChart = d3.behavior.drag()
      .on("drag", function(d,i) {
        //handle overview rectangle if the original-timeline is dragged
        if(chart.scrolledX()){
          var zoomedBeginTick = xScaleOverviewZoomed(chart.scrolledX()); 
          d3.select(".overview-rectangle").attr("x", zoomedBeginTick);
          overviewX = zoomedBeginTick;
        }
      });

    var dragRectangle = d3.behavior.drag()
      .on("drag", function(d,i) {
        //handle the timeline if the overview rectangle is dragged
        var x  = parseInt(d3.select(".overview-rectangle").attr("x"))+d3.event.dx;
        if(x > 0 && x < overviewAxisWidth - rectangleOverviewWidth){
          d3.select(divId+" svg g").attr("transform","translate("+xScaleRectangle(x)+",0)");
          d3.select(".overview-rectangle").attr("x", x); 
          overviewX = x;
        }
      });

    var rectangle = overviewSVG.append("rect")
        .attr("height", 16)
        .attr("width", rectangleOverviewWidth)
        .attr("x", overviewX)
        .attr("y", 27)
        .attr("fill", "rgba(25,116,255, 0.4)")
        .attr("class", "overview-rectangle")
        .style("cursor", "move")
        .call(dragRectangle);     
      d3.select(divId+" svg").call(dragChart);
      d3.selectAll(".data-control").style("visibility", "visible");
  }

  function initSimpleView(overviewSVG) {
    overviewSVG.attr("display", "none");
      zoomFactor = 1;
      beginning = 0;
      ending = 0;
      $('.'+divId.substr(1)+'-qtip').qtip("hide");
      d3.select(divId).style("visibility", "hidden");
      d3.select(divId).style("visibility", "visible");
      scrolledX = null;
      overviewX = 0;
      d3.select("overview-rectangle").remove();
      advancedView = true;
      timeline();
      if (enableTrimmedTimeline) {
        clinicalTimeline.trimTimeline(maxDays, minDays, getZoomLevel, width, getTickValues, margin, formatTime, daysToTimeObject, divId);
      }
      advancedView = false;
      d3.select(".overview").remove();
      d3.selectAll(".data-control").style("visibility", "hidden");
  }

  function handleVerticalLine(enableVerticalLine) {
    if (enableVerticalLine) {
      var hoverLineGroup = d3.select(".timeline").append("g")
        .attr("class", "hover-line");
    
      var hoverLine = hoverLineGroup
        .append("line")
        .attr("x1", 0)
        .attr("x2", 0) 
        .attr("y1", 20)
        .attr("y2", 268)
        .style("stroke", "#ccc");

      var svgHeight = d3.select("#timeline svg")[0][0].getBoundingClientRect().height;

      var hoverText = hoverLineGroup.append("text")
        .attr("class", "hover-text")
        .attr("y", svgHeight - 10) //place text 10 pixels above the bottom of the svg
        .attr("font-size", 12)
        .attr("fill", "#888");

      var hoverBegin = 200, hoverEnd = 770; //dont allow hover beyond this point

      //scale to map the amount scrolled according to the svg coordinates to the days i.e
      //clinical-timeline coordianted
       var hoverScale = d3.time.scale()
          .domain([hoverBegin, hoverEnd])
          .range([beginning , ending]);

      hoverLineGroup.style("opacity", 0);

      d3.select(".timeline").on("mousemove", function() {
        var hoverX = d3.mouse(this)[0];
        if (hoverX > hoverBegin && hoverX < hoverEnd && !advancedView) {
          hoverText.text(parseInt(hoverScale(hoverX)) + "d");
          hoverText.attr("x", hoverX + 4);
          hoverLine.attr("x1", hoverX).attr("x2", hoverX)
          hoverLineGroup.style("opacity", 1);
          
          if(tooltipOnVerticalLine){         
            $(".timeline g rect,.timeline g circle").each(function(index) {
              var element = $(".timeline g rect, .timeline g circle")[index];
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
    }
  }

  /**
   * Checks wheter a timeline track contains timepoints with varying start and
   * end dates.
   */
  function isDurationTrack(trackData) {
    isDuration = false;
    trackData.times.forEach(function(x) {
      if (parseInt(x.starting_time) !== parseInt(x.ending_time)) {
        isDuration = true;
      }
    });
    return isDuration;
  }

  function splitTooltipTables(trackData) {
    var expandedTimes = [];

    for (var i = 0; i < trackData.times.length; i++) {
      var t = trackData.times[i];
      if (t.tooltip_tables.length > 1) {
        for (var j = 0; j < t.tooltip_tables.length; j++) {
          expandedTimes = expandedTimes.concat({
            "starting_time":t.starting_time,
            "ending_time":t.ending_time,
            "display":"circle",
            "tooltip_tables": [t.tooltip_tables[j]]
          });
        }
      } else {
        expandedTimes = expandedTimes.concat(t);
      }
    }
    trackData.times = expandedTimes;
  }

  /*
   * Merge timepoints that have the same starting_time into one timepoint with
   * multiple tooltip_tables
   */
  function mergeTooltipTablesAtEqualTimepoint(trackData) {
    if (!trackData || trackData.times.length === 0) return;

    var collapsedTimes = [],
        group = [],
        startingTime;

    var sortedTimes = trackData.times.sort(function(a, b) {
      return parseInt(a.starting_time) - parseInt(b.starting_time);
    });

    var mergeTimepoints = function(startingTime, group) {
      if (group.length === 1) {
        return group[0];
      } else {
        return {
          "starting_time":startingTime,
          "ending_time":startingTime,
          "display":"dropshadow circle",
          "tooltip_tables": _.reduce(group.map(function(x) {
            return x.tooltip_tables;
          }), function(a, b) {
            return a.concat(b);
          }, [])
        };
      }
    };

    for (var i = 0; i < sortedTimes.length; i++) {
      var t = sortedTimes[i];
      if (parseInt(t.starting_time) === startingTime) {
        group = group.concat(t);
      } else {
        if (group.length > 0) {
          collapsedTimes = collapsedTimes.concat(
              mergeTimepoints(startingTime, group));
        }
        group = [t];
        startingTime = parseInt(t.starting_time);
      }
    }
    collapsedTimes = collapsedTimes.concat(
        mergeTimepoints(startingTime, group));
    trackData.times = collapsedTimes;
  }

  function mergeAllTooltipTablesAtEqualTimepoint(data) {
    var collapsedTracks = data.filter(function(trackData) {
      return trackData.collapse && !isDurationTrack(trackData);
    });
    collapsedTracks.forEach(mergeTooltipTablesAtEqualTimepoint);
    return data;
  }

  function getClinicalAttributes(data, track) {
    return _.union.apply(_, getTrack(data, track).times.map(function(x) {
          // return union of attributes in tooltip (in case there are multiple)
          return _.union.apply(_, x.tooltip_tables.map(function(y) {
            return y.map(function(z) {
              return z[0];
            });
          }));
      })
    );
  }

  function groupByClinicalAttribute(track, attr) {
    return _.groupBy(getTrack(allData, track).times, function(x) {
      // return attribute value if there is one tooltip table
      if (x.tooltip_tables.length === 1) {
        return _.reduce(x.tooltip_tables[0], function(a,b) {
          a[b[0]] = b[1];
          return a;
        }, {})[attr];
      } else {
        return undefined;
      }
    });
  }

  function splitByClinicalAttributes(track, attrs) {
    // Use single string arg or split sequentially by array of strings arg
    if (typeof attrs === 'string') {
      attrs = [attrs];
    }
    // split tracks sequentially by given attrs
    var split_tracks = [track];
    var tracks;
    for (var i = 0; i < attrs.length; i++) {
      attr = attrs[i];
      tracks = [];
      for (var j = 0; j < split_tracks.length; j++) {
        tracks = tracks.concat(splitByClinicalAttribute(split_tracks[j], attr));
      }
      split_tracks = tracks;
    }
  }

  function splitByClinicalAttribute(track, attr) {
    // split tooltip_tables into separate time points
    splitTooltipTables(getTrack(allData, track));

    var g = groupByClinicalAttribute(track, attr);
    // Do not split if attribute is not in all time points
    if ("undefined" in g) {
      return [];
    }

    var trackIndex = _.findIndex(allData, function(x) {
      return x.label === track;
    });
    // determine indentation of track (how many times it has been split)
    var indent = allData[trackIndex].split? track.match(new RegExp("^\ *"))[0] : "";
    indent += "    ";

    // remove track
    allData = allData.filter(function(x) {return x.label !== track;});
    // Add old track with zero timeline points
    allData.splice(trackIndex, 0, {"label":track,"times":[],"visible":true,"split":true});
    // Stack tracks by minimum starting_time
    var attrValues = _.sortBy(Object.keys(g), function(k) {
      return _.min(_.pluck(g[k], "starting_time"));
    });
    for (j=0; j < attrValues.length; j++) {
      allData.splice(trackIndex+j+1, 0, {"label":indent+attrValues[j], "times":g[attrValues[j]], "visible":true,"split":true,"parent_track":track});
    }
    // return names of new tracks
    return attrValues.map(function(x) {return indent + x;});
  }

  function unSplitTrack(track) {
    var trackData = allData.filter(function(x) {return $.trim(x.label) === $.trim(track) && x.split;})[0];
    var times = allData.filter(function(x) {return x.split && x.parent_track === track;}).reduce(function(a, b) {
      return a.concat(b.times);
    }, []);
    trackData.times = times;
    trackData.visible = true;
    trackData.label = track;
    delete trackData.split;
    allData = allData.filter(function(x) {return !(x.split && x.parent_track === track);});
    timeline();
  }

  function sizeByClinicalAttribute(track, attr, minSize, maxSize) {
    var arr = getTrack(allData, track).times.map(function(x) {
      if (x.tooltip_tables.length === 1) {
        return parseFloat(String(x.tooltip_tables[0].filter(function(x) {
          return x[0] === attr;})[0][1]).replace(/[^\d.-]/g, ''));
      } else {
        return undefined;
      }
    });
    var scale = d3.scale.linear()
      .domain([d3.min(arr), d3.max(arr)])
      .range([minSize, maxSize]);
    getTrack(allData, track).times.forEach(function(x) {
      if (x.tooltip_tables.length === 1) {
        x.size = scale(parseFloat(String(x.tooltip_tables[0].filter(function(x) {
          return x[0] === attr;})[0][1]).replace(/[^\d.-]/g, ''))) || minSize;
      }
    });
  }

  function colorByClinicalAttribute(track, attr) {
    var g = groupByClinicalAttribute(track, attr);
    Object.keys(g).forEach(function(k) {
      g[k].forEach(function(x) {
        x.color = colorCycle(k);
      });
    });
  }

  function clearColors(track) {
    var times = getTrack(allData, track).times;
    for (var i=0; i < times.length; i++) {
      if ("color" in times[i]) {
        delete times[i].color;
      }
    }
  }

  timeline.addDataPointTooltip = function addDataPointTooltip(elem) {
    function createDataTable(tooltip_table) {
      dataTable = {
        "sDom": 't',
        "bJQueryUI": true,
        "bDestroy": true,
        "aaData": tooltip_table,
        "aoColumnDefs": [
          {
            "aTargets": [ 0 ],
            "sClass": "left-align-td",
            "mRender": function ( data, type, full ) {
               return '<b>'+data+'</b>';
            }
          },
          {
            "aTargets": [ 1 ],
            "sClass": "left-align-td",
            "bSortable": false
          }
        ],
        "fnDrawCallback": function ( oSettings ) {
          $(oSettings.nTHead).hide();
        },
        "aaSorting": []
      };
      return dataTable;
    }
    elem.qtip({
      content: {
        text: "table"
      },
      events: {
        render: function(event, api) {
          var tooltipDiv = $.parseHTML("<div></div>");
          var d = elem.prop("__data__");
          var table;
          if ("tooltip_tables" in d) {
            for (var i=0; i < d.tooltip_tables.length; i++) {
              if (i !== 0) {
                $(tooltipDiv).append("<hr />");
              }
              table = $.parseHTML("<table style='text-align:left; background-color: white;'></table>");
              $(table).dataTable(createDataTable(d.tooltip_tables[i]));
              $(tooltipDiv).append(table);
            }
          } else if ("tooltip" in d) {
            table = $.parseHTML("<table style='text-align:left; background-color: white;'></table>");
            $(table).dataTable(createDataTable(d.tooltip));
            $(tooltipDiv).append(table);
          }
          $(this).html(tooltipDiv);
          $(this).addClass(divId.substr(1) + "-qtip");
          // Detect when point it was clicked and store it
          api.elements.target.click(function(e) {
            if (api.wasClicked) {
              api.hide();
              api.wasClicked = false;
            }
            else {
              api.wasClicked = !api.wasClicked;
            }
          });
        },
        hide: function(event, api) {
          // Prevent hiding if the point was clicked or if the
          // tooltip is already showing because of the mouseover
          if ((api.wasClicked && event.originalEvent.type === 'mouseleave') ||
              (!api.wasClicked && event.originalEvent.type === 'click')) {
              try{ event.preventDefault(); } catch(e) {}
          }
        }
      },
      show: {event: "mouseover"},
      hide: {event: "mouseleave"},
      style: { classes: 'qtip-light qtip-rounded qtip-wide' },
      position: {my:'top middle',at:'bottom middle',viewport: $(window)},
   });
  };

  function toggleTrackVisibility(trackName) {
    var trackData = getTrack(allData, trackName);
    trackData.visible = trackData.visible? false : true;
  }

  function toggleTrackCollapse(trackName) {
    var trackData = getTrack(allData, trackName);
    if (trackData.collapse) {
      trackData.collapse = false;
      splitTooltipTables(trackData);
    } else {
      if (!isDurationTrack(trackData)) {
        trackData.collapse = true;
      }
    }
  }

  function addNewTrackTooltip(elem) {
    elem.qtip({
    content: {
      text: 'addtrack'
    },
    events: {
      render: function(event, api) {
        invisibleTracks = allData.filter(function (x) {
          return !x.visible;
        });
        if (invisibleTracks.length === 0) {
          $(this).html("All tracks shown");
        }
        else {
          var trackAnchors = "";
          for (var i=0; i<invisibleTracks.length; i++) {
            trackAnchors +=
              "<a href='#' onClick='return false' class='show-track'>"+invisibleTracks[i].label+"</a><br />";
          }
          $(this).html(trackAnchors);
          $('.show-track').each(function () {
            $(this).on("click", function() {
              toggleTrackVisibility($(this).prop("innerHTML"));
              $(this).remove();
              timeline();
            });
          });
        }
      }
    },
    show: {event: "mouseover"},
    hide: {fixed: true, delay: 0, event: "mouseout"},
    style: { classes: 'qtip-light qtip-rounded qtip-wide' },
    position: {my:'top middle',at:'top middle',viewport: $(window)},
    });
  }

  function addClinicalAttributesTooltip(elem, track, clickHandlerType) {
    function colorClickHandler() {
      colorByClinicalAttribute(track, $(this).prop("innerHTML"));
      timeline();
    }
    function splitClickHandler() {
      splitByClinicalAttributes(track, $(this).prop("innerHTML"));
      timeline();
    }
    function sizeByClickHandler() {
      sizeByClinicalAttribute(track, $(this).prop("innerHTML"), 2, itemHeight);
      timeline();
    }
    elem.qtip({
      content: {
        text: ''
      },
      events: {
        render: function(event, api) {
          if (clickHandlerType === "color") {
            clickHandler = colorClickHandler;
          } else if (clickHandlerType === "split") {
            clickHandler = splitClickHandler;
          } else if (clickHandlerType === "size") {
            clickHandler = sizeByClickHandler;
          } else {
            console.log("Unknown clickHandler for clinical attributes tooltip.");
          }
          var colorByAttribute = $.parseHTML("<div class='color-by-attr-tooltip'></div>");
          var clinAtts = getClinicalAttributes(allData, track);
          for (var i=0; i < clinAtts.length; i++) {
            var a = $.parseHTML("<a href='#' onClick='return false'>"+clinAtts[i]+"</a>");
            $(a).on("click", clickHandler);
            $(colorByAttribute).append(a);
            $(colorByAttribute).append("<br />");
          }
          $(this).html(colorByAttribute);
        }
      },
      show: {event: "click"},
      hide: {fixed: true, delay: 0, event: "mouseout"},
      style: { classes: 'qtip-light qtip-rounded qtip-wide' },
      position: {my:'left middle',at:'top middle',viewport: $(window)},
    });
  }


  function addSplittedTrackTooltip(elem, data) {
    function unSplitClickHandler(trackName) {
       return function() {
         unSplitTrack(trackName);
       };
    }
    elem.qtip({
      content: {
        text: 'track'
      },
      events: {
        render: function(event, api) {
          var trackTooltip = $.parseHTML("<div class='track-toolip'></div>");
          var a = $.parseHTML("<a href='#' onClick='return false' class='hide-track'>Unsplit</a>");
          $(a).on("click", unSplitClickHandler(elem.prop("innerHTML").split(".")[0]));
          $(trackTooltip).append(a);
          $(this).html(trackTooltip);
        }
      },
      show: {event: "mouseover"},
      hide: {fixed: true, delay: 0, event: "mouseout"},
      style: { classes: 'qtip-light qtip-rounded qtip-wide' },
      position: {my:'top middle',at:'top middle',viewport: $(window)},
    });
  }
  

  function addTrackTooltip(elem, data) {
    function hideTrackClickHandler(trackName) {
       return function() {
         toggleTrackVisibility(trackName);
         timeline();
       };
    }
    function collapseTrackClickHandler(trackName) {
      return function() {
        toggleTrackCollapse(trackName);
        timeline();
      };
    }
    elem.qtip({
      content: {
        text: 'track'
      },
      events: {
        render: function(event, api) {
          var trackTooltip = $.parseHTML("<div class='track-toolip'></div>");
          var a = $.parseHTML("<a href='#' onClick='return false' class='hide-track'>Hide " +
            elem.prop("innerHTML") + "</a>");
          $(a).on("click", hideTrackClickHandler(elem.prop("innerHTML")));
          $(trackTooltip).append(a);
          $(trackTooltip).append("<br />");

          if (!isDurationTrack(getTrack(allData, elem.prop("innerHTML")))) {
            a = $.parseHTML("<a href='#' onClick='return false' class='hide-track'>Collapse/Stack</a>");
            $(a).on("click", collapseTrackClickHandler(elem.prop("innerHTML")));
            $(trackTooltip).append(a);
            $(trackTooltip).append("<br />");
          }

          var colorBy = $.parseHTML("<a href='#' onClick='return false' class='color-by-attr'>Color by</a>");
          $(trackTooltip).append(colorBy);
          
          var clearColorsA = $.parseHTML("&nbsp;<a href='#' onClick='return false'>Clear</a>");
          $(clearColorsA).on("click", function() {
            clearColors(elem.prop("innerHTML"));
            timeline();
          });
          $(trackTooltip).append(clearColorsA);
          $(trackTooltip).append("<br />");

          var splitBy = $.parseHTML("<a href='#' onClick='return false' class='split-by-attr'>Split by</a>");
          $(trackTooltip).append(splitBy);
          $(trackTooltip).append("<br />");

          var sizeBy = $.parseHTML("<a href='#' onClick='return false' class='split-by-attr'>Size by</a>");
          $(trackTooltip).append(sizeBy);

          $(this).html(trackTooltip);
          addClinicalAttributesTooltip($(colorBy), elem.prop("innerHTML"), "color");
          addClinicalAttributesTooltip($(splitBy), elem.prop("innerHTML"), "split");
          addClinicalAttributesTooltip($(sizeBy), elem.prop("innerHTML"), "size");
        }
      },
      show: {event: "mouseover"},
      hide: {fixed: true, delay: 0, event: "mouseout"},
      style: { classes: 'qtip-light qtip-rounded qtip-wide' },
      position: {my:'top middle',at:'top middle',viewport: $(window)},
    });
  }

  function filterTrack(data, track) {
      return data.filter(function(x) {
          return x.label !== track;
      });
  }

  function getMaxEndingTime(data) {
      return Math.max.apply(Math, data.map(function (o){
          return Math.max.apply(Math, o.times.map(function(t) {
              return t.ending_time || 0;
          }));
      }));
  }

  function getMinStartingTime(data) {
      return Math.min.apply(Math, data.map(function (o){
          return Math.min.apply(Math, o.times.map(function(t) {
              return t.starting_time;
          }));
      }));
  }

  function daysToTimeObject(dayCount) {
      var time = {};
      var daysPerYear = 365;
      var daysPerMonth = 30;
      time.daysPerYear = daysPerYear;
      time.daysPerMonth = daysPerMonth;
      time.y = dayCount > 0? Math.floor(dayCount / daysPerYear) : Math.ceil(dayCount / daysPerYear);
      time.m = dayCount > 0? Math.floor((dayCount % daysPerYear) / daysPerMonth) : Math.ceil((dayCount % daysPerYear) / daysPerMonth);
      time.d = Math.floor((dayCount % daysPerYear) % daysPerMonth);
      time.toDays = function() {
        return time.y * time.daysPerYear + time.m * time.daysPerMonth + time.d;
      };
      time.toMonths = function() {
        return time.y * 12 + time.m + time.d / daysPerMonth;
      };
      time.toYears = function() {
        return time.y + time.m / 12 + time.d / daysPerYear;
      };
      return time;
  }

  function formatTime(time, zoomLevel) {
      var dayFormat = [];
      var m;
      var d;

      if (time.y === 0 && time.m === 0 && time.d === 0) {
        dayFormat = "0";
      } else {
        switch(zoomLevel) {
          case "days":
          case "10days":
          case "3days":
            d = time.toDays();
            dayFormat = d + "d";
            break;
          case "months":
            m = time.m + 12 * time.y;
            dayFormat = m + "m";
            break;
          case "years":
            y = time.y;
            dayFormat = y + "y";
            break;
          default:
            console.log("Undefined zoomLevel");
        }
      }
      return dayFormat;
  }

  /*
   * Return zoomLevel in human comprehensible form by determining the width in pixels of a single day
   */
  function getZoomLevel(minDays, maxDays, width) {
    pixelsPerDay = parseFloat(parseInt(width) / difference(parseInt(minDays), parseInt(maxDays)));
    if (pixelsPerDay < 1) {
      return "years";
    } else if (pixelsPerDay < 10){
      return "months";
    } else if (pixelsPerDay < 25){
      return "10days";
    } else if (pixelsPerDay < 50) {
      return "3days";
    } else {
      return "days";
    }
  }

  /*
   * Return zoomFactor by specifying what kind of zoomLevel on the x axis (e.g.
   * years, days) is desired
   */
  function getZoomFactor(zoomLevel, minDays, maxDays, width) {
    switch(zoomLevel) {
      case "years":
        return 0.9 * difference(parseInt(minDays), parseInt(maxDays)) / parseInt(width);
      case "months":
        return 19 * difference(parseInt(minDays), parseInt(maxDays)) / parseInt(width);
      case "10days":
        return 34 * difference(parseInt(minDays), parseInt(maxDays)) / parseInt(width);
      case "3days":
        return 49 * difference(parseInt(minDays), parseInt(maxDays)) / parseInt(width);
      case "days":
        return 51 * difference(parseInt(minDays), parseInt(maxDays)) / parseInt(width);
      default:
        throw "Undefined zoomLevel: " + zoomLevel;
    }
  }

  function roundUpDays(dayCount, zoomLevel) {
    var rv;
    var time = daysToTimeObject(dayCount);
    additive = dayCount < 0? 1: -1;
    switch(zoomLevel) {
      case "years":
        rv = (time.y + additive) * time.daysPerYear;
        break;
      case "months":
        rv = time.y * time.daysPerYear + (time.m + additive) * time.daysPerMonth;
        rv += Math.abs(time.m) === 11? (time.daysPerYear - 12*time.daysPerMonth) * additive : 0;
        break;
      case "3days":
        rv = time.toDays() + (time.d % 3) * additive;
        break;
      default:
        rv = dayCount;
        break;
    }
    return rv;
  }

  function difference(a, b) {
    return Math.max(a, b) - Math.min(a, b);
  }

  // Rounds up to the nearest multiple of a number
  function roundUp(numToRound, multiple) {
    var remainder = numToRound % multiple;
    if (multiple === 0 || remainder === 0) {
      return numToRound;
    } else{
      if (numToRound < 0) {
        return -1 * roundDown(-1 * numToRound, multiple);
      } else {
        return numToRound + multiple - remainder;
      }
    }
  }

  // Rounds down to the nearest multiple of a number
  function roundDown(numToRound, multiple) {
    var remainder = numToRound % multiple;
    if (multiple === 0 || remainder === 0) {
      return numToRound;
    } else{
        if (numToRound < 0) {
          return -1 * roundUp(-1 * numToRound, multiple);
        } else {
          return numToRound - multiple - remainder;
        }
    }
  }

  function getTickValues(minDays, maxDays, zoomLevel) {
      var tickValues = [];
      var maxTime = daysToTimeObject(parseInt(maxDays));
      var minTime = daysToTimeObject(parseInt(minDays));
      var i;
      if (zoomLevel === "years") {
          for (i=roundDown(minTime.toYears(), 1); i <= roundUp(maxTime.toYears(), 1); i++) {
              tickValues.push(i * maxTime.daysPerYear);
          }
      } else if (zoomLevel === "months") {
          for (i=roundDown(minTime.toMonths(), 1); i <= roundUp(maxTime.toMonths(), 1); i++) {
              tickValues.push(i * maxTime.daysPerMonth + parseInt(i/12) * 5);
          }
      } else if (zoomLevel === "10days") {
          for (i=roundDown(minTime.toDays(), 10); i <= roundUp(maxTime.toDays(), 10); i+=10) {
              tickValues.push(i);
          }
      } else if (zoomLevel === "3days") {
          for (i=roundDown(minTime.toDays(), 3); i <= roundUp(maxTime.toDays(), 3); i+=3) {
              tickValues.push(i);
          }
      } else {
          for (i=minTime.toDays(); i <= maxTime.toDays(); i++) {
              tickValues.push(i);
          }
      }
      return tickValues;
  }

  timeline.enableTrackTooltips = function(b) {
    if (!arguments.length) return enableTrackTooltips;

    if (b === true || b === false) {
      enableTrackTooltips = b;
    }
    return timeline;
  };

  timeline.enableZoom = function(b) {
    if (!arguments.length) return enableZoom;

    if (b === true || b === false) {
      enableZoom = b;
    }
    return timeline;
  };

  timeline.enableTrimmedTimeline = function(b) {
    if (!arguments.length) return enableTrimmedTimeline;

    if (b === true || b === false) {
      enableTrimmedTimeline = b;
    }
    return timeline;
  };

  timeline.enableVerticalLine = function(b) {
    if (!arguments.length) return enableVerticalLine;

    if (b === true || b === false) {
      enableVerticalLine = b;
    }
    return timeline;
  };

  timeline.advancedView = function(b) {
    if (!arguments.length) return advancedView;

    if (b === true || b === false) {
      advancedView = b;
    }
    return timeline;
  };

  timeline.width = function (w) {
    if (!arguments.length) return width;
    width = w;
    return timeline;
  };

  timeline.stackSlack = function () {
    if (!arguments.length) return stackSlack;
    return timeline;
  };

  timeline.data = function (data) {
    if (!arguments.length) return allData;
    allData = data;
    return timeline;
  };

  timeline.divId = function (name) {
    if (!arguments.length) return divId;
    divId = name;
    return timeline;
  };

  timeline.collapseAll = function() {
    var singlePointTracks = allData.filter(function(trackData) {
      return !isDurationTrack(trackData);
    });
    singlePointTracks.forEach(mergeTooltipTablesAtEqualTimepoint);
    singlePointTracks.forEach(function(x) { x.collapse = true; });
    return timeline;
  };

  /*
   * Order tracks by given array of label names. Tracks with label names not
   * included in the sequence are appended to the end in alhpanumeric order.
   */
  timeline.orderTracks = function(labels) {
    if (!arguments.length) {
      allData = _.sortBy(allData, 'label');
      return timeline;
    }

    var data = [];
    var track;
    // append given label ordering
    for (var i = 0; i < labels.length; i++) {
      track = getTrack(allData, labels[i]);
      if (track) {
        data = data.concat(track);
      }
    }
    // append missing labels
    data = data.concat(_.sortBy(allData.filter(function(x) {
      return labels.indexOf(x.label) === -1;
    }), 'label'));

    allData = data;
    return timeline;
  };

  /*
   * Order tooltip tables in given track by given array of row keys. Tooltip
   * table rows with keys not included given rowkeys argument are appended to
   * the end in alhpanumeric order.
   */
  timeline.orderTrackTooltipTables = function(track, rowkeys) {
    trackData = getTrack(allData, track);
    if (trackData.times.length === 0) {
      return timeline;
    }
    // sort rows not in given rowkeys
    alphaSortRows = _.uniq(
      trackData.times.map(function(t) {
        return t.tooltip_tables.map(function(tt) {
          return tt.map(function(row) {
            if (rowkeys.indexOf(row[0]) === -1) return row[0];
          });
        });
    }).reduce(function(a,b) {
        return a.concat(b);
      }, []).reduce(function(a,b) {
        return a.concat(b);
      }, [])
    ).sort();
    // If there are any rows other than the given ones add them
    if (alphaSortRows && alphaSortRows[0]) {
      allLabelRows = rowkeys.concat(alphaSortRows);
    } else {
      allLabelRows = rowkeys;
    }

    trackData.times.forEach(function(t) {
      for (var i=0; i < t.tooltip_tables.length; i++) {
        var tt = t.tooltip_tables[i];
        var sortTt = [];

        for (var j=0; j < allLabelRows.length; j++) {
          row = tt.filter(function(x) {return x[0] === allLabelRows[j];})[0];
          if (row) {
            sortTt = sortTt.concat([row]);
          }
        }
        t.tooltip_tables[i] = sortTt;
      }
    });
    return timeline;
  };

  /*
   * Order all tooltip tables by given array of row keys. Tooltip table rows
   * with keys not included given rowkeys argument are appended to the end in
   * alhpanumeric order.
   */
  timeline.orderAllTooltipTables = function(rowkeys) {
    allData.forEach(function(track) {
      timeline.orderTrackTooltipTables(track.label, rowkeys);
    });
    return timeline;
  };

  /*
   * Split a track into multiple tracks based on the value of an
   * attribute in the tooltip_tables. The attributes to attrs agument can be a
   * single string or an array of strings. An array of strings splits the
   * tracks sequentially.
   */
  timeline.splitByClinicalAttributes = function(track, attrs) {
    var trackData = getTrack(allData, track);
    if (trackData) {
      splitByClinicalAttributes(track, attrs);
    }
    return timeline;
  };

  /*
   * Set the size of each timepoint in a track based on the value of an
   * attribute in the tooltip_tables.
   */
  timeline.sizeByClinicalAttribute = function(track, attr) {
    var trackData = getTrack(allData, track);
    if (trackData) {
      var attrData = trackData.times[0].tooltip_tables[0].filter(function(x) {
        return x[0] === attr;
      });
      if (attrData.length === 1) {
        sizeByClinicalAttribute(track, attr, 2, itemHeight);
      }
    }
    return timeline;
  };

  /*
   * Collapse or stack timepoints on given track
   */
  timeline.toggleTrackCollapse = function(track) {
    var trackData = getTrack(allData, track);
    if (trackData) {
      toggleTrackCollapse(track);
    }
    return timeline;
  };

  /*
   * Set the display attribute for all timepoints with one tooltip_table on a
   * given track.
   */
  timeline.setTimepointsDisplay = function(track, display) {
    var trackData = getTrack(allData, track);
    if (trackData) {
      trackData.times.forEach(function(x) {
        if (x.tooltip_tables.length === 1) {
          x.display = display;
        }
      });
    }
    return timeline;
  };

  timeline.addPostTimelineHook = function(hook) {
    postTimelineHooks = postTimelineHooks.concat(hook);
    return timeline;
  };

  timeline.toggleTooltipOnVerticalLine = function() {
    if (tooltipOnVerticalLine) {
      tooltipOnVerticalLine = false;
      $('#tooltip-controller a').text("Show tooltips on vertical-line");
    } else {
      tooltipOnVerticalLine = true;
      $('#tooltip-controller a').text("Hide tooltips on vertical-line");
    }
  }
  
  timeline.toggleVerticalLineAndTrim = function(radioSelection) {
    if (radioSelection.value === "trim") {
      enableVerticalLine = false;
      enableTrimmedTimeline = true;
      $("#tooltip-controller").css("display", "none");
    } else {
      enableVerticalLine = true;
      enableTrimmedTimeline = false;
      $("#tooltip-controller").css("display", "inline-block");
    }
    timeline();
  }

  return timeline;
})();
