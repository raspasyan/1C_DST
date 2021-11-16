function playAudio(file) {
    let audio = new Audio(file);
    audio.play();
}

function removeChildrens(element) {
    while (element.firstElementChild) element.removeChild(element.firstElementChild);
}

function compareNumeric(a, b) {
    return (Number(a.number) > Number(b.number) ? 1 : -1);
}

function findChildByClassName(_el, _cn) {
    while (_el != document.body) {
        if (_el.classList.contains(_cn)) return _el;
        _el = _el.parentNode;
    }
    return null;
}

// Анимация
function animate(options) {
	var start = performance.now();

	requestAnimationFrame(function animate(time) {
		// timeFraction от 0 до 1
		var timeFraction = (time - start) / options.duration;
		if (timeFraction > 1) timeFraction = 1;

		// текущее состояние анимации
		var progress = options.timing(timeFraction)

		options.draw(progress, options);

		if (timeFraction < 1) {
			requestAnimationFrame(animate);
		} else if (options.callback != undefined) {
			options.callback(options);
		}
	});
}