////////////////////////////////////////////////////////////////////////////////
// Project 1:  Airbrush                                                       //
//                                                                            //
// Huyen Tran                                                                 //
// COMP320                                                                    //
// 9/22/21                                                                    //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////

// holds functions that initialize the various controls below the image
var controls = Object.create(null);
// associates the names of the tools with the function that should be called
// when they are selected and the canvas is clicked
var tools = Object.create(null);
var paintFlowRate = 0.5;  // stores the paint flow rate

// creates an element with the given name and attributes and appends all
// further arguments it gets as child nodes
function elt(name, attributes) {
  var node = document.createElement(name);
  if (attributes) {
    for (var attr in attributes)
      if (attributes.hasOwnProperty(attr))
        node.setAttribute(attr, attributes[attr]);
  }
  for (var i = 2; i < arguments.length; i++) {
    var child = arguments[i];
    if (typeof child == "string")
      child = document.createTextNode(child);
    node.appendChild(child);
  }
  return node;
}

// appends the paint interface to the DOM element it is given as an argument
function createPaint(parent) {
  var canvas = elt("canvas", {width: 640, height: 480});
  var cx = canvas.getContext("2d");
  cx.fillStyle = 'white';
  cx.fillRect(0,0,canvas.width, canvas.height);
  var toolbar = elt("div", {class: "toolbar"});
  for (var name in controls)
    toolbar.appendChild(controls[name](cx));

  var panel = elt("div", {class: "picturepanel"}, canvas);
  parent.appendChild(elt("div", null, panel, toolbar));
}

// populates the tool field with <option> elements for all tools that have been
// defined, and a "mousedown" handler takes care of calling the function for
// the current tool
controls.tool = function(cx) {
  var select = elt("select");
  for (var name in tools)
    select.appendChild(elt("option", null, name));

  cx.canvas.addEventListener("mousedown", function(event) {
    if (event.which == 1) {
      tools[select.value](event, cx);
      event.preventDefault();
    }
  });

  return elt("span", null, "Tool: ", select);
};

// finds the canvas-relative coordinates
function relativePos(event, element) {
  var rect = element.getBoundingClientRect();
  return {x: Math.floor(event.clientX - rect.left),
          y: Math.floor(event.clientY - rect.top)};
}

// registers and unregisters events for drawing tools
function trackDrag(onMove, onEnd) {
  function end(event) {
    removeEventListener("mousemove", onMove);
    removeEventListener("mouseup", end);
    if (onEnd)
      onEnd(event);
  }
  addEventListener("mousemove", onMove);
  addEventListener("mouseup", end);
}

// color picker -- updates fillStyle and strokeStyle with the selected color
controls.color = function(cx) {
  var input = elt("input", {type: "color"});
  input.addEventListener("change", function() {
    cx.fillStyle = input.value;
    cx.strokeStyle = input.value;
  });
  return elt("span", null, "Color: ", input);
};

// brush size selector -- updates lineWidth with the selected size
controls.brushSize = function(cx) {
  var select = elt("select");
  var sizes = [1, 2, 3, 5, 8, 12, 25, 35, 50, 75, 100];
  sizes.forEach(function(size) {
    select.appendChild(elt("option", {value: size},
                           size + " pixels"));
  });
  select.selectedIndex = 3;
  cx.lineWidth = 5;
  select.addEventListener("change", function() {
    cx.lineWidth = select.value;
  });
  return elt("span", null, "Brush size: ", select);
};


// paint flow rate selector
controls.paintFlow = function(cx) {
  var select = elt("select");
  var sizes = [0.0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0];
  sizes.forEach(function(size) {
    select.appendChild(elt("option", {value: size},
                           size + ""));
  });
  select.selectedIndex = 5;
  select.addEventListener("change", function() {
    paintFlowRate = select.value;
  });
  return elt("span", null, "Paint flow: ", select);
};

// save link -- generates a data url
controls.save = function(cx) {
  var link = elt("a", {href: "/"}, "Save");
  function update() {
    try {
      link.href = cx.canvas.toDataURL();
    } catch (e) {
      if (e instanceof SecurityError)
        link.href = "javascript:alert(" +
          JSON.stringify("Can't save: " + e.toString()) + ")";
      else
        throw e;
    }
  }
  link.addEventListener("mouseover", update);
  link.addEventListener("focus", update);
  return link;
};

// tries to load an image file from a URL
function loadImageURL(cx, url) {
  var image = document.createElement("img");
  image.addEventListener("load", function() {
    var color = cx.fillStyle, size = cx.lineWidth;
    cx.canvas.width = image.width;
    cx.canvas.height = image.height;
    cx.drawImage(image, 0, 0);
    cx.fillStyle = color;
    cx.strokeStyle = color;
    cx.lineWidth = size;
  });
  image.src = url;
}

// file chooser to load a local file
controls.openFile = function(cx) {
  var input = elt("input", {type: "file"});
  input.addEventListener("change", function() {
    if (input.files.length == 0) return;
    var reader = new FileReader();
    reader.addEventListener("load", function() {
      loadImageURL(cx, reader.result);
    });
    reader.readAsDataURL(input.files[0]);
  });
  return elt("div", null, "Open file: ", input);
};

// text field form for loading a file from a URL
controls.openURL = function(cx) {
  var input = elt("input", {type: "text"});
  var form = elt("form", null,
                 "Open URL: ", input,
                 elt("button", {type: "submit"}, "load"));
  form.addEventListener("submit", function(event) {
    event.preventDefault();
    loadImageURL(cx, input.value);
  });
  return form;
};

// constant brush -- places an equal amount of paint at each pixel within the
// airbrush's radius
tools.Constant = function(event, cx) {
    var radius = cx.lineWidth/2;
    var r = parseInt(cx.fillStyle.substring(1,3), 16);
    var g = parseInt(cx.fillStyle.substring(3,5), 16);
    var b = parseInt(cx.fillStyle.substring(5), 16);

    //create circle mask with constant distribution
    var size = 2 * radius;
    var dx,dy,dist;
    var mask = new Array(size*size);
    var i = 0;

    for (var x = 0; x < size; x++){
      for (var y = 0; y < size; y++){
        dx = x - radius;
        dy = y - radius;
        dist = Math.sqrt(dx*dx + dy*dy);
        if (dist > radius){
          mask[i] = 0;
        }
        else{
          mask[i] = 1;
        }
        i++;
      }
    }

    trackDrag(function(event) {
        var x,y,dist;
        var currentPos = relativePos(event, cx.canvas);
        const imageData = cx.getImageData(currentPos.x - radius, currentPos.y - radius, 2*radius, 2*radius);
        const data = imageData.data;
        //apply mask over paint brush region on canvas
        for (var i = 0; i < data.length; i += 4) {
            data[i]     = (mask[i/4] * paintFlowRate * r) + (1-mask[i/4])*data[i]; // red
            data[i + 1] = (mask[i/4] * paintFlowRate * g) + (1-mask[i/4])*data[i+1]; // green
            data[i + 2] = (mask[i/4] * paintFlowRate * b) + (1-mask[i/4])*data[i+2]; // blue
            data[i + 3] = 255; // alpha
        }
        cx.putImageData(imageData, currentPos.x - radius, currentPos.y - radius);
    });
};

tools.Linear = function(event, cx) {
  var radius = cx.lineWidth/2;
  var r = parseInt(cx.fillStyle.substring(1,3), 16);
  var g = parseInt(cx.fillStyle.substring(3,5), 16);
  var b = parseInt(cx.fillStyle.substring(5), 16);

  //mask
  var size = 2 * radius;
  var dx,dy,dist;
  var mask = new Array(size*size);
  var i = 0;

  for (var x = 0; x < size; x++){
    for (var y = 0; y < size; y++){
      dx = x - radius;
      dy = y - radius;
      dist = Math.sqrt(dx*dx + dy*dy);
      if (dist > radius){
        mask[i] = 0;
      }
      else{
        mask[i] = 1 - dist/radius;
      }
      i++;
    }
  }

  trackDrag(function(event) {
      var x,y,dist;
      var currentPos = relativePos(event, cx.canvas);
      const imageData = cx.getImageData(currentPos.x - radius, currentPos.y - radius, 2*radius, 2*radius);
      const data = imageData.data;
      //apply mask over canvas region with paint
      for (var i = 0; i < data.length; i += 4) {
          data[i]     = (mask[i/4] * paintFlowRate * r) + (1-mask[i/4])*data[i]; // red
          data[i + 1] = (mask[i/4] * paintFlowRate * g) + (1-mask[i/4])*data[i+1]; // green
          data[i + 2] = (mask[i/4] * paintFlowRate * b) + (1-mask[i/4])*data[i+2]; // blue
          data[i + 3] = 255; // alpha
      }
      cx.putImageData(imageData, currentPos.x - radius, currentPos.y - radius);
  });
};

tools.Quadratic = function(event, cx) {
  var radius = cx.lineWidth/2;
  var r = parseInt(cx.fillStyle.substring(1,3), 16);
  var g = parseInt(cx.fillStyle.substring(3,5), 16);
  var b = parseInt(cx.fillStyle.substring(5), 16);

  //create mask that holds distribution
  var size = 2 * radius;
  var dx,dy,dist;
  var mask = new Array(size*size);
  var i = 0;

  for (var x = 0; x < size; x++){
    for (var y = 0; y < size; y++){
      dx = x - radius;
      dy = y - radius;
      dist = Math.sqrt(dx*dx + dy*dy);
      if (dist > radius){
        mask[i] = 0;
      }
      else{
        mask[i] = 1 - Math.pow(dist/radius, 2);
      }
      i++;
    }
  }

  trackDrag(function(event) {
      var x,y,dist;
      var currentPos = relativePos(event, cx.canvas);
      const imageData = cx.getImageData(currentPos.x - radius, currentPos.y - radius, 2*radius, 2*radius);
      const data = imageData.data;
      //apply mask over paint brush region of canvas
      for (var i = 0; i < data.length; i += 4) {
          data[i]     = (mask[i/4] * paintFlowRate * r) + (1-mask[i/4])*data[i]; // red
          data[i + 1] = (mask[i/4] * paintFlowRate * g) + (1-mask[i/4])*data[i+1]; // green
          data[i + 2] = (mask[i/4] * paintFlowRate * b) + (1-mask[i/4])*data[i+2]; // blue
          data[i + 3] = 255; // alpha
      }
      cx.putImageData(imageData, currentPos.x - radius, currentPos.y - radius);
  });
};

tools.GaussianBlur = function(event, cx) {
  var clickPos = relativePos(event, cx.canvas);

  trackDrag(function(event){
    var dragPos = relativePos(event, cx.canvas);
  },
  function(event){
    var releasePos = relativePos(event, cx.canvas);
    //get part of the canvas we're working with
    var width = Math.abs(releasePos.x - clickPos.x);
    var height = Math.abs(releasePos.y - clickPos.y);

    startX  = Math.min(clickPos.x, releasePos.x);
    startY = Math.min(clickPos.y, releasePos.y);

    const imageData = cx.getImageData(startX, startY, width, height);

    const data = imageData.data;
    const mask = new Array(4*width*height);

    //create our filter kernel
    var r = 3;
    var ksum = 0;
    const kernel = new Array(0.05,0.1, .05, 0.1, 0.4, 0.1, .05, 0.1, .05);
    var iSrc; //what pixel we're on

    var rcolSum;
    var gcolSum;
    var bcolSum;
    var ith, ki = 0; //i = index of data array, ki = kernel index
    var currPixel = 0;
    var ksum = 0;

    //loop over selected region
    for (var y = 0; y < height; y++){
      for (var x = 0; x < width; x++){
        rcolSum = 0; //[r,g,b]
        gcolSum = 0;
        bcolSum = 0;
        ki = 0; //index of filter kernel
        //loop through neighbors
        for (var i = -Math.floor(r/2); i <= Math.floor(r/2); i++){
          iSrc = x + i;
          for (var j = -Math.floor(r/2); j <= Math.floor(r/2); j++){
            jSrc = y + j;
            //convert 2d array (x,y) to i in data 1D array
            ith = (width*jSrc)+iSrc;
            //add neighbor to sum
            rcolSum += (data[(ith*4)]*kernel[ki]);
            gcolSum += (data[(ith*4)+1]*kernel[ki]);
            bcolSum += (data[(ith*4)+2]*kernel[ki]);
            ki++;
          }
        }

        //data starts from 0...datalength
        //start at 0, then increment by 4 each loop
        mask[currPixel] = rcolSum;    //r
        mask[currPixel+1] = gcolSum;  //g
        mask[currPixel+2] = bcolSum;  //b
        currPixel +=4;
      }
    }

    //store new values to canvas
    for (var i = width*4+4; i < (data.length - (width*4+4)); i += 4) {
        data[i]     = mask[i]; // red
        data[i + 1] = mask[i+1]; // green
        data[i + 2] = mask[i+2]; // blue
        data[i + 3] = 255; // alpha
    }

    cx.putImageData(imageData, startX, startY);

  });
};

tools.NormalBlur = function(event, cx) {
  var clickPos = relativePos(event, cx.canvas);

  trackDrag(function(event){
    var dragPos = relativePos(event, cx.canvas);
  },
  function(event){
    var releasePos = relativePos(event, cx.canvas);
    //get part of the canvas we're working with
    var width = Math.abs(releasePos.x - clickPos.x);
    var height = Math.abs(releasePos.y - clickPos.y);

    startX  = Math.min(clickPos.x, releasePos.x);
    startY = Math.min(clickPos.y, releasePos.y);

    const imageData = cx.getImageData(startX, startY, width, height);

    const data = imageData.data;
    const mask = new Array(4*width*height);

    //create our filter kernel
    var r = 3;
    const kernel = new Array(1,1,1, 1, 1, 1, 1, 1, 1);
    var iSrc; //what pixel we're on

    var rcolSum;
    var gcolSum;
    var bcolSum;
    var ith, ki = 0;
    var currPixel = 0;
    var ksum = 0;
    for (var y = 0; y < height; y++){
      for (var x = 0; x < width; x++){
        rcolSum = 0; //[r,g,b]
        gcolSum = 0;
        bcolSum = 0;
        ki = 0; //index of filter kernel
        ksum = 0;
        //loop through neighbors
        for (var i = -Math.floor(r/2); i <= Math.floor(r/2); i++){
          iSrc = x + i;
          for (var j = -Math.floor(r/2); j <= Math.floor(r/2); j++){
            jSrc = y + j;
            //convert 2d array (x,y) to i in data 1D array
            ith = (width*jSrc)+iSrc;
            //add neighbor to sum
            rcolSum += (data[(ith*4)]*kernel[ki]);
            gcolSum += (data[(ith*4)+1]*kernel[ki]);
            bcolSum += (data[(ith*4)+2]*kernel[ki]);
            ki++;
          }
        }

        //data starts from 0...datalength
        mask[currPixel] = rcolSum/9;    //r
        mask[currPixel+1] = gcolSum/9;  //g
        mask[currPixel+2] = bcolSum/9;  //b
        currPixel +=4;
      }
    }

    //store new values to canvas
    for (var i = (width*4+4); i < (data.length - (width*4+4)); i += 4) {
        data[i]     = mask[i]; // red
        data[i + 1] = mask[i+1]; // green
        data[i + 2] = mask[i+2]; // blue
        data[i + 3] = 255; // alpha
    }

    cx.putImageData(imageData, startX, startY);

  });
};

tools.EdgeDetection = function(event, cx) {
  var clickPos = relativePos(event, cx.canvas);

  trackDrag(function(event){
    var dragPos = relativePos(event, cx.canvas);
  },
  function(event){
    var releasePos = relativePos(event, cx.canvas);
    //get part of the canvas we're working with
    var width = Math.abs(releasePos.x - clickPos.x);
    var height = Math.abs(releasePos.y - clickPos.y);

    startX  = Math.min(clickPos.x, releasePos.x);
    startY = Math.min(clickPos.y, releasePos.y);

    const imageData = cx.getImageData(startX, startY, width, height);

    const data = imageData.data;
    const mask = new Array(4*width*height);

    //create our filter kernel
    var r = 3;
    const kernel = new Array(0, -1, 0, -1, 4, -1, 0, -1, 0);
    var iSrc; //what pixel we're on
    var rcolSum;
    var gcolSum;
    var bcolSum;
    var ith, ki = 0;
    var currPixel = 0;
    var ksum = 0;
    for (var y = 0; y < height; y++){
      for (var x = 0; x < width; x++){
        rcolSum = 0; //[r,g,b]
        gcolSum = 0;
        bcolSum = 0;
        ki = 0; //index of filter kernel
        ksum = 0;
        //loop through neighbors
        for (var i = -Math.floor(r/2); i <= Math.floor(r/2); i++){
          iSrc = x + i;
          for (var j = -Math.floor(r/2); j <= Math.floor(r/2); j++){
            jSrc = y + j;
            //convert 2d array (x,y) to i in data 1D array
            ith = (width*jSrc)+iSrc;
            //add neighbor to sum
            rcolSum += (data[(ith*4)]*kernel[ki]);
            gcolSum += (data[(ith*4)+1]*kernel[ki]);
            bcolSum += (data[(ith*4)+2]*kernel[ki]);
            ki++;
          }
        }

        //data starts from 0...datalength
        mask[currPixel] = rcolSum;    //r
        mask[currPixel+1] = gcolSum;  //g
        mask[currPixel+2] = bcolSum;  //b
        currPixel +=4;
      }
    }

    //store new values to canvas
    for (var i = width*4; i < (data.length - (width*4+4)); i += 4) {
        data[i]     = mask[i]; // red
        data[i + 1] = mask[i+1]; // green
        data[i + 2] = mask[i+2]; // blue
        data[i + 3] = 255; // alpha
    }

    //put image back in the canvas
    cx.putImageData(imageData, startX, startY);
  });
};

tools.Brighten = function(event, cx) {
  var clickPos = relativePos(event, cx.canvas);

  trackDrag(function(event){
    var dragPos = relativePos(event, cx.canvas);
  },
  function(event){
    var releasePos = relativePos(event, cx.canvas);
    //get part of the canvas we're working with
    var width = Math.abs(releasePos.x - clickPos.x);
    var height = Math.abs(releasePos.y - clickPos.y);

    startX  = Math.min(clickPos.x, releasePos.x);
    startY = Math.min(clickPos.y, releasePos.y);

    const imageData = cx.getImageData(startX, startY, width, height);

    const data = imageData.data;
    const mask = new Array(4*width*height);

    //create our filter kernel
    var r = 3;
    const kernel = new Array(-1,-1,-1,1,8,1,1,1,1,1);
    var iSrc; //what pixel we're on
    var rcolSum;
    var gcolSum;
    var bcolSum;
    var ith, ki = 0;
    var currPixel = 0;
    var ksum = 0;
    for (var y = 0; y < height; y++){
      for (var x = 0; x < width; x++){
        rcolSum = 0; //[r,g,b]
        gcolSum = 0;
        bcolSum = 0;
        ki = 0; //index of filter kernel
        ksum = 0;
        //loop through neighbors
        for (var i = -Math.floor(r/2); i <= Math.floor(r/2); i++){
          iSrc = x + i;
          for (var j = -Math.floor(r/2); j <= Math.floor(r/2); j++){
            jSrc = y + j;
            //convert 2d array (x,y) to i in data 1D array
            ith = (width*jSrc)+iSrc;
            //add neighbor to sum
            rcolSum += (data[(ith*4)]*kernel[ki])/9;
            gcolSum += (data[(ith*4)+1]*kernel[ki])/9;
            bcolSum += (data[(ith*4)+2]*kernel[ki])/9;
            ki++;
          }
        }
        //data starts from 0...datalength
        mask[currPixel] = rcolSum;    //r
        mask[currPixel+1] = gcolSum;  //g
        mask[currPixel+2]= bcolSum;  //b
        currPixel +=4;
      }
    }

    //store new values to canvas
    for (var i = width*4+4; i < (data.length - (width*4+4)); i += 4) {
        data[i]     = mask[i]; // red
        data[i + 1] = mask[i+1]; // green
        data[i + 2] = mask[i+2]; // blue
        data[i + 3] = 255; // alpha
    }

    //put image back in the canvas
    cx.putImageData(imageData, startX, startY);
  });
};

tools.Invert = function(event, cx) {
  var clickPos = relativePos(event, cx.canvas);

  trackDrag(function(event){
    var dragPos = relativePos(event, cx.canvas);
  },
  function(event){
    var releasePos = relativePos(event, cx.canvas);
    //get part of the canvas we're working with
    var width = Math.abs(releasePos.x - clickPos.x);
    var height = Math.abs(releasePos.y - clickPos.y);

    startX  = Math.min(clickPos.x, releasePos.x);
    startY = Math.min(clickPos.y, releasePos.y);

    const imageData = cx.getImageData(startX, startY, width, height);

    const data = imageData.data;


    //store new values to canvas
    for (var i = 0; i < data.length; i += 4) {
        data[i]     = 255 - data[i]; // red
        data[i + 1] = 255 - data[i + 1]; // green
        data[i + 2] = 255 - data[i + 2]; // blue
        data[i + 3] = 255; // alpha
    }

    //put image back in the canvas
    cx.putImageData(imageData, startX, startY);
  });
};
