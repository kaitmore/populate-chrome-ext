// If the base url is the same, merge those data points
function merge(array) {
    var unique = {};
    var final = [];
    array.forEach(function (site) {
        var url = site.url;
        var currentVisitCount = site.visitCount;
        if (!unique[url]) {
            unique[url] = site;
        } else {
            unique[url].visitCount += currentVisitCount;
            unique[url].merged = true;
        }
    });
    for (url in unique) {
        if (unique[url].merged) unique[url].title = getHostName(url)
        final.push(unique[url]);
    }
    return final;
}

//Scale the data for the viz
function compress(arr, max, range) {
    var hardMax = 100;
    var softMax = 75;
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

//Truncate a title
 function cut (string) {
    return string.length < 40 ? string : string.substr(0, 25) + "..."
}

//Get the host name for graph mode
function getHostName(url) {
    var base = url.split('//')
    base = base[1].split(".")
    var name = "";

    if (base[0].includes(':')) base = base[0].split(":")
    if (base[0] === 'www') base = base.slice(1)

    base.forEach(function (word, i) {
        if (i != base.length - 1) name += word + " "
    })

    name = name[0].toUpperCase() + name.slice(1)
    return name
}

function getBaseUrl(url) {
    var temp = document.createElement("a");
    temp.href = url;
    return temp.origin + "/"
}