(function (window, document) {
  'use strict';

  var options = {
    speed: 3,
    trail: 0.01,
    ammount: 1500,
    collision: true,
    image: 'the-bathers',
    running: true
  };

  var width = 640;
  var height = 400;

  var gui = new dat.GUI();
  gui.add(options, 'speed', 1, 10);
  gui.add(options, 'trail', 0.001, 0.5);
  var ammountSelect = gui.add(options, 'ammount', 1, 6000).step(1);
  var imageSelect = gui.add(options, 'image', [
    'the-bathers',
    'at-the-moulin-rouge',
    'the-starry-night',
    'senecio',
    'mother-and-child',
    'still-life-with-a-guitar'
  ]);
  gui.add(options, 'collision');
  gui.add(options, 'running');

  var stats = new Stats();
  stats.domElement.style.position = 'absolute';
  stats.domElement.style.right = '0px';
  stats.domElement.style.bottom = '0px';
  document.body.appendChild(stats.domElement);

  var Canvas = (function () {
    var canvas = document.querySelector('canvas');
    var context = canvas.getContext('2d');

    var line = function (fromX, fromY, toX, toY) {
      context.beginPath();
      context.moveTo(fromX, fromY);
      context.lineTo(toX, toY);
      context.closePath();
      context.stroke();
    };

    var setColor = function (property) {
      return function (r, g, b, a) {
        context[property] = 'rgba('+r+', '+g+', '+b+', '+a+')';
      };
    };

    var fade = function () {
      setColor('fillStyle')(0, 0, 0, options.trail);
      context.fillRect(0, 0, canvas.width, canvas.height);
    };

    var render = function (image) {
      width = canvas.width = image.width;
      height = canvas.height = image.height;
      context.drawImage(image, 0, 0);

      var data = context.getImageData(0, 0, image.width, image.height).data;
      context.clearRect(0, 0, image.width, image.height);
      return data;
    };

    return {
      line: line,
      setStroke: setColor('strokeStyle'),
      setFill: setColor('fillStyle'),
      fade: fade,
      render: render,
      ctx: context
    };
  })();

  function Particle() {
    this.lastX = this.x = Math.random() * Canvas.getWidth();
    this.lastY = this.y = Math.random() * Canvas.getHeight();

    this.vx = Math.random() - 0.5;
    this.vy = Math.random() - 0.5;
  }

    Particle.prototype.move = function () {
      this.lastX = this.x;
      this.lastY = this.y;

      this.x += this.vx * options.speed;
      this.y += this.vy * options.speed;

    if (this.x > width) {
      this.x = width;
      this.vx *= -1;
    } else if (this.x < 0) {
      this.x = 0;
      this.vx *= -1;
    }

    if (this.y > height) {
      this.y = height;
      this.vy *= -1;
    } else if (this.y < 0) {
      this.y = 0;
      this.vy *= -1;
    }
  };

    Particle.prototype.render = function () {
      Canvas.line(this.lastX, this.lastY, this.x, this.y);
    };

    Particle.prototype.linearPosition = function () {
      return this.y * Canvas.getWidth() + this.x;
    };

  function ParticleSystem() {
    this.set = [];
    this.data = [];
    this.preview = document.querySelector('.preview');
    this.loadImage();

  }

  ParticleSystem.prototype.load = function (count) {
    var l  = this.set.length;

    if (count < l) {
      this.set = this.set.slice(0, count);
    } else if (count > l) {
      for (var i = l; i < count; i++) {
        this.set.push(new Particle());
      }
    }
  };

  ParticleSystem.prototype.render = function () {
    if (options.collision) {
      this.checkCollisions();
    }

    var w = width;
    for (var i = 0, l = this.set.length; i < l; i++) {
      var p = this.set[i];
      p.move();
      var index = (Math.round(p.y) * 4 * w) + (Math.round(p.x) * 4);

      var d = this.data;
      var r = d[index];
      var g = d[index+1];
      var b = d[index+2];

      Canvas.ctx.strokeStyle = 'rgba('+r+', '+g+', '+b+', 1)';
      p.render();
    }
  };

  ParticleSystem.prototype.checkCollisions = function () {
    this.set = this.set.sort(function (pa, pb) {
      return pa.linearPosition() - pb.linearPosition();
    });

    for (var i = 0, l = this.set.length - 1; i < l; i++) {
      let a = this.set[i];
      let b = this.set[i+1];

      if (Math.abs(a.x - b.x) <= 1 && Math.abs(a.y - b.y) <= 1) {
        var tanA = a.vy / a.vx;
        var tanB = b.vy / b.vx;

        var v1 = Math.sqrt(a.vx * a.vx + a.vy * a.vy);
        var v2 = Math.sqrt(b.vx * b.vx + b.vy * b.vy);

        var aangle, bangle;

        if (tanA === 0) {
          aangle = (a.vy > 0 ? 1 : -1) * Math.PI / 2;
        } else {
          aangle = Math.atan(tanA);
        }

        if (tanB === 0) {
          bangle = (b.vy > 0 ? 1 : -1) * Math.PI / 2;
        } else {
          bangle = Math.atan(tanB);
        }

        if (a.vx < 0) {
          aangle += Math.PI;
        }
        if (b.vx < 0) {
          bangle += Math.PI;
        }

        var phi;
        var dx = a.vx - b.vx;
        var dy = a.vy - b.vy;
        if (dx === 0) {
          phi = Math.PI / 2;
        } else {
          phi = Math.atan2(dy, dx);
        }

        var v1xr = v1 * Math.cos(aangle - phi);
        var v1yr = v1 * Math.sin(aangle - phi);
        var v2xr = v2 * Math.cos(bangle - phi);
        var v2yr = v2 * Math.sin(bangle - phi);

        a.vx = v2xr;
        a.vy = v1yr;
        b.vx = v1xr;
        b.vy = v2yr;
      }
    }
  };

    ParticleSystem.prototype.loadImage = function () {
      var that = this;
      this.preview.onload = function () {
        that.data = Canvas.render(that.preview);
      };
      this.preview.src = 'images/' + options.image + '.jpg';
    };

  var system = new ParticleSystem();
  var resize = function (ammount) {
    system.load(ammount);
  };
  resize(options.ammount);

  imageSelect.onChange(function () {
    system.loadImage();
  });
  ammountSelect.onChange(resize);

  var render = function () {
    if (options.running) {
      stats.begin();

      Canvas.fade();
      system.render();

      stats.end();
    }

    window.requestAnimationFrame(render);
  };

  window.requestAnimationFrame(render);
})(window, document);
