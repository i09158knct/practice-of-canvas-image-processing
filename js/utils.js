// need --disable-web-security option
function showImage(canvas) {
  var img = new Image();
  img.src = canvas.toDataURL();
  document.body.appendChild(img);
}

function buildNegativeData(data) {
  var length = data.length;
  var negaData = new Uint8ClampedArray(length);
  for (var i = 0; i < length; i += 4) {
    var rIndex = i + 0;
    var gIndex = i + 1;
    var bIndex = i + 2;
    var aIndex = i + 3;

    negaData[rIndex] = 255 - data[rIndex];
    negaData[gIndex] = 255 - data[gIndex];
    negaData[bIndex] = 255 - data[bIndex];
  }
  return negaData;
}

function dataToNeagative(data) {
  var length = data.length;
  for (var i = 0; i < length; i += 4) {
    var rIndex = i + 0;
    var gIndex = i + 1;
    var bIndex = i + 2;
    var aIndex = i + 3;

    data[rIndex] = 255 - data[rIndex];
    data[gIndex] = 255 - data[gIndex];
    data[bIndex] = 255 - data[bIndex];
  }
}


// from source data
