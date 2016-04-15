/**
 * Created by hen on 3/8/14.
 */
var tip = d3.tip()
    .attr('class', 'd3-tip')
    .offset([-10, 0])
    .html(function(d) {
        if (!isNaN(d.sum)) {
            var str1 = "<strong>Station:</strong> <span style='color:red'>" + d.STATION + "</span><br>";
            var str2 = "<strong>Cumulative:</strong> <span style='color:red'>" + d.sum + "</span><br>";
            var str3 = "<strong>Average:</strong> <span style='color:red'>" + d.avg + "</span><br>"
            return str1 + str2 + str3;
        } else {
            var str1 = "<strong>Station:</strong> <span style='color:red'>" + d.STATION + "</span><br>";
            var str2 = "<strong><span style='color:red'>No data available for this station</span></strong>";
            return str1 + str2;
        }
    })
var customTimeFormat = d3.time.format.multi([
    ["%I %p",
        function(d) {
            return d.getHours();
        }
    ]
]);
var animdur = 1000;
var margin = {
    top: 50,
    right: 50,
    bottom: 50,
    left: 50
};
var active = d3.select(null);

var width = 900 - margin.left - margin.right;
var height = 500 - margin.bottom - margin.top;
var centered;
var bbVis = {
    x: 100,
    y: 10,
    w: width - 100,
    h: 300
};

var ddWidth = 400;
var ddHeight = 120;
var ddVis = {
    x: 50,
    y: 50,
    width: ddWidth - 50,
    height: ddHeight - 20
}

var detailVis = d3.select("#detailVis")
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

var xAxis = d3.svg.axis().scale(x).orient('bottom').ticks(d3.time.hour);
var yAxis = d3.svg.axis().scale(y).orient('right');

detailVis.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(" + 0 + "," + (ddVis.height) + ")")
    .call(xAxis);

detailVis.append('g')
    .attr("class", "y axis")
    .attr("transform", "translate(" + (ddVis.width) + "," + 0 + ")")
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

var canvas = d3.select("#vis")
    .append("svg")
    .attr({
        width: width + margin.left + margin.right,
        height: height + margin.top + margin.bottom
    })

var svg = canvas
    .append("g")
    .attr({
        transform: "translate(" + margin.left + "," + margin.top + ")"
    });
svg.call(tip);


var projection = d3.geo
    .albersUsa()
    .scale(1000)
    .translate([width / 2, height / 2])
    .precision(.1);
var path = d3.geo.path()
    .projection(projection);


var dataSet = {};



function loadStations() {
    d3.csv("../data/NSRDB_StationsMeta.csv", function(error, data) {
        if (error) return console.error(error.message)
        //console.log('Stations', data)
        data.map(function(d, i) {
            var id = d['USAF'];
            if (completeDataSet[id]) {
                var elm = completeDataSet[id];
                d.avg = elm.avg / 10000;
                d.sum = elm.sum;
                d.hourly = elm.hourly;
            } else {
                d.avg = NaN;
                d.sum = NaN;
                d.hourly = null;
            }
        })
        svg.selectAll("circle")
            .data(data)
            .enter()
            .append("circle")
            .attr("class", "station")
            .style("stroke", "gray")
            .style("fill", "black")
            .attr("r", function(d, i) {
                return 1;
            })
            .attr("transform", function(d, i) {
                var lon = d['ISH_LON(dd)'];
                var lat = d['ISH_LAT (dd)'];
                var proj = projection([lon, lat]);
                if (proj !== null) {
                    return "translate(" + proj + ")";
                } else {
                    return "translate(-1000, -1000)";
                }
            })
        svg.selectAll(".station")
            .attr("r", function(d, i) {
                if (!isNaN(d.sum)) {
                    return d.avg;
                } else {
                    return 1;
                }
            })
            .style('fill', function(d, i) {
                if (!isNaN(d.sum)) {
                    return 'blue';
                } else {
                    return 'red';
                }
            })
            .on('mouseover', tip.show)
            .on('mouseout', tip.hide)
            .on('click', showHourlyDetails)

    });
}

function showHourlyDetails(d) {
    var hData = d.hourly;
    //console.log(hData)
    var max = Number.NEGATIVE_INFINITY;
    var min = Number.POSITIVE_INFINITY;
    var minDate, maxDate;
    var aData = [];
    for (key in hData) {
        if (hData[key] > max) {
            max = hData[key];
        }
        if (hData[key] < min) {
            min = hData[key];
        }
        aData.push({
            time: key,
            value: hData[key]
        });
    }
    y.domain(d3.extent(aData, function(elm) {
        return elm.value;
    }))
    yAxis = d3.svg.axis().scale(y).orient('left');

    detailVis.selectAll(".y.axis")
        .transition()
        .call(yAxis)
        .duration(animdur);

    d3.selectAll('rect')
        .transition()
        .style("opacity", 0)
        .remove();

    detailVis.selectAll('.ddBars')
        .data(aData)
        .enter()
        .append('rect')
        .transition()
        .style("opacity", 1)
        .duration(animdur)
        .attr("x", function(elm, i) {
            return i * ddVis.width / 24;
        })
        .attr("y", function(elm, i) {
            return y(elm.value);
        })
        .attr("width", function(elm, i) {
            return ddVis.width / 24 - 1;
        })
        .attr("height", function(elm, i) {
            return y(max - elm.value);
        })

};

function loadStats() {

    d3.json("../data/reducedMonthStationHour2003_2004.json", function(error, data) {
        if (error) return console.error(error.message)
        completeDataSet = data;
        //console.log(completeDataSet)
        loadStations();
    })

}


d3.json("../data/us-named.json", function(error, data) {
    if (error) return console.error(error.message)
    var usMap = topojson.feature(data, data.objects.states).features
    var usMapCounties = topojson.feature(data, data.objects.counties).features
    //console.log(usMap);

    svg.selectAll(".state")
        .data(usMap)
        .enter()
        .append("path")
        .attr("class", "state")
        .attr("d", path)
        .on("click", clicked);
    // svg.selectAll(".county")
    //     .data(usMapCounties)
    //     .enter()
    //     .append("path")
    //     .attr("class", "county")
    //     .attr("d", path)
    //     .attr("stroke-width", 0.1)

    loadStats();
});

function clicked(d) {
    if (active.node() === this) return reset();
    active.classed("active", false);
    active = d3.select(this).classed("active", true);

    var bounds = path.bounds(d),
        dx = bounds[1][0] - bounds[0][0],
        dy = bounds[1][1] - bounds[0][1],
        x = (bounds[0][0] + bounds[1][0]) / 2,
        y = (bounds[0][1] + bounds[1][1]) / 2,
        scale = .9 / Math.max(dx / width, dy / height),
        translate = [width / 2 - scale * x, height / 2 - scale * y];

    svg.transition()
        .duration(animdur)
        .style("stroke-width", 1.5 / scale + "px")
        .attr("transform", "translate(" + translate + ")scale(" + scale + ")");
    tip.attr("transform", "translate(" + translate + ")scale(" + scale + ")");
    svg.call(tip);
}

function reset() {
    active.classed("active", false);
    active = d3.select(null);

    svg.transition()
        .duration(animdur)
        .style("stroke-width", "0.1px")
        .attr({
            transform: "translate(" + margin.left + "," + margin.top + ")"
        });
}
