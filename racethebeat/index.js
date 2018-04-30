'use strict';

// prevent right click menu
document.addEventListener('contextmenu', event => event.preventDefault());

// initialize app and useful aliases
var app = new PIXI.Application({
  transparent: true
});
var loader = PIXI.loader;
var renderer = app.renderer;
var resources = PIXI.loader.resources;
var Graphics = PIXI.Graphics;
var Text = PIXI.Text;

// set up the viewing window
document.getElementById('wrapper').appendChild(app.view);
renderer.view.className = 'renderer';
renderer.autoResize = true;
renderer.resize(window.innerWidth, window.innerHeight);

var state = inactive; // current game state
// gameLoop will always run whichever loop 'state' is currently set to
app.ticker.add(function(){state();});

// document objects
var selectedTrack = 0;
var menu = document.getElementById('menu');
var darkenBG = document.getElementById('darken-bg');
var trackButtons = document.getElementsByClassName('track-button');
var playButton = document.getElementById('play-button');
var loadingView = document.getElementById('loading-view');
var loadingViewTrackArtist = document.getElementById('loading-track-artist');
var loadingViewTrackName = document.getElementById('loading-track-name');
var countdown = document.getElementById('countdown');
var scoreScreen = document.getElementById('score-screen');
var scoreScreenTrackArtist = document.getElementById('score-track-artist');
var scoreScreenTrackName = document.getElementById('score-track-name');
var finalScore = document.getElementById('final-score');
var finalCombo = document.getElementById('final-combo');
var finalPerfect = document.getElementById('final-perfect');
var finalGood = document.getElementById('final-good');
var finalFair = document.getElementById('final-fair');
var finalMiss = document.getElementById('final-miss');
var exitButton = document.getElementById('exit-button');

// set up track selection menu
for(var i in trackButtons)
  if(trackButtons[i].children)
    trackButtons[i].addEventListener('click', selectTrack);
function selectTrack(e){
  var deselect = e.currentTarget.className === 'track-button selected';
  for(var i in trackButtons)
    if(trackButtons[i].children)
      trackButtons[i].className = 'track-button';
  if(!deselect){
    e.currentTarget.className = 'track-button selected';
    playButton.className = 'select-button';
    selectedTrack = e.currentTarget.dataset.id;
  } else {
    playButton.className = 'select-button disabled';
  }
}

// confirm the user's track selection (menu)
playButton.addEventListener('click', confirmTrack);
function confirmTrack(){
  var track = trackList[selectedTrack];

  if(track != null){

    // cool menu animations for successfully entering track
    menu.style.opacity = 0;
    darkenBG.style.opacity = 0;
    loadingView.style.display = 'block';
    loadingViewTrackName.innerHTML = track.name;
    loadingViewTrackArtist.innerHTML = track.artist;
    setTimeout(function(){
      menu.style.display = 'none';
      darkenBG.style.display = 'none';
      loadingView.style.opacity = 0.4;
    }, 500);
    setTimeout(function(){
      loadingView.className = 'loading-pulse';
      loadTrack(track);
    }, 1000);

  } else {

    // if selected track doesn't exist something wrong happened so just disable all selection
    playButton.className = 'select-button disabled';
    for(var i in trackButtons)
      if(trackButtons[i].children)
        trackButtons[i].className = 'track-button';

  }
}

exitButton.addEventListener('click', returnToMenu);
function returnToMenu(){
  scoreScreen.style.opacity = 0;
  menu.style.display = 'block';
  menu.style.opacity = 1;
  darkenBG.style.display = 'block';
  darkenBG.style.opacity = 1;

  for(var i in trackButtons)
    if(trackButtons[i].children)
      trackButtons[i].className = 'track-button';
  playButton.className = 'select-button disabled';

  setTimeout(function(){
    scoreScreen.style.display = 'none';
  }, 500);
}

// This object keeps track of music synch
var Conductor = function(track){
  this.track = track;
  this.beatmap = track.beatmap;
  this.data = Object.assign({}, track.beatmap.data); // shallow clone
  this.bpm = track.beatmap.info.bpm;
  this.crochet = 60 * 1000 / this.bpm;
  this.offset = track.beatmap.info.offset;
  this.audio = track.audio;
  this.duration = track.beatmap.info.duration * 1000;
  this.startTime = 0;
  this.line = 0; // current line of the beatmap
}
Conductor.prototype.start = function(){
  this.startTime = Date.now() + 2100;
}
Conductor.prototype.getPosition = function(){
  return Date.now() - this.startTime - this.offset;
}
var conductor;

// begin loading a track
function loadTrack(track){
  var audioPromise = getTrackAudio(track);
  var beatmapPromise = getTrackBeatmap(track);

  Promise.all([audioPromise, beatmapPromise]).then(function(values){
    score = 0;
    combo = 0;
    highestCombo = 0;
    perfect = 0;
    good = 0;
    fair = 0;
    miss = 0;
    loadingView.style.className = '';
    loadingView.style.opacity = 0;
    app.renderer.view.style.opacity = 1;

    conductor = new Conductor(track);

    setTimeout(startTrack, 250);

  });
}

// load a track's audio, returns a promise
function getTrackAudio(track){
  if(!track.audio){
    return new Promise(function(resolve, reject){
      loader.add(track.name, '/racethebeat/media/' + track.audioURL);
      loader.load(function(loader, resource){
        track.audio = resource[track.name].data;
        resolve(1);
      });
    });
  } else {
    return Promise.resolve(2); // if already loaded just return
  }
}

// load a track's beatmap, returns a promise
function getTrackBeatmap(track){
  if(!track.beatmap){
    return new Promise(function(resolve, reject){
      // use xhr to load json
      var xhr = new XMLHttpRequest();
      xhr.open('GET', '/beatmaps/' + track.beatmapURL, true);
      xhr.responseType = 'json';
      xhr.onload = function(){
        if(xhr.status === 200){
          track.beatmap = xhr.response;
          resolve(1)
        } else reject();
      }
      xhr.send();
    });
  } else {
    return Promise.resolve(2);
  }
}

var graphics = new Graphics();
var score = 0;
var combo = 0;
var highestCombo = 0;
var perfect = 0;
var good = 0;
var fair = 0;
var miss = 0;

var infoStyle = new PIXI.TextStyle({
  fontFamily: 'Source Sans Pro',
  fontSize: 48,
  fill: '#ddd',
  fontWeight: 700
});
var scoreText = new Text('', infoStyle);

function startTrack(){
  loadingView.style.display = 'none';
  loadingView.style.display = 'none';
  app.stage.addChild(graphics);
  app.stage.addChild(scoreText);

  conductor.start();
  state = play;

  beginCountdown(function(){
    conductor.audio.play(0);
  });

}

function endTrack(){
  conductor.audio.pause();
  scoreScreen.style.display = 'block';
  scoreScreen.style.opacity = 0.8;

  scoreScreenTrackName.innerHTML = conductor.track.name;
  scoreScreenTrackArtist.innerHTML = conductor.track.artist;
  finalScore.innerHTML = score;
  finalCombo.innerHTML = highestCombo;
  finalPerfect.innerHTML = perfect;
  finalGood.innerHTML = good;
  finalFair.innerHTML = fair;
  finalMiss.innerHTML = miss;

  document.querySelectorAll('[data-id="' + selectedTrack + '"]')[0].children[2].innerHTML = score;

  state = inactive;
}

// the 3 2 1 countdown before song starts
function beginCountdown(callback){
  countdown.style.display = 'block';
  countdown.style.opacity = 0.4;
  countdown.innerHTML = 3;
  countdown.className = 'countdown-pulse';
  setTimeout(function(){ countdown.innerHTML = 2; }, 700);
  setTimeout(function(){ countdown.innerHTML = 1; }, 1400);
  setTimeout(function(){
    countdown.innerHTML = 'GO';
    callback();
  }, 2100);
  setTimeout(function(){
    countdown.style.display = 'none';
    countdown.className = '';
  }, 2800);
}

// game states
function inactive(){} // when not playing
function play(){
  drawTrack(conductor.getPosition() > 0);
  if(conductor.getPosition() > conductor.duration)
    endTrack();
}

function drawTrack(pulse){
  var pos = conductor.getPosition();
  var beatIntensity;
  var anchorX = renderer.width / 2 - 255;
  var anchorY = renderer.height / 2 + 300;
  if(pulse)
    beatIntensity = 1 - (pos % (conductor.crochet * 2)) / (conductor.crochet * 2);
  graphics.clear();

  // the four bars
  for(var i=0; i<4; i++){
    graphics.beginFill(0x000000, 0.5);
    var x = anchorX + (i - 2) * 130;
    graphics.drawRect(x + 5, 0, 120, renderer.height);
    if(pulse){
      graphics.beginFill(0xFFFFFF, 0.04 * beatIntensity);
      graphics.drawRect(x + 5, 0, 120, renderer.height);
    }
    graphics.endFill();
  }

  // beat lines
  graphics.lineStyle(2, 0xFFFFFF, 0.04);
  var baseline = (pos % (conductor.crochet * 2)) / (conductor.crochet * 2);
  for(var i = -2; i < 6; i++){
    var posY = anchorY - 300 * (1 - baseline + i) - 4;
    graphics.moveTo(anchorX - 255, posY);
    graphics.lineTo(anchorX - 135, posY);
    graphics.moveTo(anchorX - 125, posY);
    graphics.lineTo(anchorX - 5, posY);
    graphics.moveTo(anchorX + 5, posY);
    graphics.lineTo(anchorX + 125, posY);
    graphics.moveTo(anchorX + 135, posY);
    graphics.lineTo(anchorX + 255, posY);
  }

  // notes
  var currentPos = pos / conductor.crochet;
  var passed = false; // true if a note passes
  for(var i = 0; i < 24; i++){
    var line = conductor.data[conductor.line + i];
    if(line == null) break;
    if(line[0] > currentPos + 12) break;
    if(pos - line[0] * conductor.crochet > 250){
      for(var j = 0; j < 4; j++)
        if(line[j] === 1){
          combo = 0;
          miss++;
        }
      passed = true;
    }

    var posY = anchorY - 150 * (line[0] - currentPos) - 10;

    if(line[1] === 1){
      graphics.beginFill(0xBB6666, 1);
      graphics.drawRect(anchorX - 255, posY, 120, 14);
    }
    if(line[2] === 1){
      graphics.beginFill(0x66BB66, 1);
      graphics.drawRect(anchorX - 125, posY, 120, 14);
    }
    if(line[3] === 1){
      graphics.beginFill(0x6666BB, 1);
      graphics.drawRect(anchorX + 5, posY, 120, 14);
    }
    if(line[4] === 1){
      graphics.beginFill(0xBBBB66, 1);
      graphics.drawRect(anchorX + 135, posY, 120, 14);
    }
  }
  if(passed) conductor.line++;

  // color tabs
  graphics.beginFill(0xDD4444, 1);
  graphics.drawRect(anchorX - 258, anchorY + (Keys[A] ? 2 : 10), 126, 10);
  graphics.beginFill(0x44DD44, 1);
  graphics.drawRect(anchorX - 128, anchorY + (Keys[S] ? 2 : 10), 126, 10);
  graphics.beginFill(0x4444DD, 1);
  graphics.drawRect(anchorX + 2, anchorY + (Keys[D] ? 2 : 10), 126, 10);
  graphics.beginFill(0xDDDD44, 1);
  graphics.drawRect(anchorX + 132, anchorY + (Keys[F] ? 2 : 10), 126, 10);

  // the ending line
  graphics.lineStyle(Keys[32] ? 4 : 2, 0xDDDDDD, Keys[32] ? 1 : 0.5 + (pulse ? 0.1 * beatIntensity : 0));
  graphics.moveTo(anchorX - 255, anchorY);
  graphics.lineTo(anchorX + 255, anchorY);

  // show score
  scoreText.position.set(anchorX + 300, 50);
  scoreText.text = score + (combo > 1 ? '\nCOMBO x' + combo : '');
}

// keyboard events
var A = 65, S = 83, D = 68, F = 70;
var Keys = {};
window.addEventListener('keydown', function(e){
  if(e.keyCode === 32 && !Keys[32] && state === play) fireNote();
  if(e.keyCode === 27)
    endTrack();
  Keys[e.keyCode] = true;
});
window.addEventListener('keyup', function(e){
  Keys[e.keyCode] = false;
});

// when the player hits a note
function fireNote(){
  var fireSet = [Keys[A], Keys[S], Keys[D], Keys[F]];
  var pos = conductor.getPosition();

  for(var i = 0; i < 4; i++){
    var line = conductor.data[conductor.line + i];
    if(line == null) break;
    var dist = pos - line[0] * conductor.crochet;

    // check distance for score
    if(dist < 100 && dist > -250){
      for(var j = 0; j < 4; j++){
        if(fireSet[j] && line[j + 1] === 1){
          conductor.data[conductor.line + i][j + 1] = 2;
          fireSet[j] = false;

          if(Math.abs(dist < 50)){ // perfect
            combo++;
            perfect++;
            score += 50 * combo;
          } else if(dist < 100){ // good
            combo++;
            good++;
            score += 30 * combo;
          } else { // fair
            combo++;
            fair++;
            score += 10 * combo;
          }
        }
      }
    }
  }

  if(combo > highestCombo) highestCombo = combo;

  for(var i = 0; i < 4; i++)
    if(fireSet[i]){
      combo = 0; // miss
      miss++;
    }
}


// data for each track
var trackList = {
  1: {
    name: 'Monody',
    artist: 'TheFatRat',
    audioURL: 'monody.mp3',
    beatmapURL: 'monody.json',
    audio: false
  },
  2: {
    name: 'Break-A-Leg',
    artist: 'RoccoW',
    audioURL: 'breakaleg.mp3',
    beatmapURL: 'breakaleg.json',
    audio: false
  },
  3: {
    name: 'Six Shooter',
    artist: 'Coyote Kisses',
    audioURL: 'sixshooter.mp3',
    beatmapURL: 'sixshooter.json',
    audio: false
  },
  4: {
    name: 'Wonderwall',
    artist: 'Oasis',
    audioURL: 'wonderwall.mp3',
    beatmapURL: 'wonderwall.json',
    audio: false
  }
}
