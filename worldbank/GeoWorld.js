/*
WorldBank API endpoints
https://api.worldbank.org/v2/sources
https://api.worldbank.org/indicator/UIS.SR.2.GPV.GLAST.CP.F?format=json

*/

var margin = {
  top: 50,
  right: 50,
  bottom: 50,
  left: 50
};

var width = $("#world_map_container").width() - margin.left - margin.right;
var height = 500 - margin.bottom - margin.top;
var active = d3.select(null);

var WORLDBANK_INDICATORS;

var bbVis = {
  x: 100,
  y: 10,
  w: width - 100,
  h: 300
};

var dataSet = {};
var detailDataSet = {};
var config = {
  initialScale: 300,
  globeDefaultRotation: [0, -10, 0],
}


var projection = groupPaths = null;

var m0 = o0 = null;

var currentRotation = config.globeDefaultRotation;

var currentLevel = 1;
var topoWorld;
var ISO_DATA;
var manualRotationActivated = false;

var ddHeight = 250 - margin.bottom - margin.top;
var ddVis = {
  x: 100,
  y: 10,
  width: width - 100,
  height: 100
}

var getUnitOfIndicator = function(indicator) {
  if (indicator) {
    var t = indicator.value.split(" ");
    var unitString = t[t.length - 1];
    if (unitString.indexOf('(') > -1) {
      return unitString.replace("(", '' ).replace(")", '' );
    }
  }
  return '';
};

var tip = d3.tip()
.attr('class', 'd3-tip')
.offset([-1, 0])
.html(function(d, i) {
  var unit = getUnitOfIndicator(d.indicator);
  var str1 = "<strong><span>" + d.isoEngName + "</span></strong><br>";
  var str2;
  if (d.properties.value) {
    str2 = "<strong><span style='color:red'>" + d.properties.value + " " + unit + "</span></strong><br>";
  } else {
    str2 = "<strong><span style='color:red'>no data</span></strong><br>";
  }
  var flag = '<img width="64" height="32" src="../img/flags/' + d.iso2.toLowerCase() + '.svg"><br>';;
  return str1 + flag + str2;
})

var svg = d3.select("#vis").attr({
  width: width + margin.left + margin.right,
  height: height + margin.top + margin.bottom
}).append("g").attr({
  transform: "translate(" + margin.left + "," + margin.top + ")"
}).call(tip);

var detailVis = d3.select("#textLabel").attr({
  width: width + margin.left + margin.right,
  height: ddHeight + margin.top + margin.bottom
});
var d1 = new Date("July 21, 1983 00:00:01");
var d2 = new Date();
var x = d3.time.scale().range([0, ddVis.width]);
x.domain([d1, d2]);
var y = d3.scale
.linear()
.range([ddVis.height, 0]);

var xAxis = d3.svg.axis().scale(x).orient('bottom').ticks(d3.time.year);
var yAxis = d3.svg.axis().scale(y).orient('right');

detailVis.append("g")
.attr("class", "x axis")
.attr("transform", "translate(" + margin.left + "," + (ddVis.height + margin.top) + ")")
.call(xAxis);

detailVis.append('g')
.attr("class", "y axis")
.attr("transform", "translate(" + (ddVis.width + margin.left) + "," + (margin.top) + ")")
.call(yAxis);

var tmpArray = new Array(24).fill(0);
detailVis.selectAll('.ddBars')
  .data(tmpArray)
  .enter()
  .append('rect')
  .attr("x", 0)
  .attr("y", 0)
  .attr("width", 0)
  .attr("height", 0)

var projectionMethods = [{
  name: "equiRect",
  method: d3.geo.equirectangular().translate([width / 2, height / 2]).precision(.1)
},{
  name: "mercator",
  method: d3.geo.mercator().translate([width / 2, height / 2]).precision(.1)
}, {
  name: "stereo",
  method: d3.geo.stereographic().translate([width / 2, height / 2]).precision(.1)
}, {
  name: "ortho",
  method: d3.geo.orthographic().scale(config.initialScale).translate([width / 2, height / 2]).rotate(config.globeDefaultRotation).clipAngle(90)
}];


var actualProjectionMethod = 0;
var colorMin = colorbrewer.Greens[3][0];
var colorMax = colorbrewer.Greens[3][2];
var color1 = d3.scale.quantize().range(colorbrewer.Greens[9]);
var color2 = d3.scale.linear().range([colorMin, colorMax]);
var color3 = d3.scale.linear()
  .interpolate(d3.interpolateRgb)
  .range(["#47ff00", "#ff5a00"])

var colorMAPS = [color1, color2, color3];
var k = 0;
var color = colorMAPS[k];


var legend = svg.append("g")
.attr("class", "legend")
.attr("x", width - 65)
.attr("y", 25)
.attr("height", 100)
.attr("width", 100);

legend.selectAll('rect')
.data(color.range())
.enter()
.append("rect")
.attr("x", function(d, i) {
  return 25;
})
.attr("y", function(d, i) {
  return height / 2 + i * 16;
})
.attr("width", 10)
.attr("height", 10)
.style("fill", function(d) {
  return d
})




var path = d3.geo.path().projection(projectionMethods[0].method);
$("#topic").change(function(v) {
  // console.log(v)
  $("#selector").empty();
  var filt = WORLDBANK_INDICATORS[1].filter(function(indicator, i) {
    var t = indicator.topics;
    if (t && t[0] && t[0].value) {
      return indicator.topics[0].value.trim() === $("#topic option:selected").text().trim();
    }
  })
  // console.log(filt);
  filt.forEach(function(indicator, i) {
    $("#selector").append('<option value=' + indicator.id + '>' + indicator.name + '</option>');
  });
  var selVal = $("#selector option:selected").val();
  var selValYear = $("#selectorYear option:selected").val();
  runAQueryOn(selVal, selValYear);
});
$("#selector").change(function() {
  var selVal = $("#selector option:selected").val();
  var selValYear = $("#selectorYear option:selected").val();
  runAQueryOn(selVal, selValYear);
});
$("#selectorYear").change(function() {
  var selVal = $("#selector option:selected").val();
  var selValYear = $("#selectorYear option:selected").val();
  runAQueryOn(selVal, selValYear);
});

var textLabel = svg.append("text").text("Projection method: " + projectionMethods[actualProjectionMethod].name)
  .attr({
    "transform": "translate(-40,-30)"
  })
d3.select("#change_projection_button")
.on({
  "click": changePro
});
d3.select("#change_colormap_button")
.on({
  "click": changeColormaps
});
// very cool queue function to make multiple calls..
// see
queue()
.defer(d3.json, "../data/worldbank_indicators.json")
.defer(d3.json, "../data/world_data.json")
.defer(d3.json, "../data/iso_codes.json")
.await(initVis);

function changeColormaps(e) {
  k++
  var ind = colorMAPS.length;
  // console.log(ind)
  var m = k % ind;
  color = colorMAPS[m];
  if (m === 2) {
    // console.log('map2')
    d3.selectAll('.country')
    .transition()
    .style('stroke', 'lightblue')
    .duration(750)
  } else if (m === 1) {
    // console.log('map1')
    d3.selectAll('.country')
    .transition()
    .style('stroke', 'lightblue')
    .duration(750)
  } else if (m === 0) {
    // console.log('default')
    d3.selectAll('.country')
    .transition()
    .style('stroke', 'black')
    .duration(750)
  }
  legend.selectAll('rect').transition().remove();
  legend.selectAll('rect')
  .data(color.range())
  .enter()
  .append("rect")
  .attr("x", function(d, i) {
    return 25;
  })
  .attr("y", function(d, i) {
    return height / 2 + i * 16;
  })
  .attr("width", 10)
  .attr("height", 10)
  .style("fill", function(d) {
    return d
  })

  runAQueryOn($("#selector option:selected").val(), $("#selectorYear option:selected").val());
}

//ORTHOGRAPHIC HANDLERS

function mouseDown() {
  var animationRequest;
  m0 = [d3.event.pageX, d3.event.pageY];
  o0 = projection.rotate();
  manualRotationActivated = true;
  animationRequest = requestAnimationFrame(rotate);
  return d3.event.preventDefault();
};

function mouseUp() {
  manualRotationActivated = false;
  if (m0) {
    return m0 = null;
  }
};

function mouseMove() {
  var m1, o1;
  if (m0 && currentLevel === 1) {
    m1 = [d3.event.pageX, d3.event.pageY];
    o1 = [o0[0] + (m1[0] - m0[0]) / 6, o0[1] + (m0[1] - m1[1]) / 6];
    o1[1] = (o1[1] > 30 ? 30 : (o1[1] < -30 ? -30 : o1[1]));
    return currentRotation[0] = o1[0];
  }
};

function rotate() {
  var animationRequest;
  if (manualRotationActivated) {
    projection.rotate(currentRotation);
    redrawPathsOnRotationOrScale(currentRotation, projection.scale());
    return animationRequest = requestAnimationFrame(rotate);
  }
};

function redrawPathsOnRotationOrScale(rotation, scale) {
  currentRotation = rotation;
  projection.rotate(currentRotation).scale(scale);
  return svg.selectAll(".country").attr("d", path);
};

//QUERIES

function runAQueryOn(indicatorString, date, countries) {
  var countr;
  if (countries) {
    countr = countries.join(';');
  } else {
    countr = 'all';
  }
  var d;
  if (date instanceof Array && date.length === 2) {
    d = date.join(':');
  } else {
    d = date;
  }
  var url = "https://api.worldbank.org/v2/country/" + countr + "/indicator/" + indicatorString + "?format=json&prefix=Getdata&per_page=500&date=" + d;
    // console.log(url)
    var indicatorUrl = "https://api.worldbank.org/v2/indicator/" + indicatorString + "?format=json"
    $.ajax({
        url: indicatorUrl, //do something here
        dataType: 'json',
        success: function(data, status) {
          // console.log(data[1][0])
          $("#name_of_indicator").html(data[1][0].name);
          $("#description_of_indicator").html(data[1][0].sourceNote);
          $("#source_of_indicator").html(data[1][0].sourceOrganization);
        }
      });
    $.ajax({
        url: url, //do something here
        dataType: 'json',
        success: function(data, status) {
          if (countries) {
            // console.log(data)
            handleDetails(data);
          } else {
            handle(data);
            handleDetailsForAllCountries(data);
          }
        }
      });
  }
  var circle_tip = d3.tip()
  .attr('class', 'd3-tip')
  .offset([-1, 0])
  .html(function(d, i) {
    var unit = getUnitOfIndicator(d.indicator);
    var str1 = "<strong><span>" + d.country.value + "</span></strong><br>";
    var str2;
    if (d.country.value) {
      str2 = "<strong><span style='color:red'>" + d.value + " " + unit + "</span></strong><br>";
    } else {
      str2 = "<strong><span style='color:red'>no data</span></strong><br>";
    }
    return str1 + str2;
  })
  detailVis.call(circle_tip);
  var linearScale = d3.scale.linear()
  var CIRCLE_COLOR_SCALE = d3.scale.category20b()
  function handleDetailsForAllCountries(theData) {
    detailDataSet.data = theData[1].filter(function(e, i) {
      if(e.value !== false || e.value !== null || e.value !== 0 || e.value !== "") {
        return e.value;
      }
    });
    console.log(detailDataSet.data);
    var animdur = 750;
    detailVis
    .transition()
    .style("opacity", 1)
    .duration(100);

    linearScale.domain([0, detailDataSet.data.length])
    .range([0, ddVis.width]);
    CIRCLE_COLOR_SCALE.domain(detailDataSet.data, function(elm) {
      return elm.country.value;
    });
    y.domain(d3.extent(detailDataSet.data, function(elm) {
      return elm.value;
    }))
    xAxis = d3.svg.axis().scale(linearScale).orient('bottom');
    yAxis = d3.svg.axis().scale(y).orient('right');

    detailVis.selectAll(".x.axis")
    .transition()
    .call(xAxis)
    .duration(animdur);

    detailVis.selectAll(".y.axis")
    .transition()
    .call(yAxis)
    .duration(animdur);

    d3.selectAll('circle')
    .transition()
    .style("opacity", 0)
    .remove();

    detailVis.selectAll('.ddBars')
    .data(detailDataSet.data)
    .enter()
    .append('circle')
    .on('mouseover', function(e) {
      circle_tip.show(e)
    })
    .on('mouseout', function(e) {
      circle_tip.hide(e)
    })
    // .on("click", function(e, i) {
      // var d = topoWorld.filter(function(elm) {
      //   return elm.properties.name.toLowerCase() === e.country.value.toLowerCase();
      // })[0];
      // if (d) {
      //   clicked(d);
      // }
    // })
    .transition()
    .style("opacity", 1)
    .duration(animdur)
    .attr("cx", function(elm, i) {
      var dd = new Date(elm.date);
      return linearScale(i)
    }).attr("cy", function(elm, i) {
      var vv = parseFloat(elm.value);
      var v = y(vv);
      if (!isNaN(v)) {
        return v;
      }
    }).attr("r", 5)
    .attr("fill", function(elm, i) {
      return CIRCLE_COLOR_SCALE(elm.country.value);
    })
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
  }

//HANDLES MAIN DATA ON THE MAP

function handle(data) {
  dataSet.data = data[1];
  dataSet.info = data[0];
  dataSet.length = data[0].total;
  ISO_DATA.forEach(function(d, i) {
    topoWorld.forEach(function(el, j) {
      if (el.id.toLowerCase() === d['Alpha-3 code'].toLowerCase()) {
        el.iso3 = d['Alpha-3 code'];
        el.iso2 = d['Alpha-2 code'];
        el.isoNum = d['Numeric code'];
        el.isoEngName = d['English short name lower case'];
      }
    })
  })
  dataSet.data.forEach(function(d, i) {
    topoWorld.forEach(function(el, j) {
      if (el.properties.name.toLowerCase() === d.country.value.toLowerCase()) {
                //console.log(d.indicator, el.iso2)
                el.indicator = d.indicator;
                el.properties.value = d.value;
                el.properties.year = d.date;
              } else if (el.properties.name.substring(0, 12).toLowerCase() === d.country.value.substring(0, 12).toLowerCase()) {
                //console.log(d.country.id, el.iso2)
                el.indicator = d.indicator;
                el.properties.value = d.value;
                el.properties.year = d.date;
              }
            })
  })
  color.domain(d3.extent(topoWorld, function(d) {
    return parseFloat(d.properties.value);
  }))

  svg.selectAll(".country")
  .transition()
  .style("fill", function(d, i) {
    var c = d.properties.value;
    return color(parseFloat(c));

  })
  .duration(1000)
  topoWorld.sort(function(a, b) {
    return b.properties.value - a.properties.value;
  })
}
//INIT STEP THIS RUNS AFTER THE QUEUE is finished queueing

function initVis(error, indicators, world, isoCodes) {
  WORLDBANK_INDICATORS = indicators;
  var topics = {}
  WORLDBANK_INDICATORS[1].forEach(function(indicator, i) {
    var t = indicator.topics;
    // console.log(t)
    if (t && t[0] && t[0].value) {
      topics[t[0].value] = t[0].value;
    }
  });
  Object.values(topics).forEach(function(key) {
    $("#topic").append('<option value=' + key + '>' + key + '</option>');
  })
  var initYear = 2018;
  ISO_DATA = isoCodes;
  var filt = WORLDBANK_INDICATORS[1].filter(function(indicator, i) {
    var t = indicator.topics;
    if (t && t[0] && t[0].value) {
      return indicator.topics[0].value.trim() === $("#topic option:selected").text().trim();
    }
  })
  filt.forEach(function(indicator, i) {
    $("#selector").append('<option value=' + indicator.id + '>' + indicator.name + '</option>');
  });
  new Array(40).fill(0).forEach(function(e, i) {
    $("#selectorYear").append('<option value=' + initYear + '>' + initYear + '</option>');
    initYear--;
  })
  $("#topic").select2({
    width: 'resolve' // need to override the changed default
});
  $("#selector").select2({
    width: 'resolve' // need to override the changed default
});
  $("#selectorYear").select2({
    width: 'resolve' // need to override the changed default
});
    topoWorld = world.features;
    svg.selectAll(".country")
    .data(topoWorld)
    .enter()
    .append("path")
    .attr("class", "country")
    .attr("d", path)
    .style("fill", function(d, i) {
      return color(null);
    })
    .on('mouseover', function(e) {
      tip.show(e);
    })
    .on('mouseout', tip.hide)
    .on("click", clicked);
    // runAQueryOn($("#selector option:selected").val(), $("#selectorYear option:selected").val());
    runAQueryOn($("#selector option:selected").val(), 2014);
  }

  function changePro() {
    d3.select("#vis")
    .on("mousedown", null)
    .on("mousemove", null)
    .on("mouseup", null)
    actualProjectionMethod = (actualProjectionMethod + 1) % (projectionMethods.length);
    var name = projectionMethods[actualProjectionMethod].name;
    textLabel.text("Projection method: " + name);
    projection = projectionMethods[actualProjectionMethod].method;
    path = d3.geo.path().projection(projection);
    svg.selectAll(".country").transition().duration(750).attr("d", path);
    if (name === "ortho") {
      d3.select("#vis").on("mousedown", mouseDown)
      .on("mousemove", mouseMove)
      .on("mouseup", mouseUp)
    }
  };


  function handleDetails(theData) {
    detailDataSet.data = theData[1].filter(function(e, i) {
      return e.date < new Date().getFullYear();
    });
    var animdur = 750;
    detailVis
    .transition()
    .style("opacity", 1)
    .duration(100);
    // var aData = detailDataSet.data;
    var max = d3.max(detailDataSet.data, function(elm) {
      return parseFloat(elm.value);
    })
    x.domain(d3.extent(detailDataSet.data, function(elm) {
      return new Date(elm.date);
    }))
    // var str = detailDataSet.data[0].indicator.value;
    // var ind = str.indexOf('(');
    // var str2 = str.substring(ind, str.length);
    y.domain(d3.extent(detailDataSet.data, function(elm) {
      return parseFloat(max - elm.value);
    }))
    xAxis = d3.svg.axis().scale(x).orient('bottom');
    yAxis = d3.svg.axis().scale(y).orient('right');

    detailVis.selectAll(".x.axis")
    .transition()
    .call(xAxis)
    .duration(animdur);

    detailVis.selectAll(".y.axis")
    .transition()
    .call(yAxis)
    .duration(animdur);

    d3.selectAll('rect')
    .transition()
    .style("opacity", 0)
    .remove();
    var barWidth = ddVis.width / detailDataSet.data.length - 1;

    detailVis.selectAll('.ddBars')
    .data(detailDataSet.data)
    .enter()
    .append('rect')
    .transition()
    .style("opacity", 1)
    .duration(animdur)
    .attr("x", function(elm, i) {
      var dd = new Date(elm.date);
      return x(dd)
    }).attr("y", function(elm, i) {
      var vv = parseFloat(elm.value);
      var v = y(vv);
      if (!isNaN(v)) {
        return v;
      }
    }).attr("width", function(elm, i) {
      return barWidth;
    }).attr("height", function(elm, i) {
      var vv = parseFloat(max - elm.value);
      var v = y(vv);
      if (!isNaN(v)) {
        return v;
      }
    })
    .attr("fill", function(elm, i) {
      var vv = parseFloat(max - elm.value);
      var v = y(vv);
      return color(v)
    })
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
  }

  function clicked(d) {
    if (active.node() === this) {
      return reset();
    }
    active.classed("active", false);
    active = d3.select(this).classed("active", true);
    tip.hide(d);
    svg.selectAll(".country")
    .on('mouseover', null)
    .on('mouseout', null)
    var selVal = $("#selector option:selected").val();
    var selValYear = $("#selectorYear option:selected").val();
    var dQuery = [1980, new Date().getFullYear()];
    runAQueryOn(selVal, dQuery, [d.id]);
    buildCountryInfo(d);
    detailVis
    .selectAll('circle')
    .transition()
    .style("opacity", 0);

    var bounds = path.bounds(d),
    dx = bounds[1][0] - bounds[0][0],
    dy = bounds[1][1] - bounds[0][1],
    x = (bounds[0][0] + bounds[1][0]) / 2,
    y = (bounds[0][1] + bounds[1][1]) / 2,
    scale = .9 / Math.max(dx / width, dy / height),
    translate = [width / 2 - scale * x, height / 2 - scale * y];

    svg.transition()
    .duration(750)
    .style("stroke-width", 1.5 / scale + "px")
    .attr("transform", "translate(" + translate + ")scale(" + scale + ")");
  };

  function buildCountryInfo(d) {
    detailVis.selectAll('.country_info').remove();
    d3.select("#focused_country").html("");
    // console.log(d)
    d3.select("#focused_country").html([
      'Country: ' + d.properties.name,
      'ISO2 Code: ' + d.iso2,
      'ISO3 Code: ' + d.iso3,
      'Value: ' + d.properties.value
    ].join("<br>"))
    var txt = d.indicator.value + ' from ' + d.properties.year + ' to ' + new Date().getFullYear();
    detailVis.append("text")
      .attr("class", "country_info")
      .attr("text-anchor", "start")
      .attr("x", margin.left)
      .attr("y", ddVis.height + margin.top + 50)
      .style('font-size', '14px')
      .text(function() {
        return txt;
      })
  }

  function reset() {
    active.classed("active", false);
    active = d3.select(null);
    // Reinstate the circles
    var animdur = 750;
    detailVis
    .selectAll('circle')
    .transition()
    .style("opacity", 1);
    linearScale.domain([0, detailDataSet.data.length])
    .range([0, ddVis.width]);
    CIRCLE_COLOR_SCALE.domain(detailDataSet.data, function(elm) {
      return elm.country.value;
    });
    y.domain(d3.extent(detailDataSet.data, function(elm) {
      return elm.value;
    }))
    xAxis = d3.svg.axis().scale(linearScale).orient('bottom');
    yAxis = d3.svg.axis().scale(y).orient('right');

    detailVis.selectAll(".x.axis")
    .transition()
    .call(xAxis)
    .duration(animdur);

    detailVis.selectAll(".y.axis")
    .transition()
    .call(yAxis)
    .duration(animdur);


    detailVis
    .selectAll('rect')
    .transition()
    .style("opacity", 0)
    .remove();

    detailVis
    .selectAll('.country_info')
    .transition()
    .style("opacity", 0)
    .remove();

    d3.select("#focused_country").html("");

    svg.selectAll(".country")
    .on('mouseover', function(e) {
      tip.show(e);
    })
    legend.selectAll('rect').transition().remove();
    legend.selectAll('rect')
    .data(color.range())
    .enter()
    .append("rect")
    .attr("x", function(d, i) {
      return 25;
    })
    .attr("y", function(d, i) {
      return height / 2 + i * 16;
    })
    .attr("width", 10)
    .attr("height", 10)
    .style("fill", function(d) {
      return d
    })
    svg.transition()
    .duration(750)
    .style("stroke-width", "1.5px")
    .attr({
      transform: "translate(" + margin.left + "," + margin.top + ")"
    });
  };

  function map_range(value, low1, high1, low2, high2) {
    return low2 + (high2 - low2) * (value - low1) / (high1 - low1);
  }
