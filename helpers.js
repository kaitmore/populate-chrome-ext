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

function getBaseUrl(url) {
  var temp = document.createElement("a");
  temp.href = url;
  return temp.origin + "/";
}

function msToMinAndSec(millis) {
  const d = new Date(millis);
  const hours = d.getUTCHours() ? `${d.getUTCHours()} hrs ` : "";
  const minutes = d.getUTCMinutes() ? `${d.getUTCMinutes()} mins ` : "";
  const seconds = d.getUTCSeconds() ? `${d.getUTCSeconds()} secs` : "";
  return hours + minutes + seconds;
}
