var stations = []

function parse_stations(raw) {
  var lines = raw.split('\n')

  var objects = []

  var station = {}

  lines.forEach( function (s) {
    r = s.match("^Station ([a-zA-Z0-9:]+)")
    if (r != null) {
      if (station.id != null) objects.push(station)
      station = {}

      station.id = r[1]
    }

    r = s.match("^[ \t]*signal avg:[ \t]+(-?[0-9].+) dBm")
    if (r != null) {
      r = r[1].match("(.*) \\[(.*)\\]")
      station.signal = r[2].split(",").map(function (d) { return d.replace(/ /g,'') })
    }
  })

  objects.push(station)

  return objects
}

function merge_new_stations(o, e) {
  if (o == undefined)
    return e

  e.forEach( function (d, i) {
    o.forEach( function(x) {
      if (x.id != d.id) return

      if (x) {
        for (var key in d)
          if(d.hasOwnProperty(key))
            x[key] = d[key]

        e[i] = x
      }
    })
  })

  e.forEach( update_signal_history )

  return e
}

var BINS = 300

function update_signal_history(station) {
  if (station.history == undefined) 
    station.history = []

  station.signal.forEach( function (d, i) {
    if (station.history[i] == undefined)
      station.history[i] = []

    station.history[i].push(d)

    station.history[i] = station.history[i].slice(-BINS)
  })
}

var dbscale = d3.scale.linear().domain([-90, 0]).range([0, 100])
var historyscale = d3.scale.linear().domain([-90, 0]).range([100, 0])
var colorscale = d3.scale.category10()

var line = d3.svg.line()
    .x(function(d, i) { return i })
    .y(function(d) { return historyscale(d) })

function update() {
  d3.text("/cgi-bin/stations", function(data) {
    stations = merge_new_stations(stations, parse_stations(data))

    var list = d3.select("body > ul")

    var stations_list = list.selectAll("li").data(stations, function (d) { return d.id })

    var li = stations_list.enter().append("li")
    
    stations_list.exit().remove()
    
    li.append("h1")
    li.append("ul").attr("class", "signals")
    li.append("svg").attr("class", "history")
      .attr("width", BINS).attr("height", 100)
    
    stations_list.select("h1")
            .text(function (d) { return d.id } )

    var signals = stations_list.select(".signals").selectAll("li")
                   .data(function (d) { return d.signal })
 
    var signal_enter = signals.enter().append("li")

    var svg = signal_enter.append("svg").attr("width", 100).attr("height", 20)
    svg.append("rect").attr("x", 0).attr("y", 0).attr("height", 20).attr("class", "signal")
    .attr("fill", function (d, i) { return colorscale(i) })
    signal_enter.append("label")

    signals.exit().remove()

    signals.select("label").text(function (d) { return d })
    signals.select("rect.signal").attr("width", function (d) { return dbscale(d) })


    var history = stations_list.select("svg.history").selectAll("path")
                               .data(function (d) { return d.history })

    history_enter = history.enter().append("path")
                    .attr("class", "line")
                    .attr("stroke", function (d, i) { return colorscale(i) })
                    .attr("fill", "none")

    history.datum(function (d) { return d })
           .attr("d", line)
  
  })
}

d3.select("body").append("ul")

update()

var timer = window.setInterval(update, 100)

