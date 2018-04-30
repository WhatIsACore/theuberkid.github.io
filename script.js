var canvas = document.getElementById('tubeman');
var ctx = canvas.getContext('2d');
var rad = Math.PI/180;

// make sure tube guy is always to scale with the page
var scaleWidth, scaleHeight;
function onResize(){
  ctx.canvas.width  = window.innerWidth;
  ctx.canvas.height = window.innerHeight;
  scaleWidth = canvas.width / 300;
  scaleHeight = canvas.height / 140;
}
addEventListener('resize', onResize);
onResize();

// draw easy shapes that fits with our scaling
function rect(startX, startY, width, height){
  ctx.fillRect(startX * scaleWidth, startY * scaleHeight, width * scaleWidth, height * scaleHeight)
};
function circle(centerX, centerY, radius){
  ctx.beginPath();
  ctx.arc(centerX * scaleWidth, centerY * scaleHeight, radius * scaleWidth, 0, 2 * Math.PI, false);
  ctx.fill();
}

// wave constructor
var Wave = function(){
  this.position = 0; // position relative to bottom-most wave (or the base)
  this.speed = Math.random() + 3;
}
// tube constructor
var Tube = function(width, totalLength, gravity, face){
  this.width = width;
  this.nhw = -1 * width / 2; // negative half width: used to center rectangles on origin
  this.totalLength = totalLength;
  this.gravity = gravity; // relative angle that points down (which way segments should drop)
  this.segments = [(Math.round(Math.random()) - 0.5) * 180]; // array of angles for segment rotation
  this.waves = []; // array of waves where the tube bends
  this.waveTime = Math.random() * 30; // time until next wave created
  this.face = face;
}
// method for creating new wave
Tube.prototype.newWave = function(){
  this.waves.unshift(new Wave());
  this.segments.unshift(Math.random() * 4 - 2);
  this.waveTime = Math.random() * 30 + 30;
}
// method to draw and update a tube
Tube.prototype.update = function(){
  var remLength = this.totalLength; // keep track of the final segment's length
  var gravity = this.gravity; // keep track of which direction is gravity

  // work up thru each segment, rotating and drawing
  for(var i = 0, j = this.segments.length; i < j; i++){
    var length = (this.waves[i] != null) ? this.waves[i].position - (i > 0 ? this.waves[i - 1].position : 0) : remLength;
    remLength -= length;
    gravity += this.segments[i];
    if(gravity > 180) gravity -= 360;
    if(gravity < -180) gravity += 360;

    // draw rectangle
    ctx.rotate(this.segments[i] * rad);
    rect(this.nhw, 0, this.width, length);
    ctx.translate(0, length * scaleHeight);
    if(i !== j - 1){
      circle(0, 0, this.width / 2);
    } else {
      rect(this.nhw, -1, this.width, this.width / 2);
      if(this.face){
        ctx.fillStyle = '#0F0E0E';
        circle(0, 1, 5);
        ctx.fillStyle = '#8DAA9D';
        rect(-5, 1, 10, 5);
        ctx.fillStyle = '#0F0E0E';
        circle(-5, 5, 2);
        circle(5, 5, 2);
        ctx.fillStyle = '#8DAA9D';
      }
    }

    // update segments and waves
    this.segments[i] -= (i * 2 + 1) * Math.max(Math.min((180 - Math.abs(gravity)) / 9, 1), 0.1) * (gravity > 0 ? 0.7 : -0.7);
    if(this.waves[i] != null)
      this.waves[i].position += this.waves[i].speed;

    // remove nonexistent segments
    if(length <= 0 && remLength <= 0){
      this.waves.pop();
      this.segments.pop();
    }
  }
}

// build the tubeman out of tube objects
var body = new Tube(20, 140, 180, true);

// draw loop that updates every 10ms
function drawTubeMan(){
  ctx.fillStyle = '#8DAA9D';
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.translate(160 * scaleWidth, 160 * scaleHeight);
  ctx.rotate(180 * rad);

  body.update();

  body.waveTime--;
  if(body.waveTime <= 0)
    body.newWave();
}

setInterval(drawTubeMan, 15);
