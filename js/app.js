// jshint bitwise: false
// jshint camelcase: false

(function (window, document) {
  'use strict';

  var options = {
    speed: 3,
    trail: 0.013,
    ammount: 3000,
    collision: true,
    image: window.location.hash === '#webcam' ? 'use your webcam' : 'the-bathers',
    running: true,
    zoom: 1,
    resolution: 4,
    isVideo: false
  };

  var _running;

  var maxParticles = 60000;
  var buffer = new ArrayBuffer(1<<21);

  var size = 0;
  var pos = new Uint32Array(maxParticles);
  var lastxArray = new Float64Array(maxParticles);
  var lastyArray = new Float64Array(maxParticles);
  var xArray = new Float64Array(maxParticles);
  var yArray = new Float64Array(maxParticles);
  var vxArray = new Float64Array(maxParticles);
  var vyArray = new Float64Array(maxParticles);
  var colorsArray = new Uint32Array(maxParticles);
  var particles = new Uint16Array(maxParticles);

  var width = 533;
  var height = 400;

  var canvas = document.querySelector('canvas');
  var context = canvas.getContext('2d');

  var _canvas = document.createElement('canvas');
  var _context = _canvas.getContext('2d');

  var preview = document.querySelector('.preview');
  var video = document.querySelector('video');
  var webcam = document.querySelector('.webcam');

  var data = [];

  var fadeCanvas = function () {
    context.fillRect(0, 0, width, height);
  };

  var renderImage = function (image, preventClear) {
    var res = options.resolution;
    var id;
    var c;
    var ctx;
    var i, j, l, d, w, h;

    if (preventClear) {
      c = _canvas;
      ctx = _context;
    } else {
      c = canvas;
      ctx = context;
    }

    w = c.width = image.width * options.zoom;
    h = c.height = image.height * options.zoom;
    ctx.drawImage(image, 0, 0, w, h);
    id = ctx.getImageData(0, 0, w, h).data;

    l = id.length >> 2;
    d = new Uint16Array(buffer, 0, l);

    for (i = 0, j = 0; i < l; i++, j += 4) {
      d[i] = ((id[j] >> res) << 10) | ((id[j+1] >> res) <<5) | (id[j+2] >> res);
    }

    ctx.clearRect(0, 0, w, h);
    data = d;
    width = w;
    height = h;
  };

  var createParticle = function (size) {
    var x = Math.random() * width;
    var y = Math.random() * height;

    lastxArray[size] = x;
    lastyArray[size] = y;
    xArray[size] = x;
    yArray[size] = y;
    vxArray[size] = Math.random() - 0.5;
    vyArray[size] = Math.random() - 0.5;
    particles[size] = size;
  };

  var moveParticle = function moveParticle(i) {
    var xa = xArray;
    var ya = yArray;
    var vxa = vxArray;
    var vya = vyArray;
    var opt = options;
    var w = width;
    var h = height;

    var lastX = xa[i];
    var lastY = ya[i];

    var vx = vxa[i];
    var vy = vya[i];

    var x = lastX + vx * opt.speed;
    var y = lastY + vy * opt.speed;

    if (x >= w) {
      x = w-1;
      vx = -vx;
    } else if (x < 0) {
      x = 0;
      vx = -vx;
    }

    if (y >= h) {
      y = h-1;
      vy = -vy;
    } else if (y < 0) {
      y = 0;
      vy = -vy;
    }

    var _pos = (y>>0)*w+(x>>0);

    lastxArray[i] = lastX;
    lastyArray[i] = lastY;
    xa[i] = x;
    ya[i] = y;
    vxa[i] = vx;
    vya[i] = vy;
    colorsArray[i] = data[_pos];
    pos[i] = _pos;
  };

  var scaleSystem = function (count) {
    for (var i = 0; i < count; i++) {
      createParticle(i);
    }
    size = count;
  };

  var findAnAngle = function (vx, vy) {
    var pi = Math.PI;

    if (vy > 0) {
      return Math.atan2(vy, vx);
    } else if (vx === 0) {
      return (vy > 0 ? pi : -pi) / 2;
    } else if (vy === 0) {
      return pi;
    } else {
      return pi + pi + Math.atan2(vy, vx);
    }
  };

  var checkCollision = function checkCollision (a, b) {
    var xa = xArray;
    var ya = yArray;
    var vxa = vxArray;
    var vya = vyArray;

    var ax = xa[a];
    var ay = ya[a];
    var bx = xa[b];
    var by = ya[b];

    var dx = ax - bx;
    var dy = ay - by;
    if (dx * dx + dy * dy <= 1) {
      var phi;
      var avx = vxa[a];
      var avy = vya[a];
      var bvx = vxa[b];
      var bvy = vya[b];

      if (dx === 0) {
        phi = Math.PI / 2;
      } else {
        phi = Math.atan2(dy, dx);
      }

      var aang = findAnAngle(avx, avy);
      var bang = findAnAngle(bvx, bvy);

      var v1 = Math.sqrt(avx * avx + avy * avy);
      var v2 = Math.sqrt(bvx * bvx + bvy * bvy);

      var s_phi = Math.sin(phi);
      var c_phi = Math.cos(phi);
      var s_a_phi = Math.sin(aang-phi);
      var s_b_phi = Math.sin(bang-phi);
      var c_a_phi = Math.cos(aang-phi);
      var c_b_phi = Math.cos(bang-phi);
      var s_phi_pi2 = Math.sin(phi+Math.PI / 2);
      var c_phi_pi2 = Math.cos(phi+Math.PI / 2);

      vxa[a] = v2 * c_b_phi * c_phi + v1 * s_a_phi * c_phi_pi2;
      vya[a] = v2 * c_b_phi * s_phi + v1 * s_a_phi * s_phi_pi2;
      vxa[b] = v1 * c_a_phi * c_phi + v2 * s_b_phi * c_phi_pi2;
      vya[b] = v1 * c_a_phi * s_phi + v2 * s_b_phi * s_phi_pi2;
    }
  };

  var backToRun = function () {
    options.running = _running;
  };

  var loadedMetaData = function () {
    setTimeout(backToRun, /firefox/i.test(navigator.userAgent) ? 1000 : 0);
  };

  var hasUserMedia = function (localMediaStream) {
    var v = video;

    v.src = window.URL.createObjectURL(localMediaStream);
    v.onloadedmetadata = loadedMetaData;
  };

  var logError = function(err) {
    console.error(err);
  };

  var loadImage = function loadImage(image) {
    var opt = options;
    var c = canvas;
    var v =  video;

    if (image === 'use your webcam') {
      _running = opt.running;

      opt.isVideo = true;
      c.width = v.width;
      c.height = v.height;
      opt.running = false;

      preview.style.display = 'none';
      v.style.display = '';

      window.navigator.getUserMedia({ video: true }, hasUserMedia, logError);

      return;
    } else {
      opt.isVideo = false;
      preview.style.display = '';
      video.style.display = 'none';
    }

    function onload() {
      renderImage(preview, false);
      trailChanged(opt.trail);
    }
    preview.src = 'images/' + image + '.jpg';

    if (preview.complete) {
      onload();
    } else {
      preview.onload = onload;
    }
  };

  var trailChanged = function trailChanged(trail) {
    context.fillStyle = 'rgba(0,0,0,'+trail+')';
  };

  var imageSelect = (function (dat, options, video, preview) {
    var gui = new dat.GUI();

    gui.add(options, 'speed', 1, 10);

    var listeners = {
      trail: gui.add(options, 'trail', 0.01, 0.5),
      ammount: gui.add(options, 'ammount', 1, maxParticles).step(1),
      image: gui.add(options, 'image', [
        'use your webcam',
        'the-bathers',
        'at-the-moulin-rouge',
        'the-starry-night',
        'senecio',
        'mother-and-child',
        'still-life-with-a-guitar'
      ]),
      zoom: gui.add(options, 'zoom', {
        '25%': 0.25,
        '50%': 0.5,
        '100%': 1,
        '150%': 1.5,
        '200%': 2,
      }),
      resolution: gui.add(options, 'resolution', {
        low: 5,
        medium: 4,
        high: 3
      })
    };

    gui.add(options, 'collision');
    listeners.running = gui.add(options, 'running');

    listeners.trail.onChange(trailChanged);
    listeners.image.onChange(loadImage);
    listeners.ammount.onChange(scaleSystem);
    listeners.zoom.onChange(function (zoom) {
      options.zoom = parseFloat(zoom);
      loadImage(options.image);
    });
    listeners.running.onChange(function (running) {
      if (running) {
        video.play();
      } else {
        video.pause();
      }
    });
    listeners.resolution.onChange(function (res) {
      options.resolution = parseInt(res, 10);
      if (!options.isVideo) {
        renderImage(preview, true);
      }
    });

    return listeners.image;
  })(window.dat, options, video, preview);

  var stats = (function (Stats) {
    var stats = new Stats();
    stats.domElement.style.position = 'fixed';
    stats.domElement.style.right = '0px';
    stats.domElement.style.bottom = '0px';
    document.body.appendChild(stats.domElement);

    return stats;
  })(window.Stats);


  trailChanged(options.trail);
  scaleSystem(options.ammount);
  loadImage(options.image);

  var incs = new Uint32Array([1391376, 463792, 198768, 86961, 33936, 13776, 4592, 1968, 861, 336, 112, 48, 21, 7, 3, 1]);
  var count = new Uint16Array(1<<16);
  var draws = new Uint16Array(maxParticles);

  var render = function () {
    var ctx = context;
    var opt = options;
    var d = draws;
    var c = count;
    var ii = incs;
    var ca = colorsArray;
    var ps = particles;
    var xa = xArray;
    var ya = yArray;
    var lxa = lastxArray;
    var lya = lastyArray;
    var res = opt.resolution;
    var l = size;

    var h, i, j, k, _v, v, p, color, r, g, b;

    if (opt.running) {
      stats.begin();

      if (opt.isVideo) {
        renderImage(video, true);
        trailChanged(opt.trail);
      }

      fadeCanvas();

      if (opt.collision) {
        for (k = 0; k < 16; k++) {
          for (h = ii[k], i = h; i < l; i++) {
            _v = ps[i];
            v = pos[_v];
            j = i;

            while (j >= h && pos[ps[j - h]] > v) {
              ps[j] = ps[j - h];
              j -= h;
            }

            ps[j] = _v;
          }
        }
      }

      for (i = 1; i < 1<<16; i++) {
        c[i] = 0;
      }
      for (i = 0; i < l; i++) {
        p = ps[i];
        if (i+1 < l && opt.collision) {
          checkCollision(p, ps[i+1]);
        }

        moveParticle(p);
        color = ca[p];

        c[color]++;
      }

      for (i = 1; i < 1<<16; i++) {
        c[i] += c[i-1];
      }

      for (i = 0; i < l; i++) {
        d[--c[ca[ps[i]]]] = ps[i];
      }

      var prevColor = -1;
      for (i = 0; i < l; i++) {
        p = d[i];
        color = ca[p];

        if (color !== prevColor) {
          ctx.stroke();

          r = color >> 10;
          g = (color >> 5) & 31;
          b = color & 31;

          ctx.strokeStyle = 'rgb('+(r << res)+', '+(g << res)+', '+(b << res)+')';
          ctx.beginPath();
          prevColor = color;
        }

        var lastX = lxa[p];
        var lastY = lya[p];
        var x = xa[p];
        var y = ya[p];

        ctx.moveTo(lastX, lastY);
        ctx.lineTo(x, y);
      }

      ctx.stroke();
      stats.end();
    }

    window.requestAnimationFrame(render);
  };

  webcam.onclick = function (e) {
    e.preventDefault();
    loadImage((options.image = 'use your webcam'));
    imageSelect.updateDisplay();
  };

  window.navigator.getUserMedia = (navigator.getUserMedia ||
                                   navigator.webkitGetUserMedia ||
                                   navigator.mozGetUserMedia ||
                                   navigator.msGetUserMedia);
  window.requestAnimationFrame(render);
})(window, document);
