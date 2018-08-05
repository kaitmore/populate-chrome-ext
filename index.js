const body = document.querySelector("body");
const resetButton = document.getElementById("reset");
const graphViewButton = document.getElementById("graph-view-button");
const listViewButton = document.getElementById("list-view-button");
const listViewContainer = document.getElementById("list-view-container");
const listViewList = document.getElementById("list-view-list");
const error = document.getElementById("error");
let searchInput = document.getElementById("search-input");
let listView = false;
let searchTerm;

// Display error message if there is no data
if (!getItems().length) {
  error.style.visibility = "visible";
} else {
  drawView(getItems());
}

searchInput.addEventListener("input", e => {
  e.preventDefault();
  resetButton.style.display = "inline";
  searchTerm = searchInput.value;
  drawView(getItems());
});

resetButton.addEventListener("click", e => {
  resetButton.style.display = "none";
  searchInput.value = "";
  drawView(getItems());
});

listViewButton.addEventListener("click", e => {
  // Clean up DOM
  listView = true;
  body.removeChild(document.querySelector("svg"));
  listViewContainer.style.display = "block";
  listViewButton.setAttribute("disabled", true);
  graphViewButton.removeAttribute("disabled");
  drawView(getItems());
});

graphViewButton.addEventListener("click", e => {
  // Clean up DOM
  listView = false;
  listViewContainer.style.display = "none";
  graphViewButton.setAttribute("disabled", true);
  listViewButton.removeAttribute("disabled");
  drawView(getItems());
});

function getItems() {
  let storedSites = JSON.parse(localStorage.getItem("populate")) || {};
  let items = Object.keys(storedSites)
    .filter(key => !key.startsWith("_"))
    .filter(site => site.includes(searchInput.value)) // filter out sites that don't match search term
    .map(site => {
      return { url: site, time: storedSites[site] };
    })
    .sort((a, b) => {
      return a.time > b.time ? -1 : 1;
    })
    .slice(0, 100);
  return items;
}

function drawView(items) {
  if (listView) {
    renderListView(items);
  } else {
    renderGraphView(items);
  }
}

function renderListView(items) {
  // Clear out any previous list elements
  listViewList.innerHTML = "";
  // Set up the DOM
  searchTerm = searchInput.value !== "" ? searchInput.value : "all";
  let listViewTitle = document.createElement("li");
  listViewTitle.id = "list-view-title";
  listViewTitle.innerHTML =
    "Time Spent in Category: " + searchTerm + "<span>Visit Count</span>";
  listViewList.appendChild(listViewTitle);
  // loop through each sorted item and append to DOM
  items.forEach(site => {
    const item = document.createElement("li");

    const link = document.createElement("a");
    link.href = site.url;
    link.innerText = site.url;

    const timing = document.createElement("span");
    timing.innerText = msToMinAndSec(site.time);

    item.appendChild(link);
    item.appendChild(timing);
    listViewList.appendChild(item);
  });
}

function renderGraphView(items) {
  // Clean up DOM
  error.style.visibility = "hidden";
  d3.selectAll("svg").remove();
  d3.selectAll("#tooltip").remove();

  const height = window.innerHeight;
  const width = window.innerWidth;

  // Create the canvas
  d3.select("body")
    .append("svg")
    .attr("height", height)
    .attr("width", width);

  const tooltip = d3
    .select("body")
    .append("div")
    .attr("id", "tooltip")
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
    const circles = d3
      .select("svg")
      .selectAll("circle")
      .data(newScaledData);

    const links = d3
      .select("svg")
      .selectAll("a")
      .data(newScaledData)
      .attr("href", d => d.url);

    circles
      .enter()
      .append("a")
      .append("circle")
      .merge(circles)
      .merge(links)
      .attr("fill", d => color(d.time))
      .attr("index", d => d.index)
      .attr("r", d => d.radius)
      .attr(
        "cx",
        d => (d.x = Math.max(d.radius, Math.min(width - d.radius, d.x)))
      )
      .attr(
        "cy",
        d => (d.y = Math.max(d.radius, Math.min(height - d.radius, d.y)))
      )
      .style("stroke", "white")
      .style("cursor", "pointer")
      .style("stroke-width", 2);

    circles.on("mouseover", function(d) {
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

    circles.on("mouseout", function(d) {
      // hide tooltip
      tooltip.style("visibility", "hidden");
      // select circle and remove highlighted border
      let circle = d3.select(this);
      circle.style("stroke-width", 2);
    });

    circles.exit().remove();
  }
}

// redraw when tab is activated
chrome.tabs.onActivated.addListener(function(x) {
  chrome.tabs.get(x.tabId, function(active) {
    if (active.url === "chrome://newtab/") {
      drawView(getItems());
    }
  });
});

// redraw when window is focused
chrome.windows.onFocusChanged.addListener(function(newWindowId) {
  if (newWindowId > 0) {
    chrome.tabs.getSelected(newWindowId, function(active) {
      if (active.url === "chrome://newtab/") {
        drawView(getItems());
      }
    });
  }
});
