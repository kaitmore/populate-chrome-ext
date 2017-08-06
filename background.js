$(function () {

  //initial query
  query(draw)

  $("#reset").hide()

  //listen for submit, grab search data and query for it
  $("#search-form").submit(function (e) {
    e.preventDefault()
    var searchTerm = $("#search-input").val()
    $("div.tooltip").remove()
    setTimeout(function () {
      $("#reset").show()
    }, 700)
    console.log(searchTerm)
    //if we're on list view
    if (document.getElementsByTagName("ul").length)
    { query(listView, searchTerm) }
    else { query(draw, searchTerm) }
  })

  //redraw all items
  $("#reset").click(function () {
    $(this).hide()
    $("#search-input").val('');
    $("div.tooltip").remove()
    if (document.getElementsByTagName("ul").length) query(listView)
    else query(draw)
  })

  //switch to list view
  $("#list-view").click(function () {
    $("div.tooltip").remove()
    $("svg").remove()
    $("#list-view").prop("disabled", true);
    $("#graph").prop("disabled", false);
    var searchTerm = $("#search-input").val()
    console.log(searchTerm)
    searchTerm.length ? query(listView, searchTerm) : query(listView)

  })

  //switch back to graph view
  $("#graph").click(function () {
    $(".list-container").remove();
    $("#graph").prop("disabled", true);
    $("#list-view").prop("disabled", false);
    $("body").append("<svg> </svg>")
    var searchTerm = $("#search-input").val()
    searchTerm.length ? query(draw, searchTerm) : query(draw)
  })

})


function listView(items) {
  $("div.list-container").remove()
  //set up the DOM
  $("body")
    .append("<div class='list-container'></div>")
  $(".list-container")
    .append("<ul></ul>")
  $("ul")
    .addClass("list-items")
    .append("<li class ='title'></li>")
  $('.title')
    .html('Top 10 Visited in category:  <span>Visit Count</span>')

  //sort items based on visit count and grab top 10
  items = items.sort((a, b) => {
    return a.visitCount > b.visitCount ? -1 : 1;
  }).filter((node) => {
    return node.title !== '' && node.url.substring(7, 12) !== 'local'
  })
    .slice(0, 10)

  //loop through each sorted item and append to DOM
  $.each(items, function (i, site) {

    var item = $('<li>')
    var contents = '<a href="' + site.url + '">' + site.title + "</a>" + "<span>" +
      site.visitCount + "</span>";
    item
      .html(contents)
      .appendTo($(".list-items"));

  });
}


function query(callback, searchTerm = '') {
  //set start time to the past 7 days
  let startTime = Date.now() - 604800000;

  chrome.history.search({
    text: searchTerm,
    startTime: startTime,
    maxResults: 0
  }, function (items) {
    callback(items)
  })
}

function draw(items) {

  var height = $(window).height();
  width = $(window).width();

  var viz = d3
    .select("svg")
    .attr('id', 'viz')
    .attr('height', height)
    .attr('width', width);

  var div = d3
    .select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

  items = items.sort((a, b) => {
    return a.visitCount > b.visitCount ? -1 : 1;
  }).slice(0, 150)

  var max = d3.max(items, function (d) {
    return d.visitCount
  })

  function compress(arr, max, range) {
    var hardMax = 100;
    var softMax = 50;
    var compressedVals = []
    var xtra = max - softMax;

    for (var i = 0; i < arr.length; i++) {
      let obj = Object.assign({}, arr[i]);
      if (arr[i].visitCount > softMax) {
        obj.radius = softMax + (hardMax - softMax) * (parseFloat(arr[i].visitCount - softMax) / xtra)
        compressedVals.push(obj);
      } else {
        obj.radius = obj.visitCount
        compressedVals.push(obj);
      }
    }
    return compressedVals
  };

  var compressedItems = compress(items, max);

  var nodes = compressedItems.filter((node) => {
    return node.title !== '' && node.title.substr(0, 5) !== 'local'
  })

  nodes = nodes.map(function (d) {
    return {
      title: d.title,
      radius: d.radius,
      visitCount: d.visitCount,
      lastVisitTime: d.lastVisitTime,
      url: d.url
    }

  })
  console.log(_);
  var newScaledData = [];
  var minDataPoint = d3.min(nodes, function (d) { return d.radius });
  var maxDataPoint = d3.max(nodes, function (d) { return d.radius });

  var linearScale = d3.scaleLinear()
    .domain([minDataPoint, maxDataPoint])
    .range([5, 100]);

  for (var i = 0; i < nodes.length; i++) {
    newScaledData[i] = Object.assign({}, nodes[i]);
    newScaledData[i].radius = linearScale(nodes[i].radius);
  }

  var color = d3.scaleOrdinal(d3.schemeCategory20c);

  var simulation = d3.forceSimulation(newScaledData)
    .force('charge', d3.forceManyBody().strength(-1))
    .force('center', d3.forceCenter(width / 2 + 50, height - 300))
    .force('collision', d3.forceCollide().radius(function (d) {
      return d.radius + 2
    }))
    .on('tick', ticked);

  function ticked() {

    var u = d3.select('svg')
      .selectAll('circle')
      .data(newScaledData)

    u.enter()
      .append('circle')
      .attr("class", "circle")
      .attr('index', function (d) {
        return d.index
      })
      .merge(u)
      .attr('r', function (d) {
        return d.radius
      })
      .attr('cx', function (d) {
        return d.x = Math.max(d.radius, Math.min(width - d.radius, d.x));
      })
      .attr('cy', function (d) {
        return d.y = Math.max(d.radius, Math.min(height - d.radius, d.y));
      })
      .attr('fill', function (d) {
        return color(d.visitCount)
      })
      .style('stroke', "white")
      .style("stroke-width", 2)


    u.on("mouseover", function (d, i) {

      var cut = function (string) {
        return string.length < 40 ? string : string.substr(0, 25) + "..."
      }

      var dot = d3.select(this)
      dot.style("stroke-width", 4)
      div.transition()
        .duration(300)
        .style("opacity", .9)
        .style("visibility", "visible");
      div.html(cut(d.title) +
        "<br/> - <br/> Visit Count: " +
        d.visitCount)
        .style("left", (d3.event.pageX) + "px")
        .style("top", (d3.event.pageY) + "px");

    })

    u.on("mouseout", function (d, i) {
      div.style("visibility", "hidden");
      var dot = d3.select(this)
      dot.style("stroke-width", 2)
    });

    u.exit().remove()
  }
}