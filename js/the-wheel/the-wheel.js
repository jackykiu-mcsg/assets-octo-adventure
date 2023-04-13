// A new version of the Wheel, made with CSS (not kinetic js), for much better performance!

// eslint-disable-next-line max-statements
PBS.KIDS.define([ 'jquery' ], function($) {
  // after touch+drag, how much speed (as percentage) is lost per second. 1.0 = no speed lost, 0.0 = all speed lost
  var wheelFriction = 0.1;

  var constantSpinVelocityDegreesPerSecond = 60;

  var debugMsgs = location.search.match(/\bdebugMsgs\b/);

  // function makeLogger(name, level) {
  //   level = level || 'log';
  //   return function() {
  //     if (debugMsgs || level !== 'log') {
  //       var args = Array.prototype.slice.call(arguments);
  //       args.unshift('PBS.KIDS.' + name);
  //       console[level].apply(null, args);
  //     }
  //   };
  // }

  // var log = makeLogger('the-wheel');
  // var error = makeLogger('the-wheel', 'error');

  function getDebugValueFromQueryString(name) {
    var output;
    var qsName = 'debug' + name.substring(0, 1).toUpperCase() + name.substring(1);
    var fromQueryStr = deepValue('2', location.search.match(RegExp(
      '(\\b|\&)' + qsName + '=([^\\b\\&]+)'
    )));
    if (fromQueryStr !== 'undefined') {
      try {
        output = JSON.parse(fromQueryStr);
      } catch (e) {
        output = fromQueryStr;
      }
    }
    if (typeof output !== 'undefined') {
      log('getDebugValueFromQueryString() :', name + ' is set to ' + output + ' (' + typeof output + ')');
    }
    return output;
  }

  function toggleClass(el, cls, state) {
    if (!el) return;
    if (state) {
      el.classList.add(cls);
    } else {
      el.classList.remove(cls);
    }
  }

  function $sel(sel, parent) {
    if (!parent) parent = document;
    if (sel === '::self::') return [ parent ];
    return Array.prototype.slice.call(
      parent.querySelectorAll(sel)
    );
  }

  function $selOne(sel, parent) {
    return $sel(sel, parent)[0];
  }

  function shuffle(array) {
    var currentIndex = array.length;
    var temporaryValue; var randomIndex;

    // While there remain elements to shuffle...
    while (0 !== currentIndex) {
      // Pick a remaining element...
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex -= 1;

      // And swap it with the current element.
      temporaryValue = array[currentIndex];
      array[currentIndex] = array[randomIndex];
      array[randomIndex] = temporaryValue;
    }
    return array;
  }

  function outerWidth(el) {
    var width = el.offsetWidth;
    var style = getComputedStyle(el);

    width += parseInt(style.marginLeft) + parseInt(style.marginRight);
    return width;
  }

  function snapToGrid(val, gridSize) {
    return gridSize * Math.round(val / gridSize);
  }

  function getLocalCoords(parent, e) {
    var offset = parent.getBoundingClientRect();
    var eventData = e.touches && e.touches[0] ? e.touches[0] : e;
    var x = (eventData.clientX - offset.left) - (parent.offsetWidth / 2);
    var y = -1 * ((eventData.clientY - offset.top) - (parent.offsetHeight));
    return {
      x: x,
      y: y,
    };
  }

  function getRotationAngle(el) {
    var parseTransform = el.style.transform.match(/[\-0-9]+/);
    var angle = parseTransform && parseTransform[0] ? parseInt(parseTransform[0]) : null;

    if (angle !== null) return angle;

    // obtained following code from https://css-tricks.com/get-value-of-css-rotation-through-javascript/
    var st = window.getComputedStyle(el, null);
    var tr = st.getPropertyValue('-webkit-transform') ||
        st.getPropertyValue('-moz-transform') ||
        st.getPropertyValue('-ms-transform') ||
        st.getPropertyValue('-o-transform') ||
        st.getPropertyValue('transform') ||
        'FAIL';

    // rotation matrix - http://en.wikipedia.org/wiki/Rotation_matrix
    var values = tr.split('(')[1].split(')')[0].split(',');
    var a = values[0];
    var b = values[1];

    // next line works for 30deg but not 130deg (returns 50);
    // angle = Math.round(Math.asin(sin) * (180/Math.PI));
    angle = Math.atan2(b, a) * (180 / Math.PI);

    return angle;
  }

  function debounce(func, wait, immediate) {
    var timeout;
    return function() {
      var context = this; var args = arguments;
      var later = function() {
        timeout = null;
        if (!immediate) func.apply(context, args);
      };
      var callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      if (callNow) func.apply(context, args);
    };
  }

  function randomizePreservingTiers(shows) {
    return shuffle(shows).sort(function(a, b) {
      if (a.tier < b.tier) return -1;
      if (a.tier > b.tier) return 1;
      return 0;
    });
  }

  function createShowButton(show, index, wrapperClass, innerClassName) {
    var showBtn = document.createElement('a');
    showBtn.className = 'item';
    showBtn.setAttribute('href', show.href.replace(/http\:\/\//, 'https://'));
    showBtn.setAttribute('data-index', index);
    if (show.tier) {
      showBtn.setAttribute('data-tier', show.tier);
    }
    if (show.image) {
      showBtn.setAttribute('title', show.title);
      showBtn.style.backgroundImage = 'url(\'' + show.image + '\')';
    } else {
      showBtn.innerHTML = show.title;
    }
    var wrapper = document.createElement('div');
    wrapper.className = wrapperClass || 'item-wrapper';
    var inner = document.createElement('div');
    inner.className = innerClassName || 'item-inner';
    inner.appendChild(showBtn);
    wrapper.appendChild(inner);
    return wrapper;
  }

  function addWedgeEventListeners(wheel, wedges, showBtn, titleText) {
    var innerCircle = $selOne('.wheel-inner-circle', wheel);

    if (!$selOne('html').classList.contains('touch')) {
      addListener(showBtn, 'mouseenter', function() {
        var title = $selOne('a', showBtn).getAttribute('title');
        titleText.innerHTML = title;
        titleText.style.display = 'block';

        var wedgeRadius = outerWidth(wedges) / 2;
        var innerCircleWidth = outerWidth(innerCircle) / 2;
        titleText.style.fontSize = (wedgeRadius / (innerCircleWidth / 10)) + 'px';

        while (titleText.offsetHeight > (innerCircleWidth / 2) * .8) {
          titleText.style.fontSize = (parseInt(titleText.style.fontSize) - 1) + 'px';
        }

        // center vertically
        titleText.style.top = 'auto';
        titleText.style.bottom = (
          Math.floor(
            wedgeRadius
              + ((innerCircleWidth - titleText.offsetHeight) / 2)
              - parseInt(getComputedStyle(innerCircle).borderTopWidth)
          )
        ) + 'px';
      });

      addListener(showBtn, 'mouseleave', function() {
        titleText.style.display = 'none';
      });
    }
    return showBtn;
  }

  function populateWheel(wheel, config) {
    if (config && config.shows && config.shows.length) {
      var wedges = $selOne('.wedges', wheel);
      var slider = $selOne('.slider', wheel);
      var titleText = $selOne('.show-title-text', wheel);
      var randomMode = location.search.match(/\bdebugRandom=off\b/);

      slider.appendChild(
        createShowButton(
          {
            'title': 'All Shows',
            'href': 'https://pbskids.org/everything/',
          },
          -1,
          'item-wrapper all-shows'
        )
      );

      (randomMode ? config.shows : randomizePreservingTiers(config.shows))
        .forEach(function(show, index) {
          // populate circular wheel menu
          wedges.appendChild(
            addWedgeEventListeners(
              wheel,
              wedges,
              createShowButton(show, index, 'wedge-wrapper', 'wedge'),
              titleText
            )
          );

          // populate slider
          slider.appendChild(
            createShowButton(show, index)
          );
        });

      shiftShows(wheel, getRotationAngle(wedges));
    }
  }

  function initRotationState(wheel) {
    if (wheel._rotationState) {
      return wheel._rotationState;
    }
    var wedges = $selOne('.wedges', wheel);
    var showSlots = $sel('.wedge', wheel);
    var initialShowOrder = showSlots.map(function(slot) {
      return $selOne('[data-index]', slot);
    });
    var startingAngle = getRotationAngle(wedges);
    var slotCount = getWedgeCount(wheel);

    return wheel._rotationState = {
      element: wedges,
      wrapper: $selOne('#the-wheel-canvas'),

      initialTheta: startingAngle,
      initialShowOrder: initialShowOrder,
      slotCount: slotCount,
      showSlots: showSlots,
      lastShiftSlots: null,

      starting: startingAngle,
      startingMouse: null,

      // the angle of the wheel.
      theta: startingAngle,

      // the angular velocity of the wheel
      v_theta: 1,

      // how much speed (as percentage) is lost per second. 1.0 = no speed lost, 0.0 = all speed lost
      friction: wheelFriction,
    };
  }

  function getRotationState(wheel) {
    return initRotationState(wheel);
  }

  function loop(value, max) {
    if (value < 0) {
      while (value < 0) {
        value += max;
      }
    } else if (value >= max) {
      while (value >= max) {
        value -= max;
      }
    }
    return value;
  }

  function getShowIndex(el) {
    return el ? el.getAttribute('data-index') : 'undefined';
  }

  function getOrderStr(arr) {
    return arr.map(function(item) {
      return getShowIndex(item);
    }).join(',');
  }

  // as the circle turns, make the 25 shows fit into the 18 slots
  function shiftShows(wheel, destTheta) {
    var state = getRotationState(wheel);
    var deltaFromInitial = destTheta - state.initialTheta;
    var singleSlotTheta = 360 / state.slotCount;
    var shiftSlots = -1 * Math.floor(deltaFromInitial / singleSlotTheta);

    if (shiftSlots !== state.lastShiftSlots) {
      var visibleCount = Math.ceil(state.slotCount / 2);
      var newOrder = Object.assign([], state.initialShowOrder);
      var border = -Math.floor(visibleCount / 2);
      var start = border;
      var end = start + state.slotCount;

      for (var i = start; i < end; i++) {
        var replaceNew = loop(shiftSlots + i, state.slotCount);
        var withOld = loop(shiftSlots + i, state.initialShowOrder.length);
        newOrder[replaceNew] = state.initialShowOrder[withOld];
      }

      var currentOrder = state.showSlots.map(function(slot) {
        return $selOne('[data-index]', slot);
      });
      var noChange = getOrderStr(currentOrder) === getOrderStr(newOrder);

      if (!noChange) {
        state.showSlots
          .slice(0, state.slotCount)
          .forEach(function(slot, index) {
            var thisItem = newOrder[index];
            $sel('[data-index]:not([data-index="' + getShowIndex(thisItem) + '"])', slot).map(function(existing) {
              existing.style.display = 'none';
              wheel.appendChild(existing);
            });
            if (
              thisItem &&
              !$selOne('[data-index][data-index="' + getShowIndex(thisItem) + '"]', slot)
            ) {
              thisItem.style.display = 'block';
              slot.appendChild(thisItem);
            }
          });
      }
    }
    state.lastShiftSlots = shiftSlots;
  }

  function getWedgeCount(wheel) {
    return $sel('.wedge-wrapper', wheel).filter(function(el) {
      return el.offsetWidth > 0;
    }).length;
  }

  function toggleTransitions(wheel, onState, duration) {
    var state = getRotationState(wheel);
    if (onState) {
      state.element.style.transition = 'transform ' + duration + 'ms';
    } else {
      state.element.style.transition = 'none';
    }
  }

  function setWheelAngle(wheel, angle) {
    var state = getRotationState(wheel);
    state.element.style.transform = 'rotate(' + angle + 'deg)';
    state.theta = angle;
  }

  function rotateWheelTo(wheel, destAngle, duration, callback) {
    var delay = 5;
    var state = getRotationState(wheel);
    var cb = function() {
      if (typeof callback === 'function') {
        setTimeout(function() {
          callback();
        }, 1);
      }
    };

    if (duration) {
      state.transitioning = true;
      toggleTransitions(wheel, true, duration);
    }
    requestAnimationFrame(function() {
      setWheelAngle(wheel, destAngle);

      if (duration) {
        var timeToShift = Math.floor((duration + delay) / state.slotCount);
        for (var i = 1; i <= state.slotCount + 1; i++) {
          setTimeout(function() {
            shiftShows(wheel, destAngle);
          }, timeToShift * i);
        }
        setTimeout(function() {
          state.transitioning = false;
          state.theta = destAngle;
          toggleTransitions(wheel, false, duration);
          cb();
        }, delay + duration);
      } else {
        shiftShows(wheel, destAngle);
        cb();
      }
    });
  }

  function rotateWheelConstantRate(wheel, velocity) {
    var state = initRotationState(wheel);
    var targetFps = 60;
    var incrementAngle = velocity / targetFps;
    var rotationInterval;
    function next() {
      if (!state.transitioning) {
        cancelAnimationFrame(rotationInterval);
      } else {
        return requestAnimationFrame(function() {
          shiftShows(wheel, state.theta + incrementAngle);
          setWheelAngle(wheel, state.theta + incrementAngle);
          rotationInterval = next();
        });
      }
    }
    return function() {
      state.transitioning = true;
      state.allowFreeSpin = true;
      rotationInterval = next();
    };
  }

  function stopWheelConstantRate(wheel) {
    var state = initRotationState(wheel);
    return function() {
      state.transitioning = false;
    };
  }

  function rotateWheelXWedges(wheel, increment) {
    var state = initRotationState(wheel);

    return function() {
      if (state.transitioning || state.rotatingOnInterval) return;

      state.stopPrevMomentum = true;

      var incrementAngle = (360 / state.slotCount) * increment;
      setTimeout(function() {
        state.rotatingOnInterval = true;
        rotateWheelTo(wheel, getRotationAngle(state.element) + incrementAngle, 500, function() {
          state.rotatingOnInterval = false;
        });
      }, 5);
    };
  }

  function getNavBtn(wheel, type, dir) {
    return $selOne('[data-nav="' + type + '"] [data-nav-direction="' + dir + '"]', wheel);
  }

  function updateSliderNavBtns(wheel) {
    var slider = $selOne('.slider', wheel);
    toggleClass(
      getNavBtn(wheel, 'slider', 'right'),
      'disabled',
      (slider.scrollLeft === slider.scrollWidth - slider.offsetWidth)
    );
    toggleClass(
      getNavBtn(wheel, 'slider', 'left'),
      'disabled',
      (slider.scrollLeft === 0)
    );
  }

  function slideSlider(wheel, slider, increment) {
    var anItem = $selOne('.item-wrapper', slider);
    var navButton = $selOne('.nav-btn', wheel);
    var sliderWrapper = $selOne('.slider-wrapper', wheel);

    return function() {
      var wrapperWidth = sliderWrapper.offsetWidth;
      var itemWidth = outerWidth(anItem);
      var itemsWide = Math.floor((wrapperWidth - (navButton.offsetWidth * 2)) / itemWidth);

      var delta = Math.ceil(itemWidth * itemsWide);
      if (increment < 0) {
        delta = delta * -1;
      }
      var dest = slider.scrollLeft + delta;
      if (dest < 0) {
        dest = 0;
      }
      if (dest > slider.scrollWidth) {
        dest = slider.scrollWidth;
      } else {
        dest = snapToGrid(dest, itemWidth * itemsWide);
      }
      if (typeof slider.scrollTop === 'function') {
        slider.scrollTo(dest, 0);
      } else {
        slider.scrollLeft = dest;
      }
    };
  }

  function trackClicksOn(wheel, links, desc, msg) {
    var state = getRotationState(wheel);
    var arg1 = 'Wheel';
    if (typeof $ !== 'function') {
      error('jQuery is not found. Click tracking is subsequently broken!');
    } else if (typeof window.GA_obj !== 'undefined') {
      if (!Array.isArray(links)) links = [ links ];
      links.forEach(function(link) {
        // prevent Firefox's image dragging behavior
        addListener(link, 'mousedown', function(e) {
          e.preventDefault();
        });

        addListener(link, 'click', function(e) {
          var arg2 = desc;
          var url = link ? link.getAttribute('href') : null;
          if (url) {
            e.preventDefault();

            if (state.rotatedByHand) {
              log('prevented a likely accidental "click"');
              return;
            }

            var arg3 = msg.replace(/\[link_href\]/g, url) + ' | ' + $(window).width() + 'x' + $(window).height();

            if (location.search.match(/\bdebugGA\b/)) {
              log('tracking!', [ arg1, arg2, arg3 ]);
            } else {
              PBS.KIDS.trackEvent(arg1, arg2, arg3);
              setTimeout(function() {
                window.parent.location = url;
              }, 100);
            }
          } else {
            error('no URL found to link to/track.');
          }
        });
      });
    } else {
      error('GA_obj is not defined. Click tracking is subsequently broken!');
    }
  }

  function addListener(el, event, fn) {
    if (!el) return;
    event.split(' ').forEach(function(name) {
      el.addEventListener(name, fn);
    });
  }

  // reference:
  // https://stackoverflow.com/questions/322378/javascript-check-if-mouse-button-down
  function mouseButtonIsDown(e) {
    var buttonIsDown = (
      e.constructor.name === 'MouseEvent' &&
        (typeof e.buttons !== 'undefined' ? e.buttons : e.which)
    );
    return e.constructor.name !== 'MouseEvent' || buttonIsDown;
  }

  function getLastObject(arr, back) {
    var last = arr[arr.length - 1 - (back || 0)];
    return last ? last : {};
  }

  function toggleInnerCircleTouchability(wheel, on) {
    $selOne('.wheel-inner-circle', wheel).style.pointerEvents = on ? 'auto' : 'none';
  }

  function handleCircleNavArrowTouchBegin(wheel, state, velocity) {
    return function() {
      if (state.delayedConstantRotation) clearTimeout(state.delayedConstantRotation);
      stopWheelConstantRate(wheel)();
      state.delayedConstantRotation = setTimeout(function() {
        rotateWheelConstantRate(wheel, velocity)();
      }, 250);
    };
  }

  function handleCircleNavArrowTouchEnd(wheel, state, increment) {
    return function() {
      if (state.delayedConstantRotation) clearTimeout(state.delayedConstantRotation);
      if (state.transitioning) {
        stopWheelConstantRate(wheel)();
      } else {
        rotateWheelXWedges(wheel, increment)();
      }
    };
  }

  function attachListeners(wheel, instanceConfig) {
    var state = getRotationState(wheel);
    var wedges = state.element;

    addListener(window, 'resize orientationchange', debounce(function() {
      applyMode(wheel, instanceConfig);
      state.slotCount = getWedgeCount(wheel);
    }, 100));

    addListener(wedges, 'touchmove mousemove', function(e) {
      if (!state.allowFreeSpin || !mouseButtonIsDown(e)) {
        state.allowFreeSpin = false;
        return;
      }

      e.preventDefault();

      var nowCoords = getLocalCoords(wheel, e);

      if (nowCoords.y < 0) return;

      state.stopPrevMomentum = false;

      // methodology for this here:
      // https://www.omnicalculator.com/math/right-triangle-side-angle#how-to-find-the-angle-of-a-right-triangle
      var angle = Math.atan2(nowCoords.x, nowCoords.y) * (180 / Math.PI);

      state.lastX = nowCoords.x;

      var delta = 0;
      if (!state.startingMouse) {
        state.startingMouse = angle;
      } else {
        delta = angle - state.startingMouse;
      }

      state.theta = state.starting + delta;
      state.lastMoveTime = Date.now();

      if (getLastObject(state.positionHistory).theta !== state.theta) {
        state.rotatedByHand = true;
      }

      state.positionHistory.push({
        theta: state.theta,
        time: state.lastMoveTime,
      });

      if (state.positionHistory.length > 50) {
        state.positionHistory.shift();
      }

      rotateWheelTo(wheel, state.theta);
    });

    addListener(wedges, 'touchstart mousedown', function(e) {
      state.starting = getRotationAngle(wedges);
      state.startingMouse = null;
      state.positionHistory = [];
      state.touchStartEvent = e;
      state.lastX = null;
      state.stopPrevMomentum = true;
      state.allowFreeSpin = true;
      toggleInnerCircleTouchability(wheel, false);
    });

    addListener(wedges, 'touchend mouseup mouseleave', function() {
      toggleInnerCircleTouchability(wheel, true);
      var history = state.positionHistory;
      if (!state.allowFreeSpin || !history) return;

      var first = getLastObject(history, 2);
      var last = getLastObject(history);

      setTimeout(function() {
        state.rotatedByHand = false;
      }, 1);

      if (!last || !first) return;

      state.allowFreeSpin = false;

      var plan = [];
      var dt = ((last.time - first.time) / 1000);
      var limit = 10000;
      var minVelocity = 30;
      var speedLossPerFrame = Math.pow(state.friction, dt);
      var deltaTheta = last.theta - first.theta;

      state.v_theta = dt < .3 ? deltaTheta / dt : 0;

      var maxVelocity = 2000;
      if (state.v_theta > maxVelocity) {
        state.v_theta = maxVelocity;
      } else if (state.v_theta < -maxVelocity) {
        state.v_theta = -maxVelocity;
      }

      var i = 0;
      while (Math.abs(state.v_theta) > minVelocity && i < limit) {
        state.v_theta *= speedLossPerFrame;
        state.theta += (state.v_theta * dt);

        if (isFinite(state.theta)) {
          plan.push({
            theta: state.theta,
            v_theta: state.v_theta,
          });
        }
        i++;
      }

      function next(frame) {
        var thisFrame = plan[frame];
        requestAnimationFrame(function() {
          if (thisFrame && thisFrame.theta) {
            setWheelAngle(wheel, thisFrame.theta);

            if (thisFrame.v_theta < 360 * 1.5) {
              shiftShows(wheel, state.theta);
            }
          }
          frame++;
          if (!state.stopPrevMomentum && !state.transitioning && frame < plan.length) {
            next(frame);
          } else {
            plan = [];
          }
        });
      }

      next(0);
    });

    var slider = $selOne('.slider', wheel);

    addListener(slider, 'scroll', function() {
      updateSliderNavBtns(wheel);
    });

    addListener(
      getNavBtn(wheel, 'slider', 'right'),
      'click',
      slideSlider(wheel, slider, 1)
    );
    addListener(
      getNavBtn(wheel, 'slider', 'left'),
      'click',
      slideSlider(wheel, slider, -1)
    );

    var config = applyDefaults(wheel, instanceConfig);
    if (config.wheelArrowsRotateIncrements()) {
      var hasTouch = $selOne('html').classList.contains('touch');
      var start = hasTouch ? 'touchstart' : 'mousedown';
      var end = hasTouch ? 'touchend' : 'mouseup';
      addListener(
        getNavBtn(wheel, 'circle', 'left'),
        start,
        handleCircleNavArrowTouchBegin(wheel, state, -constantSpinVelocityDegreesPerSecond)
      );
      addListener(
        getNavBtn(wheel, 'circle', 'left'),
        end,
        handleCircleNavArrowTouchEnd(wheel, state, -3)
      );
      addListener(
        getNavBtn(wheel, 'circle', 'right'),
        start,
        handleCircleNavArrowTouchBegin(wheel, state, constantSpinVelocityDegreesPerSecond)
      );
      addListener(
        getNavBtn(wheel, 'circle', 'right'),
        end,
        handleCircleNavArrowTouchEnd(wheel, state, 3)
      );
    } else {
      addListener(
        getNavBtn(wheel, 'circle', 'left'),
        'mouseenter',
        rotateWheelConstantRate(wheel, -constantSpinVelocityDegreesPerSecond)
      );
      addListener(
        getNavBtn(wheel, 'circle', 'right'),
        'mouseenter',
        rotateWheelConstantRate(wheel, constantSpinVelocityDegreesPerSecond)
      );
      addListener(
        getNavBtn(wheel, 'circle', 'left'),
        'mouseleave',
        stopWheelConstantRate(wheel)
      );
      addListener(
        getNavBtn(wheel, 'circle', 'right'),
        'mouseleave',
        stopWheelConstantRate(wheel)
      );
    }

    // Google Analytics click tracking
    trackClicksOn(
      wheel,
      $sel('a', wedges),
      'Show Selected',
      '[link_href] | Canvas Wheel'
    );
    trackClicksOn(
      wheel,
      $sel('a', slider),
      'Show Selected',
      '[link_href] | HTML Fallback Slider'
    );
    trackClicksOn(
      wheel,
      $sel('[data-all-shows-button="circle"] a', wheel),
      'All Shows Selected',
      'Canvas Wheel'
    );
  }

  function animateWheelIn(wheel, config, duration, delay) {
    var state = getRotationState(wheel);
    config = applyDefaults(wheel, config);
    rotateWheelTo(wheel, state.initialTheta - 180, null, function() {
      setTimeout(function() {
        setTimeout(function() {
          toggleClass(wheel, 'anim-in', true);
        }, 1);
        toggleWheelZoom(wheel, config, !config.wheelZoomOnHover() || config.wheelZoomedByDefault());
        rotateWheelTo(wheel, state.initialTheta, duration);
      }, delay);
    });
  }

  function getScreenWidth() {
    return Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
  }

  function inScreenWidthRange(width, breakpoint) {
    return breakpoint.min <= width && breakpoint.max >= width;
  }

  function toggleWheelZoom(wheel, config, on) {
    toggleClass($selOne('body'), 'wheel-open', on);
    toggleClass(wheel, 'zoomed', on);
    toggleClass(wheel, 'no-zoom-on-hover', !config.wheelZoomOnHover());
    toggleClass(wheel, 'has-wheel-arrows', config.wheelArrowsEnabled());
    toggleClass(getRotationState(wheel).wrapper, 'embiggen', on);
  }

  function applyMode(wheel, config) {
    config = applyDefaults(wheel, config);
    var screenWidth = getScreenWidth();
    var sliderBreakpoint = config.sliderModeBreakpoints.find(function(breakpoint) {
      return inScreenWidthRange(screenWidth, breakpoint);
    });
    if (sliderBreakpoint) {
      switchMode(wheel, config, 'slider');
    } else {
      switchMode(wheel, config, 'circle');
    }

    var breakpoints = {
      large: { min: 1382, max: 99999999 },
      medium: { min: 1026, max: 1381 },
      small: { min: 901, max: 1025 },
      xsmall: { min: 825, max: 900 },
      xxsmall: { min: 776, max: 824 },
      tiny: { min: 0, max: 775 },
    };
    Object.keys(breakpoints).forEach(function(size) {
      toggleClass(
        wheel,
        size + '-size',
        inScreenWidthRange(screenWidth, breakpoints[size])
      );
    });
    return config;
  }

  function switchMode(wheel, config, type) {
    if (typeof config.forceMode !== 'undefined') {
      type = config.forceMode;
    }
    toggleClass(wheel, 'circle-mode', type !== 'slider');
    toggleClass(wheel, 'slide-mode', type === 'slider');
    wheel.setAttribute('id', type === 'slider' ? 'wheel-fallback' : 'wheel-standard');
    if (type === 'slider') {
      updateSliderNavBtns(wheel);
    }
  }

  function applyDefaults(wheel, config) {
    var defaults = {
      wheelArrowsEnabled: function() {
        return getScreenWidth() > 601;
      },
      wheelZoomOnHover: function() {
        return $selOne('html').classList.contains('no-touch');
      },
      wheelZoomedByDefault: function() {
        return false;
      },
      wheelArrowsRotateIncrements: function() {
        return $selOne('html').classList.contains('touch');
      },
      sliderModeBreakpoints: [ { min: 0, max: 601 } ],
    };
    var inlineSettings = JSON.parse(wheel.getAttribute('data-wheel-config') || '{}');
    var debugValues = {};
    Object.keys(defaults).forEach(function(name) {
      var castValue = getDebugValueFromQueryString(name);
      var val = castValue;
      if (typeof val === 'boolean') {
        val = function() {
          return castValue;
        };
      }
      if (typeof val !== 'undefined' && val !== '_default') {
        debugValues[name] = val;
      }
    });
    return Object.assign({}, defaults, config, inlineSettings, debugValues);
  }

  function applyInstanceConfig(wheel, config) {
    config = applyMode(wheel, config);

    addListener(wheel, 'mouseenter mousemove', function() {
      if (config.wheelZoomOnHover() && !config.wheelZoomedByDefault()) {
        toggleWheelZoom(wheel, config, true);
      }
    });
    addListener(wheel, 'mouseleave', function() {
      if (config.wheelZoomOnHover() && !config.wheelZoomedByDefault()) {
        toggleWheelZoom(wheel, config, false);
      }
    });
  }

  function deepValue(path, obj) {
    var target = typeof obj !== 'undefined' ? obj : window;
    var isUndefined = function(val) {
      return typeof val === 'undefined' || val === null;
    };
    return path.split('.').reduce(function(parent, child) {
      if (!isUndefined(parent) && !isUndefined(parent[child])) {
        return parent[child];
      }
    }, target);
  }

  function componentToHex(c) {
    var hex = c.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }

  function rgbToHex(r, g, b) {
    return '#' + componentToHex(r) + componentToHex(g) + componentToHex(b);
  }

  function convertRGBStrToHex(str) {
    var comps = str.match(/[0-9]+/g);
    if (!comps || comps.length < 3) {
      return str;
    }
    return rgbToHex.apply(null, comps.map(function(val) {
      return parseInt(val);
    }));
  }

  function camelToDash(str) {
    return str.replace(/([A-Z])/g, function($1) {
      return '-' + $1.toLowerCase();
    });
  }

  function getEleDataObj(el, name) {
    var value = el.getAttribute('data-' + name);
    return value ? JSON.parse(value) : {};
  }

  function setEleChildDataOnce(el, parentName, childName, value) {
    var data = getEleDataObj(el, parentName);
    if (typeof data[childName] === 'undefined') {
      data[childName] = value;
      el.setAttribute('data-' + parentName, JSON.stringify(data));
    }
  }

  function applyColorToElement(el, prop, colorVal, type) {
    var currentColor = getComputedStyle(el).getPropertyValue(camelToDash(prop));
    var currentHex = convertRGBStrToHex(currentColor);
    if (currentHex.toLowerCase() !== colorVal.toLowerCase()) {
      el.style[prop] = colorVal;
      setEleChildDataOnce(el, 'theme-colors', prop, {
        original: currentHex,
        themed: colorVal,
        nothovered: type === 'hovered' ? currentHex : colorVal,
      });
      return true;
    }
  }

  function revertColor(el, prop, name) {
    var original = getEleDataObj(el, 'theme-colors');
    var color = deepValue(prop + '.' + name, original);
    if (color) {
      el.style[prop] = color;
    }
  }

  function toggleHoverColors(el, hoverOn) {
    var childColors = getEleDataObj(el, 'children-hover-colors');
    Object.keys(childColors).forEach(function(key) {
      childColors[key].prop.split(' ').forEach(function(prop) {
        $sel(childColors[key].sel, el).forEach(function(child) {
          if (hoverOn) {
            applyColorToElement(child, prop, childColors[key].color, 'hovered');
          } else {
            revertColor(child, prop, 'nothovered');
          }
        });
      });
    });
  }

  function applyTheme(wheel, config) {
    var themeToSelectorMap = {
      'wheel.wedge_colors.0': [
        {
          sel: '.circle-wrapper',
          prop: 'backgroundColor',
        },
      ],
      'wheel.wedge_colors.1': [
        {
          sel: '.wedge-wrapper:nth-child(even) .wedge',
          prop: 'backgroundColor',
        }, {
          sel: '.all-shows-circle-btn .single-wedge-inner:hover .single-wedge-inner-inner',
          prop: 'backgroundColor',
        },
      ],
      'wheel.wheel_border_color': {
        sel: '.circle-wrapper',
        prop: 'borderColor',
      },
      'arrow_buttons.arrow_inner_fill': [
        {
          sel: '.nav-circle .nav-btn .nav-btn-inner',
          prop: 'backgroundColor',
        }, {
          sel: '.all-shows-circle-btn .single-wedge-inner',
          prop: 'backgroundColor',
        },
      ],
      'arrow_buttons.arrow_inner_stroke': [
        {
          sel: '.nav-circle .nav-btn-inner',
          prop: 'borderColor',
        }, {
          sel: '.nav-slider .nav-right-arrow',
          prop: 'borderLeftColor',
        }, {
          sel: '.nav-slider .nav-left-arrow',
          prop: 'borderRightColor',
        },
      ],
      'arrow_buttons.arrow_outer_border': [
        {
          sel: '.nav-circle .nav-btn',
          prop: 'borderColor backgroundColor',
        }, {
          sel: '.nav-slider .nav-btn-bg',
          prop: 'backgroundColor',
        },
      ],
      'arrow_buttons.arrow_shape_color': [
        {
          sel: '.nav-circle .nav-btn svg',
          prop: 'fill',
        }, {
          sel: '.all-shows-circle-btn svg',
          prop: 'fill',
        },
      ],
      'text_hub.text_hub_fill': {
        sel: '.wheel-inner-circle',
        prop: 'backgroundColor',
      },
      'text_hub.text_hub_stroke': [
        {
          sel: '.wheel-inner-circle',
          prop: 'borderColor',
        }, {
          sel: '.all-shows-circle-btn .single-wedge-inner:hover svg',
          prop: 'fill',
        },
      ],
      'text_hub.text_hub_font': {
        sel: '.show-title-text',
        prop: 'color',
      },
    };

    var applied = [];
    Object.keys(themeToSelectorMap).forEach(function(path) {
      var colorVal = deepValue(path, config);
      var themeVals = themeToSelectorMap[path];
      if (!Array.isArray(themeVals)) {
        themeVals = [ themeVals ];
      }

      themeVals.forEach(function(themeVal) {
        // Look for :hover selectors and handle theming for those cases
        var hoverMatch = themeVal.sel.match(/(.*)\:hover(\s+(.*))*/);
        if (hoverMatch && hoverMatch.length > 1) {
          var parentSel = hoverMatch[1];
          var childSel = typeof hoverMatch[2] === 'undefined' ? '::self::' : hoverMatch[2];

          $sel(parentSel, wheel).forEach(function(parent) {
            setEleChildDataOnce(parent, 'children-hover-colors', childSel + ':' + themeVal.prop, {
              sel: childSel,
              color: colorVal,
              prop: themeVal.prop,
            });

            addListener(parent, 'touchstart mouseenter', function() {
              toggleHoverColors(parent, true);
            });
            addListener(parent, 'touchend mouseleave', function() {
              if (!parent.classList.contains('active')) {
                toggleHoverColors(parent, false);
              }
            });
            addListener(document, 'touchstart mousedown', function() {
              toggleClass(parent, 'active', false);
            });
            addListener(parent, 'touchstart mousedown', function() {
              event.stopPropagation();
              toggleClass(parent, 'active', true);
            });
          });
        } else {
          $sel(themeVal.sel).forEach(function(el) {
            themeVal.prop.split(' ').forEach(function(prop) {
              if (applyColorToElement(el, prop, colorVal)) {
                applied.push({
                  sel: themeVal.sel,
                  key: path,
                  colorVal: colorVal,
                  prop: prop,
                });
              }
            });
          });
        }
      });
    });
    log('applied ' + applied.length + ' theme colors:', JSON.stringify(applied, null, 2));
  }

  function fireWheelReady() {
    if (typeof $ === 'function') {
      $(document).ready(function() {
        $('body').trigger('wheel-ready');
      });
    }
  }

  function initWheel(wheel, dynamicConfig, instanceConfig) {
    instanceConfig = instanceConfig || {};
    wheel.style.display = 'block';
    populateWheel(wheel, dynamicConfig);
    initRotationState(wheel);
    attachListeners(wheel, instanceConfig);
    applyInstanceConfig(wheel, instanceConfig);
    applyTheme(wheel, dynamicConfig);
    setTimeout(function() {
      wheel.style.visibility = 'visible';
      animateWheelIn(wheel, instanceConfig, 600, 750);
      updateSliderNavBtns(wheel);
      fireWheelReady();
    }, 500); // wait 500 ms for IE 11 to get caught up rendering class changes. 1 ms was enough for decent browsers
    return wheel;
  }

  var wheelEl = $selOne('.wheel-menu');
  if (wheelEl) {
    if (PBS.KIDS.wheelConfig) {
      initWheel(wheelEl, PBS.KIDS.wheelConfig);
    } else {
      error('The Wheel config JSON is missing from the page! Aborting wheel initialization!');
    }
  } else {
    error('The Wheel HTML is missing from the page! Aborting wheel initialization!');
  }
});
