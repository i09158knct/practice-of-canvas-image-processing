// if source image data is coming from different origin,
// should set --disable-web-security option when start Chrome
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

function dataToGrayscale(data) {
  var length = data.length;
  for (var i = 0; i < length; i += 4) {
    var rIndex = i + 0;
    var gIndex = i + 1;
    var bIndex = i + 2;

    var ntscAverage = (
      305 * data[rIndex] +
      601 * data[gIndex] +
      117 * data[bIndex]
    ) >> 10;

    data[rIndex] = ntscAverage;
    data[gIndex] = ntscAverage;
    data[bIndex] = ntscAverage;
  }
}

function buildGroup(imageData) {
  var
    height = imageData.height,
    width = imageData.width,
    data = imageData.data,
    groupTable = [],
    synonymousIdTable = [],
    nextMarkId = 1; // id should not use 0


  for (var iy = 0, offsetY = 0; iy < height; iy++, offsetY += 4 * width) {
    var currentRow = groupTable[iy] = [];
    var aboveRow = groupTable[iy - 1] || [];

    // processing of left end pixel
    if (data[offsetY + 0] === 0) {
      currentRow[0] = aboveRow[0] || nextMarkId++;
    }

    for (var ix = 1, offsetX = 4; ix < width; ix++, offsetX += 4) {
      if (data[offsetY + offsetX] === 0) {
        var abovePixelId = aboveRow[ix];
        var beforePixelId = currentRow[ix - 1];
        if (abovePixelId) {
          currentRow[ix] = abovePixelId;
          if (beforePixelId && beforePixelId !== abovePixelId) {
            synonymousIdTable[beforePixelId] =
              synonymousIdTable[beforePixelId] || [];
            synonymousIdTable[abovePixelId] =
              synonymousIdTable[abovePixelId] || [];
            synonymousIdTable[beforePixelId][abovePixelId] = abovePixelId;
            synonymousIdTable[abovePixelId][beforePixelId] = beforePixelId;
          }
        } else {
          currentRow[ix] = beforePixelId || nextMarkId++;
        }
      }
    }
  }

  var lookupTable = (function _buildSynonymousLookupTable() {
    var lookupTable = [];
    var visitedTable = [];
    synonymousIdTable.forEach(function(_synonymousList, _id) {

      if (!visitedTable[_id]) {
        var synonymousSet = [];
        var stack = [];
        visitedTable[_id] = true;
        synonymousSet.push(_id);
        stack.push(_id);
        while (stack.length) {
          var id = stack.pop();
          var synonymousList = synonymousIdTable[id];
          for (var i = 0, length = synonymousList.length; i < length; i++) {
            var synonymousId = synonymousList[i];
            if (!synonymousId) continue;
            if (!visitedTable[synonymousId]) {
              visitedTable[synonymousId] = true;
              synonymousSet.push(synonymousId);
              stack.push(synonymousId);
            }
          }
        }

        var trueId = Math.min.apply(Math, synonymousSet);
        synonymousSet.forEach(function(id) {
          lookupTable[id] = trueId;
        });
      }

    });

    for (var i = 1; i < nextMarkId; i++) {
      lookupTable[i] = lookupTable[i] || i;
    }
    return lookupTable;
  })();

  (function _mergeGroups() {
    for (var iy = 0; iy < height; iy++) {
      var currentRow = groupTable[iy];
      for (var ix = 0; ix < width; ix++) {
        currentRow[ix] = lookupTable[currentRow[ix]];
      }
    }
  })();

  var groupIdList = (function _createGroupIdList() {
    var uniqueSparseArray = [];
    var
      length,
      id,
      i;
    for (i = 0, length = lookupTable.length; i < length; i++) {
      id = lookupTable[i];
      if (id) uniqueSparseArray[id] = id;
    }

    var uniqueArray = [];
    for (i = 0, length = uniqueSparseArray.length; i < length; i++) {
      id = uniqueSparseArray[i];
      if (id) uniqueArray.push(id);
    }

    return uniqueArray;
  })();

  return {
    groupTable: groupTable,
    groupIdList: groupIdList
  };
}
