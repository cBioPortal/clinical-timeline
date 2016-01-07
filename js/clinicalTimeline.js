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
      beginning = "0",
      ending = 0;

  function getTrack(data, track) {
    return data.filter(function(x) {
      return $.trim(x.label) === $.trim(track);
    })[0];
  }

  function timeline() {
    visibleData = allData.filter(function(x) {
        return x.visible;
    });

    var maxDays = Math.max.apply(Math, [getMaxEndingTime(allData), 1]);
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
    var minDays = Math.min.apply(Math, [getMinStartingTime(allData), 0]);

    if (ending === 0) {
      ending = maxDays;
    }
    if (beginning === "0") {
      beginning = minDays;
    }
    if (beginning === 0) {
      beginning = "0";
    }

    var chart = d3.timeline()
      .stack()
      .margin(margin)
      .tickFormat({
        format: function(d) { return formatTime(daysToTimeObject(d.valueOf())); },
        tickValues: getTickValues(beginning, ending, getZoomLevel(beginning, ending, width * zoomFactor)),
        tickSize: 6
      })
      .translate(translateX)
      .width(width * zoomFactor)
      .beginning(beginning)
      .ending(ending)
      .stackSlack(stackSlack)
      .orient('top')
      .itemHeight(itemHeight)
      .itemMargin(itemMargin)
      .colors(colorCycle);


    $(divId).html("");
    var svg = d3.select(divId).append("svg").attr("width", width);

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
      .attr("width", 190)
      .attr("height", gBoundingBox.height - 15)
      .attr("x", 0)
      .attr("y", 20)
      .style("fill", "rgb(255, 255, 255)");

    // change mouse to pointer for all timeline items
    $("[id^='timelineItem']").css("cursor", "pointer");

    postTimelineHooks.forEach(function(hook) {
      hook.call();
    });
  }

  /*
   * Add rectangular zoom selection. Use brush to zoom. After zooming in, scroll mouse or drag to pan.
   */
  function addZoomOptions() {
    var svg = d3.select(divId + " svg");
    var g = d3.select(divId + " svg g");
    var gBoundingBox = g[0][0].getBoundingClientRect();

    if (zoomFactor === 1) {
      // Add rectangular zoom selection
      // zoom in after brush ends
      var brushend = function() {
        var xDaysRect = brush.extent()[0].valueOf();
        zoomFactor = (parseInt(width) - parseInt(margin.left) - parseInt(margin.right)) / (parseInt(d3.select(".extent").attr("width")));
        if (zoomFactor > 0) {
          zoomFactor = Math.min(zoomFactor, getZoomFactor("days", beginning, ending, width));
        } else {
          zoomFactor = getZoomFactor("days", beginning, ending, width);
        }
        var xZoomScale = d3.time.scale()
           .domain([beginning, ending])
           .range([margin.left, width * zoomFactor - margin.right]);
        translateX = -xZoomScale(xDaysRect);
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
          beginning = "0";
          ending = 0;
          $('.'+divId.substr(1)+'-qtip').qtip("hide");
          d3.select(divId).style("visibility", "hidden");
          timeline();
          d3.select(divId).style("visibility", "visible");
          this.remove();
        });
      };

      if (getZoomLevel(beginning, ending, width) !== "days") {
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
      return time;
  }

  function formatTime(time) {
      var dayFormat = [];
      var m;
      var d;
      if (time.y !== 0) {
        dayFormat = dayFormat.concat(time.y+"y");
      }
      if (time.m !== 0) {
        if (time.y !== 0) {
          m = Math.abs(time.m);
        } else {
          m = time.m;
        }
        dayFormat = dayFormat.concat(m+"m");
      }
      if (time.d !== 0) {
        if (time.y !== 0 || time.m !== 0) {
          d = Math.abs(time.d);
        } else {
          d = time.d;
        }
        dayFormat = dayFormat.concat(d+"d");
      }
      if (time.y === 0 && time.m === 0 && time.d === 0) {
        dayFormat = [0];
      }
      return dayFormat.join("");
  }

  /*
   * Return zoomLevel in human comprehensible form by determining the width in pixels of a single day
   */
  function getZoomLevel(beginning, ending, width) {
    pixelsPerDay = parseFloat(parseInt(width) / difference(parseInt(beginning), parseInt(ending)));
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
  function getZoomFactor(zoomLevel, beginning, ending, width) {
    switch(zoomLevel) {
      case "years":
        return 0.9 * difference(parseInt(beginning), parseInt(ending)) / parseInt(width);
      case "months":
        return 19 * difference(parseInt(beginning), parseInt(ending)) / parseInt(width);
      case "10days":
        return 34 * difference(parseInt(beginning), parseInt(ending)) / parseInt(width);
      case "3days":
        return 49 * difference(parseInt(beginning), parseInt(ending)) / parseInt(width);
      case "days":
        return 51 * difference(parseInt(beginning), parseInt(ending)) / parseInt(width);
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

  function getTickValues(beginning, ending, zoomLevel) {
      tickValues = [];
      timePeriod = daysToTimeObject(difference(parseInt(beginning), parseInt(ending)));
      maxTime = daysToTimeObject(parseInt(ending));
      minTime = daysToTimeObject(parseInt(beginning));
      var i;
      if (zoomLevel === "years") {
          tickValues.push(parseInt(beginning));
          for (i=minTime.y; i < maxTime.y; i++) {
              tickValues.push(i * maxTime.daysPerYear);
          }
      } else if (zoomLevel === "months") {
          tickValues.push(parseInt(beginning));
          for (i=minTime.m + minTime.y * 12 + 1; i < maxTime.m + maxTime.y * 12 - 1; i++) {
              tickValues.push(i * maxTime.daysPerMonth + parseInt(i/12) * 5);
          }
      } else if (zoomLevel === "10days") {
          for (i=parseInt(beginning); i < parseInt(ending) - 1; i+=10) {
              tickValues.push(i);
          }
      } else if (zoomLevel === "3days") {
          for (i=parseInt(beginning); i < parseInt(ending) - 1; i+=3) {
              tickValues.push(i);
          }
      } else {
          for (i=parseInt(beginning); i < parseInt(ending); i++) {
              tickValues.push(i);
          }
      }
      tickValues.push(parseInt(ending));
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

  return timeline;
})();
