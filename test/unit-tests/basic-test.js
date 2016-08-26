var expect = require('chai').expect;

global.clinicalTimelineUtil = require('../../js/plugins/util.js');
global.clinicalTimelinePlugin = require('../../js/plugins/pluginPrototype.js');
var clinicalTimeline = require('../../js/clinicalTimeline.js');
var oldConsoleLog = null;
/**
 * Disable the logger to prevent any console.log from clinicalTimeline
 */
var disableLogger = function() {
  oldConsoleLog = console.log;
  console.log = function() {};
};
/**
 * Enables the logger back
 */
var enableLogger =  function() {
  if(oldConsoleLog === null)
    return;
  console.log = oldConsoleLog;
};

describe('clinicalTimeline', function() {
  it('should exist', function() {
    expect(clinicalTimeline).to.not.be.undefined;
  });
});

describe('clinicalTimeline.getTrack', function() {
  it('should return the track Status when requesting track Status', function() {
    var getTrack = clinicalTimeline().__tests__.getTrack;
    var data1 = require('../data/data1.json');
    expect("Status").to.equal(getTrack(data1, "Status").label);
  });
});

describe('clinicalTimeline.daysToTimeObject', function() {
  it('should return time object with year, months and days', function() {
    var daysToTimeObject = clinicalTimeline().daysToTimeObject;
    var data1 = JSON.stringify({daysPerYear : 365, daysPerMonth :30, y : 0, m : 0, d : 25});
    var data2 = JSON.stringify({daysPerYear : 365, daysPerMonth :30, y : 0, m : 4, d : 22});
    var data3 = JSON.stringify({daysPerYear : 365, daysPerMonth :30, y : 1, m : 1, d : 5});

    expect(data1).to.equal(JSON.stringify(daysToTimeObject(25)));
    expect(data2).to.equal(JSON.stringify(daysToTimeObject(142)));
    expect(data3).to.equal(JSON.stringify(daysToTimeObject(400)));
  });
});

describe('clinicalTimeline.formatTime', function() {
  it('should should properly format the input time', function() {
    var daysToTimeObject = clinicalTimeline().daysToTimeObject;
    var formatTime = clinicalTimeline().formatTime;

     expect("0").to.equal(formatTime(daysToTimeObject(0), "days"));
     expect("0").to.equal(formatTime(daysToTimeObject(0), "3days"));
     expect("0").to.equal(formatTime(daysToTimeObject(0), "10days"));
     expect("0").to.equal(formatTime(daysToTimeObject(0), "months"));
     expect("0").to.equal(formatTime(daysToTimeObject(0), "years"));

     expect("10d").to.equal(formatTime(daysToTimeObject(10), "days"));
     expect("10d").to.equal(formatTime(daysToTimeObject(10), "3days"));
     expect("10d").to.equal(formatTime(daysToTimeObject(10), "10days"));
     expect("610d").to.equal(formatTime(daysToTimeObject(610), "days"));
     expect("610d").to.equal(formatTime(daysToTimeObject(610), "3days"));
     expect("610d").to.equal(formatTime(daysToTimeObject(610), "10days"));

     expect("0m").to.equal(formatTime(daysToTimeObject(10), "months"));
     expect("20m").to.equal(formatTime(daysToTimeObject(610), "months"));

     expect("0y").to.equal(formatTime(daysToTimeObject(10), "years"));
     expect("1y").to.equal(formatTime(daysToTimeObject(610), "years"));
    disableLogger();
     expect(0).to.equal(formatTime(daysToTimeObject(0), "randomZoomLevel").length);
     expect(0).to.equal(formatTime(daysToTimeObject(10), "randomZoomLevel").length);
    enableLogger();
  });
});

describe('clinicalTimeline.roundDown', function() {
  it('should round down a number to it\'s nearest multiple', function() {
     var roundDown = clinicalTimelineUtil.roundDown;
     expect(10).to.equal(roundDown(12.4, 5));
     expect(-15).to.equal(roundDown(-12.4, 5));
     expect(0).to.equal(roundDown(0.1, 2));
     expect(-2).to.equal(roundDown(-0.1, 2));
     expect(20).to.equal(roundDown(20, 10));
     expect(-20).to.equal(roundDown(-20, 10));
  });
});

describe('clinicalTimeline.roundUp', function() {
  it('should round up a number to it\'s nearest multiple', function() {
    var roundUp = clinicalTimelineUtil.roundUp;
     expect(15).to.equal(roundUp(12.4, 5));
     expect(-10).to.equal(roundUp(-12.4, 5));
     expect(2).to.equal(roundUp(0.1, 2));
     expect(0).to.equal(roundUp(-0.1, 2));
     expect(20).to.equal(roundUp(20, 10));
     expect(-20).to.equal(roundUp(-20, 10));
  });
});

describe('clinicalTimeline()', function() {
  it('should not replace previously defined timelines for each call', function() {
    var data1 = require('../data/data1.json');
    var t1 = clinicalTimeline().data(data1).divId("#t1");
    var t2 = clinicalTimeline().data(data1).divId("#t2");
    expect(t1.divId()).to.not.equal(t2.divId())
  })
})
