// vim: ts=2 sw=2
window.clinicalTimeline = (function(){
  var allData,
      colorCycle = d3.scale.category20(),
      margin = {left: 200, right:30, top: 15, bottom:0},
      itemHeight = 6,
      itemMargin = 8,
      divId = null,
      width = null,
      postTimelineHooks = [],
      enableTrackTooltips = true,
      stackSlack = null,
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
    if (ending === 0) {
      ending = maxDays;
    }

    var chart = d3.timeline()
      .stack()
      .margin(margin)
      .tickFormat({
        format: function(d) { return formatTime(daysToTimeObject(d.valueOf())); },
        tickValues: getTickValues(allData),
        tickSize: 6
      })
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

    // Add zoom selection
    var g = d3.select(divId + " svg g");
    g.attr("class", "g_main");
    var gBoundingBox = g[0][0].getBoundingClientRect();
    var drawRect = false;
    var overlayRect = g.insert("rect", ".axis").attr("id","overlayRect").style("visibility","hidden").attr("x", 200).attr("y", 0).attr("width", gBoundingBox.width).attr("height", gBoundingBox.height);
    var originX;
    overlayRect.on("mousedown", function() {
      d3.select("#zoomRect").remove();
      drawRect = true;
      originX = d3.mouse(this)[0];
      var g = d3.select(divId + " svg g");
      rect = g.insert("rect", "#overlayRect")
        .attr("width", 0)
        .attr("id", "zoomRect")
        .attr("height", gBoundingBox.height)
        .attr("x", originX)
        .attr("y", 20)
        .attr("style", "fill-opacity: 0.5");
      return false;
    });
    overlayRect.on("mousemove", function() {
      if (drawRect) {
        var mouseX = d3.mouse(this)[0];
        if (mouseX > originX) {
          d3.select("#zoomRect").attr("width", mouseX - originX);
        } else {
          d3.select("#zoomRect").attr("x", mouseX);
          d3.select("#zoomRect").attr("width", originX - mouseX);
        }
      }
      return false;
    });
    overlayRect.on("mouseup", function() {
      if (drawRect) {
        drawRect = false;
        var xScale = d3.time.scale()
          .domain([beginning, ending])
          .range([margin.left, width - margin.right]);
        beginning = xScale.invert(d3.select("#zoomRect").attr("x")).valueOf();
        if (beginning === 0) {
          beginning = "0";
        }
        ending = xScale.invert(parseInt(d3.select("#zoomRect").attr("x")) + parseInt(d3.select("#zoomRect").attr("width"))).valueOf() + 1;
        d3.select(divId).style("visibility", "hidden");
        timeline();
        d3.select(divId).style("visibility", "visible");
      }
    });

    // Add white background for labels to prevent timepoint overlap
    d3.select(divId + " svg")
      .insert("rect", ".timeline-label")
      .attr("width", 130)
      .attr("height", 20)
      .attr("x", 0)
      .attr("y", 0)
      .style("fill", "rgb(255, 255, 255)");
    d3.select(divId + " svg")
      .insert("rect", ".timeline-label")
      .attr("width", 200)
      .attr("height", gBoundingBox.height - 15)
      .attr("x", 0)
      .attr("y", 20)
      .style("fill", "rgb(255, 255, 255)");


    postTimelineHooks.forEach(function(hook) {
      hook.call();
    });
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
        startingTime = undefined;

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

  function splitByClinicalAttribute(track, attr) {
    // split tooltip_tables into separate time points
    splitTooltipTables(getTrack(allData, track));

    var g = groupByClinicalAttribute(track, attr);
    var trackIndex = _.findIndex(allData, function(x) {
      return x.label == track;
    });
    var indent = allData[trackIndex].split? track.match(new RegExp("^\ *"))[0] : "";
    indent += "    ";

    // remove track
    allData = allData.filter(function(x) {return x.label !== track;});
    // Add new track
    allData.splice(trackIndex, 0, {"label":track+"."+attr,"times":[],"visible":true,"split":true});
    var attrValues = Object.keys(g);
    for (var i=0; i < attrValues.length; i++) {
      allData.splice(trackIndex+i+1, 0, {"label":indent+attrValues[i], "times":g[attrValues[i]], "visible":true,"split":true,"parent_track":track});
    }
  }

  function unSplitTrack(track) {
    var trackData = allData.filter(function(x) {return x.label.split(".")[0] === track;})[0];
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
      splitByClinicalAttribute(track, $(this).prop("innerHTML"));
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

  function daysToTimeObject(dayCount) {
      var time = {};
      var daysPerYear = 365;
      var daysPerMonth = 30;
      time.daysPerYear = daysPerYear;
      time.daysPerMonth = daysPerMonth;
      time.y = dayCount > 0? Math.floor(dayCount / daysPerYear) : Math.ceil(dayCount / daysPerYear);
      time.m = dayCount > 0? Math.floor((dayCount % daysPerYear) / daysPerMonth) : Math.ceil((dayCount % daysPerYear) / daysPerMonth);
      time.d = Math.floor((dayCount % daysPerYear) % daysPerMonth);
      return time;
  }

  function formatTime(time) {
      var dayFormat = [];
      if (time.y !== 0) {
          dayFormat = dayFormat.concat(time.y+"y");
      }
      if (time.m !== 0) {
          dayFormat = dayFormat.concat(time.m+"m");
      }
      if (time.d !== 0) {
          dayFormat = dayFormat.concat(time.d+"d");
      }
      if (time.y === 0 && time.m === 0 && time.d === 0) {
          dayFormat = [0];
      }
      return dayFormat.join(" ");
  }

  function getTickValues(data) {
      tickValues = [];
      maxDays = Math.max.apply(Math, [getMaxEndingTime(allData), 1]);
      maxTime = daysToTimeObject(maxDays);
      if (maxTime.y >= 1) {
          for (var i=0; i < maxTime.y; i++) {
              tickValues.push(i * maxTime.daysPerYear);
          }
      } else if (maxTime.y > 0 || maxTime.m  >= 1) {
          for (var i=0; i < maxTime.m + (maxTime.y * maxTime.daysPerYear) / maxTime.daysPerMonth; i++) {
              tickValues.push(i * maxTime.daysPerMonth);
          }
      } else {
          for (var i=0; i < maxDays; i++) {
              tickValues.push(i);
          }
      }
      tickValues.push(maxDays);
      return tickValues;
  }

  timeline.enableTrackTooltips = function(b) {
    if (!arguments.length) return enableTrackTooltips;

    if (b === true || b === false) {
      enableTrackTooltips = b;
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

  timeline.orderTrackTooltipTables = function(track, labels) {
    trackData = getTrack(allData, track);
    if (trackData.times.length === 0) {
      return timeline;
    }
    // sort rows not in given labels
    alphaSortRows = _.uniq(
      trackData.times.map(function(t) {
        return t.tooltip_tables.map(function(tt) {
          return tt.map(function(row) {
            if (labels.indexOf(row[0]) === -1) return row[0];
          });
        });
    }).reduce(function(a,b) {
        return a.concat(b);
      }, []).reduce(function(a,b) {
        return a.concat(b);
      }, [])
    ).sort();
    allLabelRows = labels.concat(alphaSortRows);
    trackData.times.forEach(function(t) {
      for (var i=0; i < t.tooltip_tables.length; i++) {
        var tt = t.tooltip_tables[i];
        var sortTt = [];

        for (var j=0; j < allLabelRows.length; j++) {
          row = tt.filter(function(x) {return x[0] === allLabelRows[j];})[0];
          if (row != null) {
            sortTt = sortTt.concat([row]);
          }
        }
        t.tooltip_tables[i] = sortTt;
      }
    });
    return timeline;
  };

  timeline.orderAllTooltipTables = function(labels) {
    allData.forEach(function(track) {
      timeline.orderTrackTooltipTables(track.label, labels);
    });
    return timeline;
  };

  /*
   * Split a track into multiple tracks based on the value of an
   * attribute in the tooltip_tables.
   */
  timeline.splitByClinicalAttribute = function(track, attr) {
    var trackData = getTrack(allData, track);
    if (trackData) {
      var attrData = trackData.times[0].tooltip_tables[0].filter(function(x) {
        return x[0] === attr;
      });
      if (attrData.length === 1) {
        splitByClinicalAttribute(track, attr);
      }
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