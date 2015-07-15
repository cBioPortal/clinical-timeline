// vim: ts=2 sw=2
window.clinicalTimeline = (function(){
  var allData;
  var colorCycle = d3.scale.category20();

  function timeline(data, divId) {
    allData = data;
    visibleData = data.filter(function(x) {
        return x.visible;
    });
    var chart = d3.timeline()
      .stack()
      .margin({left:200, right:30, top:15, bottom:0})
      .tickFormat({
        format: function(d) { return formatTime(daysToTimeObject(d.valueOf())); },
        tickValues: getTickValues(data),
        tickSize: 6
      })
      .beginning("0")
      .ending(getMaxEndingTime(data))
      .orient('top')
      .itemHeight(6)
      .itemMargin(20)
      .colors(colorCycle);


    var width = 800;
    $(divId).html("");
    var svg = d3.select(divId).append("svg").attr("width", width)
      .datum(visibleData).call(chart);
    $("[id^='timelineItem']").each(function() {
      addDataPointToolTip($(this));
    });
    $("[id^='timelineItem']").each(function() {
      $(this).attr("height", 6);
      $(this).attr("r", 6);
      $(this).on("mouseover", function() {
          $(this).attr("r", 8);
          $(this).attr("height", 8);
      });
      $(this).on("mouseout", function() {
          $(this).attr("r", 6);
          $(this).attr("height", 6);
      });
    });
    $(".timeline-label").each(function() {
      addTrackTooltip($(this), data);
    });
    svg.attr("height", parseInt(svg.attr("height")) + 15);
    svg.insert("text")
      .attr("transform", "translate(0, 15)")
      .attr("class", "timeline-label")
      .text("Time since diagnosis");
    svg.insert("text")
      .attr("transform", "translate(0,"+(d3.select("svg").attr("height"))+")")
      .attr("class", "timeline-label")
      .text("Add track")
      .attr("id", "addtrack");
    addNewTrackTooltip($("#addtrack"));
    d3.select(".axis").attr("transform", "translate(0,20)");
  }

  function getClinicalAttributes(data, track) {
    return _.union.apply(_, data.filter(function(x) {
      return x.label === track;
    })[0].times.map(function(x) {
      return x.tooltip.map(function(y) {
        return y[0];
      });
    }));
  }

  function colorByClinicalAttribute(track, attr) {
    var g = _.groupBy(allData.filter(function(x) {return x.label === track;})[0].times, function(x) {
      return _.reduce(x.tooltip, function(a,b) {
        a[b[0]] = b[1];
        return a;
      }, {})[attr];
    });
    Object.keys(g).forEach(function(k) {
      g[k].forEach(function(x) {
        x.color = colorCycle(k);
      });
    });
  }

  function clearColors(track) {
    var times = allData.filter(function(x) {return x.label === track;})[0].times;
    for (var i=0; i < times.length; i++) {
      if ("color" in times[i]) {
        delete times[i].color;
      }
    }
  }

  function createDataTable(elem) {
    var d = elem.prop("__data__");
    dataTable = {
                    "dom": 'C<"clear">lfrtip',
                    "sDom": 't',
                    "bJQueryUI": true,
                    "bDestroy": true,
                    "aaData": d.tooltip,
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
                    "aaSorting": [[0,'asc']],
                    "oLanguage": {
                        "sInfo": "&nbsp;&nbsp;(_START_ to _END_ of _TOTAL_)&nbsp;&nbsp;",
                        "sInfoFiltered": "",
                        "sLengthMenu": "Show _MENU_ per page"
                    },
                    "iDisplayLength": -1
                };
    return dataTable;
  }

  function addDataPointToolTip(elem) {
       elem.qtip({
              content: {
                  text: "table"
              },
              events: {
                  render: function(event, api) {
                      $(this).html("<table style='background-color: white;'></table>");
                      $(this).find("table").dataTable(createDataTable(elem));
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
              show: {event: "click mouseover"},
              hide: {event: "click mouseleave"},
              style: { classes: 'qtip-light qtip-rounded qtip-wide' },
              position: {my:'top middle',at:'bottom middle',viewport: $(window)},
          }); 
  }

  function toggleTrackVisibility(trackName) {
    $.each(allData, function(i, x) {
      if (x.label == trackName) {
        x.visible = x.visible? false : true;
      }
     });
     timeline(allData, "#clinicalTimeline");
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

  function addColorByTooltip(elem, track) {
    elem.qtip({
      content: {
        text: 'color by'
      },
      events: {
        render: function(event, api) {
          var colorByAttribute = $.parseHTML("<div class='color-by-attr-tooltip'></div>");
          var clinAtts = getClinicalAttributes(allData, track);
          for (var i=0; i < clinAtts.length; i++) {
            var a = $.parseHTML("<a href='#' onClick='return false'>"+clinAtts[i]+"</a>");
            $(a).on("click", function() {
              colorByClinicalAttribute(track, $(this).prop("innerHTML"));
              clinicalTimeline(allData, "#clinicalTimeline");
            });
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

  

  function addTrackTooltip(elem, data) {
    function hideTrackClickHandler(trackName, data) {
       return function() {
         toggleTrackVisibility(trackName);
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
          $(a).on("click", hideTrackClickHandler(elem.prop("innerHTML"), data));
            
          $(trackTooltip).append(a);
          
          $(trackTooltip).append("<br />");

          var colorBy = $.parseHTML("<a href='#' onClick='return false' class='color-by-attr'>Color by</a>");
          $(trackTooltip).append(colorBy);
          
          var clearColorsA = $.parseHTML("&nbsp;<a href='#' onClick='return false'>Clear</a>");
          $(clearColorsA).on("click", function() {
            clearColors(elem.prop("innerHTML"));
            clinicalTimeline(allData, "#clinicalTimeline");
          });
          $(trackTooltip).append(clearColorsA);

          $(this).html(trackTooltip);
          addColorByTooltip($(colorBy), elem.prop("innerHTML"));
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
      maxDays = getMaxEndingTime(data);
      maxTime = daysToTimeObject(maxDays);
      if (maxTime.y >= 1) {
          for (var i=0; i <= maxTime.y; i++) {
              tickValues.push(i * maxTime.daysPerYear);
          }
      } else if (maxTime.y > 0 || maxTime.m  >= 1) {
          for (var i=0; i <= maxTime.m + (maxTime.y * maxTime.daysPerYear) / maxTime.daysPerMonth; i++) {
              tickValues.push(i * maxTime.daysPerMonth);
          }
      } else {
          for (var i=0; i <= maxDays; i++) {
              tickValues.push(i);
          }
      }
      return tickValues;
  }

  return timeline;
})();
