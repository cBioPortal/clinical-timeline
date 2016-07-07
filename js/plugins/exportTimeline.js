var clinicalTimelineExporter = function() {
  //adds exporting functionality to the timeline
  return {
    generateSVG :  function () {
      //exports the timeline as SVG
      $("#addtrack").css("visibility","hidden");
      var svg = document.getElementsByClassName("timeline")[0];
      var serializer = new XMLSerializer();
      var source = serializer.serializeToString(svg);
      var link = document.createElement("a");

      //name spaces
      if(!source.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)){
          source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
      }
      if(!source.match(/^<svg[^>]+"http\:\/\/www\.w3\.org\/1999\/xlink"/)){
          source = source.replace(/^<svg/, '<svg xmlns:xlink="http://www.w3.org/1999/xlink"');
      }
      //xml declaration
      source = '<?xml version="1.0" standalone="no"?>\r\n' + source;

      //converting SVG source to URI data scheme.
      var url = "data:image/svg+xml;charset=utf-8,"+encodeURIComponent(source);
      link.download = "clinical-timeline.svg";
      link.href = url;
      link.click();
      $("#addtrack").css("visibility","visible");
    },
    generatePNG : function(download) {
      //exports the timeline as PNG
      $("#addtrack").css("visibility","hidden");
      var svgString = new XMLSerializer().serializeToString(document.querySelector(".timeline"));
      var canvas = document.getElementById("canvas");
      var ctx = canvas.getContext("2d");
      var DOMURL = self.URL || self.webkitURL || self;
      var img = new Image();
      var svg = new Blob([svgString], {type: "image/svg+xml;charset=utf-8"});
      var url = DOMURL.createObjectURL(svg);
      img.onload = function() {
          ctx.drawImage(img, 0, 0);
          var png = canvas.toDataURL("image/png");
          document.querySelector("#png-container").innerHTML = '<img src="'+png+'"/>';
          var link = document.createElement("a");
          link.download = "clinical-timeline.png";
          if (download) {
            link.href = canvas.toDataURL("image/png").replace("image/png", "image/octet-stream");
          }
          link.click();
          DOMURL.revokeObjectURL(png);
          link.remove();
      };
      img.src = url;
      $("#addtrack").css("visibility","visible");
    },
    generatePDF : function() {
      //exports the timeline to PDF
      //to generate a PDF we first need to generate the canvas as done in generatePNG
      //just don't need to download the PNG
      this.generatePNG(false); 
      setTimeout(function(){ 
        html2canvas($("#canvas"), {
             onrendered: function(canvas) { 
              var canvas = document.getElementById("canvas");
              var imgData = canvas.toDataURL(
               'image/png');              
              var doc = new jsPDF('p', 'mm');
              doc.addImage(imgData, 'PNG', 0, 0);
              doc.save('clinical-timeline.pdf');
            }
        });
      }, 50); //wait for 50ms for the canvas to be rendered before saving the PDF
    }
  }
}();

/* start-test-code-not-included-in-build */
module.exports = clinicalTimelineExporter;
/* end-test-code-not-included-in-build */