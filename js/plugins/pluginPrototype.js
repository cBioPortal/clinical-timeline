function clinicalTimelinePlugin(name, spec){
  this.name = name;
  this.spec = spec || null;
}

clinicalTimelinePlugin.prototype.run = function (timeline, spec) {
  console.log("A plugin must have a run function to be functional");
}

clinicalTimelinePlugin.prototype.remove = function (timeline, spec) {
}

/* start-test-code-not-included-in-build */
module.exports = clinicalTimelinePlugin;
/* end-test-code-not-included-in-build */