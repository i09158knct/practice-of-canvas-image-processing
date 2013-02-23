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

    (function _normalizeId() {
      var normalizingMap = [];
      var nextNewId = 1;
      for (var i = 0, length = lookupTable.length; i < length; i++) {
        var targetId = lookupTable[i];
        if (!targetId) continue;

        var normalizedId =
          normalizingMap[targetId] ||
          (normalizingMap[targetId] = nextNewId++);

        lookupTable[i] = normalizedId;
      }
    })();

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

  var numberOfGroups = (function countGroups() {
    var countedIdTable = [];
    var count = 0;
    for (var i = 0, length = lookupTable.length; i < length; i++) {
      var id = lookupTable[i];
      if (id && !countedIdTable[id]) {
        countedIdTable[id] = true;
        count++;
      }
    }
    return count;
  })();

  return {
    groupTable: groupTable,
    numberOfGroups: numberOfGroups
  };
}

function splitImageDataIntoGroups(imageData, group) {
  var groupTable = group.groupTable;
  var numberOfGroups = group.numberOfGroups;
  var width = imageData.width;
  var height = imageData.height;

  var positions = (function _measurePositionForEachGroup() {
    var positions = [];
    for (var i = 1; i <= numberOfGroups; i++) {
      positions[i] = {
        top: Number.MAX_VALUE,
        bottom: Number.MIN_VALUE,
        left: Number.MAX_VALUE,
        right: Number.MIN_VALUE
      };
    }

    for (var iy = 0; iy < height; iy++) {
      var currentRow = groupTable[iy];
      for (var ix = 0; ix < width; ix++) {
        var groupId = currentRow[ix];
        if (!groupId) continue;
        var position = positions[groupId];
        if (iy < position.top) {
          position.top = iy;
        }
        if (iy > position.bottom) {
          position.bottom = iy;
        }

        if (ix < position.left) {
          position.left = ix;
        }
        if (ix > position.right) {
          position.right = ix;
        }
      }
    }
    return positions;
  })();

  var imageDataBuilder =
    window.document.createElement("canvas").getContext("2d");

  var containers = positions.map(function _addSizeInfoAndImageData(position) {
    var width = position.right - position.left + 1;
    var height = position.bottom - position.top + 1;
    position.width = width;
    position.height = height;
    position.imageData = imageDataBuilder.createImageData(width, height);
    return position;
  });
  positions = null;

  var data = imageData.data;
  for (var iy = 0, offsetY = 0; iy < height; iy++, offsetY += 4 * width) {
    var currentRow = groupTable[iy];
    for (var ix = 0, offsetX = 0; ix < width; ix++, offsetX += 4) {
      var groupId = currentRow[ix];
      if (!groupId) continue;

      var container = containers[groupId];
      var cy = iy - container.top;
      var cx = ix - container.left;
      var cheadIndex = 4 * (container.width * cy + cx);
      var headIndex = offsetY + offsetX;
      var cdata = container.imageData.data;

      cdata[cheadIndex + 0] = data[headIndex + 0];
      cdata[cheadIndex + 1] = data[headIndex + 1];
      cdata[cheadIndex + 2] = data[headIndex + 2];
      cdata[cheadIndex + 3] = data[headIndex + 3];
    }
  }
  return containers;
}

function colorizeImageDataPerGroup(imageData, group, colorTable) {
  var data = imageData.data;
  var groupTable = group.groupTable;
  var numberOfGroups = group.numberOfGroups;
  colorTable = colorTable || (function _generateColorTable() {
    var colorTable = [];
    for (var groupId = 1; groupId <= numberOfGroups; groupId++) {
      colorTable[groupId] = {
        r: Math.floor(Math.random() * 256),
        g: Math.floor(Math.random() * 256),
        b: Math.floor(Math.random() * 256)
      };
    }
    return colorTable;
  })();

  var width = imageData.width;
  var height = imageData.height;
  for (var iy = 0, offsetY = 0; iy < height; iy++, offsetY += 4 * width) {
    for (var ix = 0, offsetX = 0; ix < width; ix++, offsetX += 4) {
      var headIndex = offsetY + offsetX;
      var rIndex = headIndex + 0;
      var gIndex = headIndex + 1;
      var bIndex = headIndex + 2;
      var aIndex = headIndex + 3;

      var groupId = groupTable[iy][ix];
      var colors = colorTable[groupId] || {};

      data[rIndex] = colors.r || 255;
      data[gIndex] = colors.g || 255;
      data[bIndex] = colors.b || 255;
    }
  }
}