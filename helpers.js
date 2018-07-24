// Scale the data for the viz
function compress(arr, max, range) {
  var hardMax = 100;
  var softMax = 75;
  var compressedVals = [];
  var xtra = max - softMax;

  for (var i = 0; i < arr.length; i++) {
    let obj = Object.assign({}, arr[i]);
    if (arr[i].time > softMax) {
      obj.radius =
        softMax +
        (hardMax - softMax) * (parseFloat(arr[i].time - softMax) / xtra);
      compressedVals.push(obj);
    } else {
      obj.radius = obj.time;
      compressedVals.push(obj);
    }
  }
  return compressedVals;
}

//Truncate a title
function cut(string) {
  return string.length < 40 ? string : string.substr(0, 25) + "...";
}

//Get the host name for graph mode
function getHostName(url) {
  var base = url.split("//");
  base = base[1].split(".");
  var name = "";

  if (base[0].includes(":")) base = base[0].split(":");
  if (base[0] === "www") base = base.slice(1);

  base.forEach(function(word, i) {
    if (i != base.length - 1) name += word + " ";
  });

  name = name[0].toUpperCase() + name.slice(1);
  return name;
}

function getBaseUrl(url) {
  var temp = document.createElement("a");
  temp.href = url;
  return temp.origin + "/";
}
