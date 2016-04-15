var margin = {
    top: 50,
    right: 50,
    bottom: 50,
    left: 50
};

var width = 960 - margin.left - margin.right;
var height = 700 - margin.bottom - margin.top;
var active = d3.select(null);



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


var ddWidth = 400;
var ddHeight = 700;
var ddVis = {
    x: 50,
    y: 50,
    width: ddWidth - 50,
    height: ddHeight - 520
}

var tip = d3.tip()
    .attr('class', 'd3-tip')
    .offset([-10, 0])
    .html(function(d, i) {
        var str1 = "<strong><span>" + d.isoEngName + "</span></strong><br>";
        var str2 = "<strong><span style='color:red'>" + d.properties.value + "</span></strong><br>";
        var flag = '<img width="64" height="32" src="http://api.tinata.co.uk/countries/' + d.iso2 + '/flag.svg"><br>';
        var flag = '<img width="64" height="32" src="../img/flags/' + d.iso2.toLowerCase() + '.svg"><br>';;
        return str1 + flag;
    })
var svg = d3.select("#vis")
    .append("svg")
    .attr({
        width: width + margin.left + margin.right,
        height: height + margin.top + margin.bottom
    })
    .append("g")
    .attr({
        transform: "translate(" + margin.left + "," + margin.top + ")"
    })
    .call(tip);

var detailVis = d3.select("#textLabel")
    .append("svg")
    .attr({
        width: ddWidth,
        height: ddHeight
    })
var d1 = new Date("July 21, 1983 00:00:01");
var d2 = new Date("July 21, 1983 23:59:59");
var x = d3.time.scale().range([0, ddVis.width]);
x.domain([d1, d2]);
var y = d3.scale
    .linear()
    .range([ddVis.height, 0]);

var xAxis = d3.svg.axis().scale(x).orient('bottom').ticks(d3.time.year);
var yAxis = d3.svg.axis().scale(y).orient('right');

detailVis.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(" + 10 + "," + (ddVis.height + margin.top) + ")")
    .call(xAxis);

detailVis.append('g')
    .attr("class", "y axis")
    .attr("transform", "translate(" + (ddVis.width + 10) + "," + (margin.top) + ")")
    .call(yAxis);

var tmpArray = new Array(24);
detailVis.selectAll('.ddBars')
    .data(tmpArray)
    .enter()
    .append('rect')
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", 0)
    .attr("height", 0)

// --- this is just for fun.. play arround with it iof you like :)
var projectionMethods = [{
    name: "mercator",
    method: d3.geo.mercator().translate([width / 2, height / 2]) //.precision(.1);
}, {
    name: "equiRect",
    method: d3.geo.equirectangular().translate([width / 2, height / 2]) //.precision(.1);
}, {
    name: "stereo",
    method: d3.geo.stereographic().translate([width / 2, height / 2]) //.precision(.1);
}, {
    name: "ortho",
    method: d3.geo.orthographic()
        .scale(config.initialScale)
        .translate([width / 2, height / 2])
        .rotate(config.globeDefaultRotation)
        .clipAngle(90)
}];
// --- this is just for fun.. play arround with it iof you like :)


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

// just for fun 
var textLabel = svg.append("text").text(projectionMethods[actualProjectionMethod].name).attr({
    "transform": "translate(-40,-30)"
})
d3.select("#visuals")
    .append("button")
    .attr('class', 'pure-button')
    .style('position', 'absolute')
    .style('margin-top', -bbVis.w + 'px')
    .style('margin-left', '0px')
    .text("Change Projection")
    .on({
        "click": changePro
    });
d3.select("#visuals")
    .append("button")
    .attr('class', 'pure-button')
    .style('position', 'absolute')
    .style('margin-top', -bbVis.w + 'px')
    .style('margin-left', '150px')
    .text("Change ColorMap")
    .on({
        "click": changeColormaps
    });
// very cool queue function to make multiple calls.. 
// see 
queue()
    .defer(d3.csv, "../data/worldBank_indicators.csv")
    .defer(d3.json, "../data/world_data.json")
    .defer(d3.json, "../data/iso_codes.json")
    .await(initVis);

function changeColormaps(e) {
    k++
    var ind = colorMAPS.length;
    console.log(ind)
    var m = k % ind;
    color = colorMAPS[m];
    if (m === 2) {
        console.log('map2')
        d3.selectAll('.country')
            .transition()
            .style('stroke', 'lightblue')
            .duration(750)
    } else if (m === 1) {
        console.log('map1')
        d3.selectAll('.country')
            .transition()
            .style('stroke', 'lightblue')
            .duration(750)
    } else if (m === 0) {
        console.log('default')
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
    var url = "http://api.worldbank.org/countries/" + countr + "/indicators/" + indicatorString + "?format=jsonP&prefix=Getdata&per_page=500&date=" + d;
    //console.log(url)
    $.ajax({
        url: url, //do something here
        jsonpCallback: 'getdata',
        dataType: 'jsonp',
        success: function(data, status) {
            if (countries) {
                handleDetails(data);
            } else {
                handle(data);
            }
        }
    });
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
    var initYear = 1970;
    ISO_DATA = isoCodes;
    indicators.forEach(function(d, i) {
        $("#selector").append('<option value=' + d.IndicatorCode + '>' + d.IndicatorName + '</option>');
        if (i > 1254) {
            $("#selectorYear").append('<option value=' + initYear + '>' + initYear + '</option>');
            initYear++;
        }
    })

    //console.log(world, 'world');
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
            //console.log(e)
            // detailVis.selectAll('.country_info').remove();
            // detailVis.append("text")
            //     .attr("class", "country_info")
            //     .attr("text-anchor", "end")
            //     .attr("x", 150)
            //     .attr("y", 100)
            //     .style('font-size', '10px')
            //     .text(function() {
            //         return e.properties.name
            //     })

            tip.show(e);
        })
        .on('mouseout', tip.hide)
        .on("click", clicked);
    runAQueryOn($("#selector option:selected").val(), $("#selectorYear option:selected").val());
}

function changePro() {
    d3.select("#vis")
        .on("mousedown", null)
        .on("mousemove", null)
        .on("mouseup", null)
    actualProjectionMethod = (actualProjectionMethod + 1) % (projectionMethods.length);
    var name = projectionMethods[actualProjectionMethod].name;
    textLabel.text(name);
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

    detailDataSet.data = theData[1];
    var animdur = 750;
    detailVis
        .transition()
        .style("opacity", 1)
        .duration(100);
    var aData = detailDataSet.data;
    var max = d3.max(detailDataSet.data, function(elm) {
        return parseFloat(elm.value);
    })
    x.domain(d3.extent(detailDataSet.data, function(elm) {
        return new Date(elm.date);
    }))
    var str = detailDataSet.data[0].indicator.value;
    var ind = str.indexOf('(');
    var str2 = str.substring(ind, str.length);
    y.domain(d3.extent(detailDataSet.data, function(elm) {
        //console.log(elm.indicator.value)
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
        })
        .attr("y", function(elm, i) {
            var vv = parseFloat(elm.value);
            var v = y(vv);
            if (!isNaN(v)) {
                return v;
            }
        })
        .attr("width", function(elm, i) {
            return barWidth;
        })
        .attr("height", function(elm, i) {
            var vv = parseFloat(max - elm.value);
            var v = y(vv);
            if (!isNaN(v)) {
                return v;
            }
        })
        .attr("transform", "translate(" + 10 + "," + margin.top + ")")
    var top15 = topoWorld.slice(0, 15);
    top15.sort(function(a, b) {
        return parseFloat(b.properties.value) - parseFloat(a.properties.value);
    })
    detailVis.append('g')
        .selectAll('.compare')
        .data(top15)
        .enter()
        .append('rect')
        .attr("x", function(d, i) {
            return margin.left;
        })
        .attr("y", function(d, i) {
            return ddVis.height + 2 * margin.top + 80 + i * 9;
        })
        .attr("width", function(d, i) {
            //only top 15 with respect to current metric
            var val = parseFloat(d.properties.value) || 0;
            var somrange = d3.extent(topoWorld, function(el, j) {
                return parseFloat(el.properties.value);
            });
            val = map_range(val, somrange[0], somrange[1], 0, ddVis.width - 200);
            if (val > 0) {
                return val;
            } else {
                return 0;
            }
        })
        .attr("height", function(d, i) {
            return 8;
        })
        .style("fill", function(el, i) {
            var d = detailDataSet.data[0];
            if (el.properties.name.toLowerCase() === d.country.value.toLowerCase()) {
                return 'red';
            } else if (el.properties.name.substring(0, 12).toLowerCase() === d.country.value.substring(0, 12).toLowerCase()) {
                return 'red';
            } else {
                var CLR = d3.scale.linear()
                    .interpolate(d3.interpolateRgb)
                    .range(["red", "silver"])
                return CLR()
            }
        })
    // .append("text")
    // .attr("text-anchor", "end")
    // .attr("x", margin.left)
    // .attr("y", function(d, i) {
    //     return ddVis.height + 2 * margin.top + i * 2;
    // })
    // .style('font-size', '50px')
    // .text(function(d) {
    //     console.log(d)
    //     return 'd.properties.name'
    // })
}

function clicked(d) {
    if (active.node() === this) return reset();
    active.classed("active", false);
    active = d3.select(this).classed("active", true);
    tip.hide(d);
    svg.selectAll(".country")
        .on('mouseover', null)
        .on('mouseout', null)
    var selVal = $("#selector option:selected").val();
    var selValYear = $("#selectorYear option:selected").val();
    var dQuery = [selValYear, new Date().getFullYear()];
    runAQueryOn(selVal, dQuery, [d.id]);
    buildCountryInfo(d);


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
    //tip.attr("transform", "translate(" + translate + ")scale(" + scale + ")");
};

function buildCountryInfo(d) {
    //console.log(e)
    detailVis.selectAll('.country_info').remove();
    appendCountryInfoTextElement('Country: ' + d.properties.name, ddVis.height + 2 * margin.top + 50)
    console.log(d)
    appendCountryInfoTextElement('ISO2 Code: ' + d.iso2, ddVis.height + 2 * margin.top + 80)
    appendCountryInfoTextElement('ISO3 Code: ' + d.iso3, ddVis.height + 2 * margin.top + 110)
    appendCountryInfoTextElement(d.indicator.value, ddVis.height + 2 * margin.top, 50)
    appendCountryInfoTextElement(d.properties.value, ddVis.height + 2 * margin.top + 170)
    appendCountryInfoTextElement(d.indicator.value, ddVis.height + 2 * margin.top, 50)
    appendCountryInfoTextElement('Ranking (in red if in top 15)', ddVis.height + 2 * margin.top + 70, 50)
    appendCountryInfoTextElement('from: ' + d.properties.year + ' to 2012', ddVis.height + 2 * margin.top + 20, 50)

}

function appendCountryInfoTextElement(infoText, y, x) {
    detailVis.append("text")
        .attr("class", "country_info")
        .attr("text-anchor", "start")
        .attr("x", x || 250)
        .attr("y", y)
        .style('font-size', '14px')
        .text(function() {
            return infoText
        })
}

function reset() {
    active.classed("active", false);
    active = d3.select(null);
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
