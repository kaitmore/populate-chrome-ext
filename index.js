function getItems() {
  let storedSites = JSON.parse(localStorage.getItem("populate")) || {};
  let items = Object.keys(storedSites)
    .filter(key => !key.startsWith("_"))
    .map(site => {
      return { url: site, time: storedSites[site] };
    })
    .sort((a, b) => {
      return a.time > b.time ? -1 : 1;
    })
    .slice(0, 100);
  return items;
}

let graphView = true;

// redraw when tab is activated
chrome.tabs.onActivated.addListener(function(x) {
  chrome.tabs.get(x.tabId, function(active) {
    if (active.url === "chrome://newtab/" && graphView) {
      draw(getItems());
    } else if (active.url === "chrome://newtab/") {
      listView(getItems());
    }
  });
});

$(function() {
  // hide and disable buttons for first query
  $("#reset").hide();
  $("#graph").prop("disabled", true);
  $("div.tooltip").remove();

  var searchTerm = $("#search-input").val();
  if (!getItems().length) {
    $("body").append("<div id='error'>Start surfin' to see results 🏄‍</div>");
  } else {
    draw(getItems());
  }

  //listen for submit, grab search data and query for it
  $("#search-form").on("input", function(e) {
    e.preventDefault();
    searchTerm = $("#search-input").val();
    $("div.tooltip").remove();
    setTimeout(function() {
      $("#reset").show();
    }, 700);

    let filteredItems = getItems().filter(site =>
      site.url.includes(searchTerm)
    );

    // if we're on list view
    if (graphView) {
      draw(filteredItems);
    } else {
      listView(filteredItems);
    }
  });

  //redraw all items
  $("#reset").click(function() {
    $(this).hide();
    $("#search-input").val("");
    searchTerm = "";
    $("div.tooltip").remove();
    if (graphView) draw(getItems());
    else listView(getItems());
  });

  //switch to list view
  $("#list-view").click(function() {
    graphView = false;
    $("div.tooltip").remove();
    $("svg").remove();
    $("#list-view").prop("disabled", true);
    $("#graph").prop("disabled", false);
    listView(getItems());
  });

  //switch back to graph view
  $("#graph").click(function() {
    graphView = true;
    $(".list-container").remove();
    $("div.tooltip").remove();
    $("#graph").prop("disabled", true);
    $("#list-view").prop("disabled", false);
    $("body").append("<svg> </svg>");
    draw(getItems());
  });
});

function listView(items) {
  var searchTerm =
    $("#search-input").val() !== "" ? $("#search-input").val() : "all";
  $("div.list-container").remove();
  //set up the DOM
  $("body").append("<div class='list-container'></div>");
  $(".list-container").append("<ul></ul>");
  $("ul")
    .addClass("list-items")
    .append("<li class ='title'></li>");
  $(".title").html(
    "Time Spent in Category: " + searchTerm + "<span>Visit Count</span>"
  );

  //loop through each sorted item and append to DOM
  $.each(items, function(i, site) {
    var item = $("<li>");
    var contents =
      '<a href="' +
      site.url +
      '">' +
      site.url +
      "</a>" +
      "<span>" +
      msToMinAndSec(site.time) +
      "</span>";
    item.html(contents).appendTo($(".list-items"));
  });
}

function msToMinAndSec(millis) {
  const d = new Date(millis);
  const hours = d.getUTCHours() ? `${d.getUTCHours()} hrs, ` : "";
  const minutes = d.getUTCMinutes() ? `${d.getUTCMinutes()} mins, ` : "";
  const seconds = d.getUTCSeconds() ? `${d.getUTCSeconds()} secs` : "";
  return hours + minutes + seconds;
}

function draw(items) {
  $("div#error").remove();
  // clean up the DOM
  $("div.tooltip").remove();
  d3.selectAll("svg > *").remove();

  var height = $(window).height();
  width = $(window).width();

  // create the canvas
  d3.select("svg")
    .attr("id", "viz")
    .attr("height", height)
    .attr("width", width);

  const tooltip = d3
    .select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

  const max = d3.max(items, function(d) {
    return d.time;
  });

  const compressedDataPoints = compress(items, max);

  var nodes = compressedDataPoints.map(function(d) {
    return {
      title: d.title || d.url,
      radius: d.radius,
      time: d.time,
      url: d.url
    };
  });

  let newScaledData = [];
  const minDataPoint = d3.min(nodes, function(d) {
    return d.radius;
  });
  const maxDataPoint = d3.max(nodes, function(d) {
    return d.radius;
  });

  const linearScale = d3
    .scaleLinear()
    .domain([minDataPoint, maxDataPoint])
    .range([8, 100]);

  for (var i = 0; i < nodes.length; i++) {
    newScaledData[i] = Object.assign({}, nodes[i]);
    newScaledData[i].radius = linearScale(nodes[i].radius);
  }

  const color = d3.scaleOrdinal(d3.schemeCategory20c);

  d3.forceSimulation(newScaledData)
    .force("charge", d3.forceManyBody().strength(3))
    .force("center", d3.forceCenter(width / 2, height / 2))
    .force(
      "collision",
      d3.forceCollide().radius(function(d) {
        return d.radius + 10;
      })
    )
    .on("tick", ticked);

  function ticked() {
    var u = d3
      .select("svg")
      .selectAll("circle")
      .data(newScaledData);

    var a = d3
      .select("svg")
      .selectAll("a")
      .data(newScaledData);

    u.enter()
      .append("a")
      .append("circle")
      .merge(u)
      .merge(a)
      .attr("class", "circle")
      .attr("index", function(d) {
        return d.index;
      })
      .attr("r", function(d) {
        return d.radius;
      })
      .attr("cx", function(d) {
        return (d.x = Math.max(d.radius, Math.min(width - d.radius, d.x)));
      })
      .attr("cy", function(d) {
        return (d.y = Math.max(d.radius, Math.min(height - d.radius, d.y)));
      })
      .attr("fill", function(d) {
        return color(d.time);
      })
      .style("stroke", "white")
      .style("stroke-width", 2);

    a.attr("href", function(d, i) {
      return d.url;
    });

    u.on("mouseover", function(d, i) {
      // highlight circle on mouseover
      let circle = d3.select(this);
      circle.style("stroke-width", 4);

      tooltip
        .html(
          cut(d.title) + "<br/> - <br/>Time Spent: " + msToMinAndSec(d.time)
        )
        .style("left", d3.event.pageX + "px")
        .style("top", d3.event.pageY + "px")
        .style("opacity", 0.9)
        .style("visibility", "visible");
    });

    u.on("mouseout", function(d, i) {
      // hide tooltip
      tooltip.style("visibility", "hidden");
      // select circle and remove highlighted border
      let circle = d3.select(this);
      circle.style("stroke-width", 2);
    });

    u.exit().remove();
  }
}
