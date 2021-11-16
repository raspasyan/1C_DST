// Текущий ввод
var _currentInput = null;

// Последняя выбранная алкомарка
var _alcocode = null;
// Дата выбрана вручную
var _customDate = null;
// Последняя полученная АП
var _alcocodeAP = null;
// Последняя введенная дата
var _alcocodeDate = null;

// Таймеры ввода
var inputTimer = null;      // Ввод алкогольных марок

// Звуки
var _warningSound = document.createElement("audio");
_warningSound.src = "src/sounds/warning.wav";
var _errorSound = document.createElement("audio");
_errorSound.src = "src/sounds/error.mp3";

// Формат дат
var _dateOptions = {
	year: "numeric",
	month: "long",
	day: "numeric"
}

// Мусорный контейнер
var _trash = null;

// Обработка загрузки страницы
document.addEventListener("DOMContentLoaded", function(e){
	// Инициализируем все ресурсы
	initMedia();
	
	// Открываем вкладку по умолчанию
	openTab("input");
});

// Обработка открытия меню
menuOpen.addEventListener("click", function(e) {
	document.getElementById("mySidenav").style.width = "100%";
});

// Обработка закрытия меню
menuClose.addEventListener("click", function(e) {
	closeMenu();   
});

// Обработка пунктов меню
mySidenav.addEventListener("click", function(e) {
	if (e.target.getAttribute("tabId")) {
		openTab(e.target.getAttribute("tabId"));
		closeMenu();
	}
});

// Обработка клика по модальному окну
modalContainer.addEventListener("click", function(e) {
	hideModal();
});

// Обработка клика по кнопке модального окна
modalButton.addEventListener("click", function(e) {
	hideModal();

	// Если открыт выбор даты и дата выбрана, то подтвердим её
	if (alcocodeDateButtons.style.display == "block" && _alcocodeDate) alcocodeDateButtonOk.click();
});

// Обработка ввода алкомарки
alcocodeInput.addEventListener("input", function(e) {
	// При вводе даем некоторый таймаут для медленных сканеров
	if (inputTimer) clearTimeout(inputTimer);
	inputTimer = setTimeout(function() {
		if (alcocodeInput.value.length >= 16) {
			// Указываем алкокод
			_alcocode = alcocodeInput.value.toLocaleUpperCase();

			var _obj = {
				method: "inputAlcocode",
				alcocode: _alcocode,
				alcocodeDate: null
			}

			sendToAPI(_obj); 	
		}

		// Снимаем фокус с ввода
		alcocodeInput.blur();
	}, 333);
});

// Обработка ввода штрихкода
barcodeInput.addEventListener("input", function(e) {
	// При вводе даем некоторый таймаут для медленных сканеров
	if (inputTimer) clearTimeout(inputTimer);
	inputTimer = setTimeout(function() {
		if (_currentInput.value.length >= 3) sendToAPI({
			method: "inputAlcocode",
			alcocode: _alcocode,
			alcocodeDate: _alcocodeDate,
			barcode: _currentInput.value
		}); 	

		// Снимаем фокус с ввода
		_currentInput.blur();
	}, 333);
});

// Автоматический фокус на ввод
document.body.addEventListener("keydown", function(e) {
	_currentInput.focus();

	if (alcocodeDateButtons.style.display == "block") {
		// Показываем сообщение ошибки
		showModal("Подтверди марку!", "img-medium img-process", _alcocodeDate ? "Подтвердить" : null);
		
		// Даем звук ошибки
		_errorSound.play();
	}

}, false);

// Обработка нажатий на даты
alcocodeDateButtons.addEventListener("click", function(e) {
	if (e.target.hasAttribute("date")) {
		// Убираем признак того, что дата выбрана вручную
		_customDate = false;

		// Отменим ввод даты
		alcocodeDateInput.value = "";
		
		// Зафиксируем выбранную дату
		if (e.target.getAttribute("date")) changeAlcocodeDate(e.target.getAttribute("date"));

		// Делаем кнопку "продолжить" доступной
		alcocodeDateButtonOk.disabled = false;
	}
});

$('#alcocodeDateInput').datepicker({
    onSelect: function(formattedDate, date, inst){
		if (formattedDate) {
			// Ставим признак того, что дата выбрана вручную
			_customDate = true;

			// Форматируем дату
			let _dateArr = formattedDate.split(".");
			changeAlcocodeDate(_dateArr[2] + "." + _dateArr[1] + "." + _dateArr[0]);
			
			// Делаем кнопку "продолжить" доступной
			alcocodeDateButtonOk.disabled = false;
	
			// Очищаем выбранную дату
			alcocodeDateInput.value = "";
	
			// Закрываем календарь
			inst.hide();
		}
    }
})

// Обработка кнопки отправки даты
alcocodeDateButtonOk.addEventListener("click", function(e) {
	// Скрываем кнопки выбора даты
	alcocodeDateButtons.style.display = "none";

	// Отправляем ранее введенную марку и выбранную дату
	var _obj = {
		method: "inputAlcocode",
		alcocode: _alcocode,
		alcocodeDate: _alcocodeDate
	}

	sendToAPI(_obj);
});

// Обработка кнопки отмены выбора даты
footerCancelButton.addEventListener("click", function(e) {
	// Отменим выбор даты
	cancelDateInput();

	// Подгрузим текущий статус приема ТТН
	sendToAPI({method: "getCommonStatus"});
});

// Обработка отмены алкомарки
alcocodeRemoveInput.addEventListener("input", function(e){
	// При вводе даем секунду таймаута для медленных сканеров
	if (inputTimer) clearTimeout(inputTimer);
	inputTimer = setTimeout(function() {
		if (alcocodeRemoveInput.value.length) {
			var _obj = {
				method: "removeAlcocode",
				alcocode: alcocodeRemoveInput.value.toLocaleUpperCase()
			}

			sendToAPI(_obj); 

			// Снимаем фокус с ввода
			alcocodeRemoveInput.blur();
		}
	}, 333);
});

// XHR запрос к API 1С
function sendToAPI(_obj) {
	switch (_obj.method) {
		default: {
			console.warn("Unexpected API method");
			break;
		}

		// Ввод алкогольной марки
		case "inputAlcocode": {
			// Показываем статус ввода алкомарок
			alcocodeInputStatus.style.display = "block";
			// Сообщаем о загрузке
			output.setAttribute("class", "");
			output.textContent = "Загрузка..";
			// Показываем картинку загрузки
			outputImage.setAttribute("class", "img img-load");

			// Показываем ввод
			alcocodeInput.style.display = "inline-block";
			// Очищаем ввод
			alcocodeInput.value = "";
			// Разблокируем ввод
			alcocodeInput.disabled = false;
			// Фокус на вводе алкомарок
			_currentInput = alcocodeInput;

			// Скрываем ввод штрихкода
			barcodeInput.style.display = "none";
			// Очищаем последний введенный штрихкод
			barcodeInput.value = "";

			break;
		}

		// Отмена алкогольной марки
		case "removeAlcocode": {
			// Показываем статус ввода алкомарок
			alcocodeRemoveStatus.style.display = "block";
			// Сообщаем о загрузке
			alcocodeRemoveStatusText.setAttribute("class", "");
			alcocodeRemoveStatusText.textContent = "Загрузка..";
			// Показываем картинку загрузки
			alcocodeRemoveStatusImage.setAttribute("class", "img img-load");
			// Очищаем ввод
			alcocodeRemoveInput.value = "";
			// Блокируем ввод
			alcocodeRemoveInput.disabled = false;

			break;
		}

		// Поиск ТТН по номеру
		case "findTtn": {
			// Блокируем ввод
			ttnInput.disabled = true;

			// Показываем загрузку
			ttnProperties.style.display = "block";
			ttnPropertiesOutput.textContent = "Ожидание ответа 1С.."
			ttnPropertiesImage.setAttribute("class", "img img-load");

			// Очищаем и скрываем прежние результаты поиска
			if (ttnList.children.length) {
				ttnList.style.display = "none";
				removeChildrens(ttnList);
			}

			break;
		}

		// Получение св-в ТТН
		case "getTtnProperties": {
			// Скрываем св-ва текущей ТТН
			ttnPropertiesResult.style.display = "none";

			break;
		}

		// Получение общего статуса приема ТТН
		case "getCommonStatus": {
			// ...
		}
	}

	// Формируем XHR запрос
	var XHR = new XMLHttpRequest();
	XHR.open("POST", "/rtdev/hs/rsa/api", true);
	XHR.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
	XHR.send(JSON.stringify(_obj));
	XHR.onload = function() {
		// Обработаем ошибку ответа
		if (XHR.status == 500) {
			// Сообщим о том, что в 1С возникла ошибка
			console.log("error", XHR);

			showModal("Ошибка 1С!", "img-medium img-warning");
			return;
		}
		
		// Обрабатываем ответ 1С
		receiveFromAPI(JSON.parse(XHR.responseText));
	}
}

// Обработка ответа от API 1С
function receiveFromAPI(_answerObj) {
	switch (_answerObj.method) {
		default: {
			console.warn("Unexpected API answer")
			break;
		}

		// Ввод алкогольной марки
		case "inputAlcocode": {
			// Прокрутим страницу до статуса
			output.scrollIntoView();
			// Показываем статус ввода алкомарок
			alcocodeInputStatus.style.display = "block";
			// Сообщаем о результате
			output.textContent = _answerObj.result;
			// Убираем картинку загрузки
			outputImage.setAttribute("class", "");
			// Очищаем общую информацию
			removeChildrens(commonStatus);

			switch (_answerObj.status) {
				default: {
					// 
				}

				// Ошибка
				case 0: {
					output.setAttribute("class", "bad");
					outputImage.setAttribute("class", "img img-small img-warning");   

					// Показываем сообщение ошибки
					showModal((_answerObj.result ? _answerObj.result : _answerObj.data.error), "img-medium img-warning");

					// Даем звук ошибки
					_errorSound.play();

					// Подгрузим текущий статус приема ТТН
					sendToAPI({method: "getCommonStatus"});

					break;
				}

				// Успешный ввод
				case 1: {
					output.setAttribute("class", "good");  
					outputImage.setAttribute("class", "img img-small img-success");

					// Покажем информацию о ТТН
					drawCommonStatus(_answerObj.commonResults);

					// Прокрутим страницу до текста ответа
					alcocodeInputStatus.scrollIntoView(0);

					break;
				}

				// Повторный ввод
				case 2: {
					output.setAttribute("class", "warning"); 
					outputImage.setAttribute("class", "img img-small img-process");
					
					// Покажем информацию о ТТН
					drawCommonStatus(_answerObj.commonResults);

					// Прокрутим страницу до статуса ввода
					alcocodeInputStatus.scrollIntoView(0);
					
					// Фокусируемся на вводе алкомарки
					// alcocodeInput.focus();

					break;
				}

				// Нужно ввести дату
				case 3: {
					// Покажем статус ответа
					output.setAttribute("class", "warning"); 
					outputImage.setAttribute("class", "img img-small img-process");

					// Скроем ввод марки
					alcocodeInput.style.display = "none";

					// Покажем кнопки выбора даты
					alcocodeDateButtons.style.display = "block";

					// Покажем кнопку "Назад" из подвала
					footerCancelButton.style.display = "inline-block";

					// Удалим прежние даты
					var _customDates = document.getElementsByClassName("js-custom-date");
					while (_customDates.length) {
						_customDates[0].parentNode.removeChild(_customDates[0]);
					}

					// Добавим новые даты, если они были переданы
					if (_answerObj.dates != undefined && _answerObj.dates.length) {
						// Если отсканирована новая АП, то не выбираем никакой даты, иначе подставляем последнюю выбранную, либо первую полученную
						if (_alcocodeAP != _answerObj.alcocodeAP) {
							// Первое сканирование АП, отключаем кнопку подтверждения до выбора даты
							alcocodeDateButtonOk.disabled = true;

							// Забываем выбранную дату
							_alcocodeDate = "";
							alcocodeDate.value = "";
						}

						// Запоминаем последнюю АП
						_alcocodeAP = _answerObj.alcocodeAP;

						// Признак того, что последняя выбранная дата есть в полученном списке, иначе выберем первую полученную
						var _havingCurrentDate = false;

						// Добавляем кнопки выбора даты
						for (let i = 0; i < _answerObj.dates.length; i++) {
							let _date = new Date(_answerObj.dates[i]);
							var _el = document.createElement("input");
							_el.setAttribute("class", "u-full-width js-custom-date");
							_el.type = "button";
							_el.value = _date.toLocaleString("ru", _dateOptions);
							_el.setAttribute("date", _answerObj.dates[i]);
							alcocodeDateButtons.appendChild(_el);

							if (_alcocodeDate == _answerObj.dates[i]) _havingCurrentDate = true;
						}

						// Среди полученных дат отсутствует последняя выбранная, подставим первую полученную
						if (_alcocodeDate && !_havingCurrentDate) {
							// Если была выбрана дата вручную, то подставим её
							if (_customDate) {
								changeAlcocodeDate(_alcocodeDate);
							} else {
								// Иначе подставляем первую попавшуюся
								changeAlcocodeDate(_answerObj.dates[0]);
							}
						}
					} else {
						// Блокируем кнопку подтверждения даты
						alcocodeDateButtonOk.disabled = true;

						// Забываем последнюю введенную вручную дату
						alcocodeDateInput.value = "";

						// Очищаем последнюю выбранную дату
						changeAlcocodeDate("");
					}

					break;
				}

				// Нужно отсканировать штрихкод номенклатуры
				case 4: {
					// Покажем статус ответа
					output.setAttribute("class", "warning"); 
					outputImage.setAttribute("class", "img img-small img-process");

					// Скроем ввод марки
					alcocodeInput.style.display = "none";

					// Покажем поле ввода штрихкода
					barcodeInput.style.display = "block";

					// Покажем кнопку "Назад" из подвала
					footerCancelButton.style.display = "inline-block";

					// Фокус на вводе штрихкода
					_currentInput = barcodeInput;

					// Даем звук ошибки
					_warningSound.play();

					break;
				}
			}

			break;
		}

		// Отмена алкогольной марки
		case "removeAlcocode": {
			// Показываем статус ввода алкомарок
			alcocodeRemoveStatus.style.display = "block";
			// Сообщаем о результате
			alcocodeRemoveStatusText.textContent = _answerObj.result;
			// Убираем картинку загрузки
			alcocodeRemoveStatusImage.setAttribute("class", "");

			// Обработаем статус ответа
			switch (_answerObj.status) {
				case 0: {
				// Отмена марки не удалась
				alcocodeRemoveStatusImage.setAttribute("class", "img img-small img-warning");
				break;
				}

				case 1: {
					// Марка отменена
					alcocodeRemoveStatusImage.setAttribute("class", "img img-small img-success");

					break;
				}
			}

			break;
		}

		// Подгрузка общего статуса приемки ТТН
		case "getCommonStatus": {
			if (_answerObj.status) {
				// Покажем информацию о ТТН
				drawCommonStatus(_answerObj.commonResults);
			}
		}
	}
}

// Форматируем введенную дату
function changeAlcocodeDate(_newDate) {
	_alcocodeDate = _newDate;

	if (_newDate) {
		let _dateArr = _newDate.split(".");

		alcocodeDate.value = _dateArr[2] + "." + _dateArr[1] + "." + _dateArr[0];
	} else {
		alcocodeDate.value = "";
	}
}

// Отрисовать общую информацию
function drawCommonStatus(commonResults) {
	// Очищаем общую информацию
	removeChildrens(commonStatus);

	// Отрисовываем полученную информацию
	commonResults.forEach(element => {
        let detailsElement = document.createElement("details");

        // Заголовок информационного блока
        let summaryElement = document.createElement("summary");

        var spanElement = document.createElement("span");
		spanElement.classList.add("img");          
		// Если отсканировано все, то сменим картинку
		if (element.qty == element.realQty) {
            spanElement.classList.add("img-success");
		} else {
            spanElement.classList.add("img-process");
		}
		spanElement.classList.add("img-small");
		summaryElement.appendChild(spanElement);

		var strongElement = document.createElement("strong");
		strongElement.textContent = "\t" + element.title;
		// Если отсканировано все, то выделим цветом
		if (element.qty == element.realQty) strongElement.classList.add("good");
		summaryElement.appendChild(strongElement);

		summaryElement.appendChild(document.createElement("br"));

		var spanElementQty = document.createElement("span");
		spanElementQty.textContent = element.realQty + (element.tempQty ? "(" + element.tempQty + ")" : "") + " из " + element.qty;
		spanElementQty.style.fontSize = "1.4em";
		summaryElement.appendChild(spanElementQty);

        detailsElement.appendChild(summaryElement);

		// Содержимое информационного блока
		if (element.products) {
			let divElementTable = document.createElement("div");
			divElementTable.classList.add("common-status-table");
			detailsElement.appendChild(divElementTable);

			element.products.forEach(productElement => {
				let divElementRow = document.createElement("div");
				divElementRow.classList.add("common-status-row");

				let spanElementProductTitle = document.createElement("div");
				spanElementProductTitle.textContent = productElement.title;
				divElementRow.appendChild(spanElementProductTitle);

				let strongElementQty = document.createElement("strong");
				strongElementQty.textContent = productElement.realQty + (productElement.tempQty ? "(" + productElement.tempQty + ")" : "") + "/" + productElement.qty;
				divElementRow.appendChild(strongElementQty);

				divElementTable.appendChild(divElementRow);
			});
		}

        commonStatus.appendChild(detailsElement);
	});
}

// Показать выбранную вкладку
function openTab(tabId) {
	// Выбор активного поля ввода
	switch (tabId) {
		default: {
			_currentInput = null;
			break;
		}
		case "input": {
			_currentInput = alcocodeInput;
			break;
		}

		case "remove": {
			_currentInput = alcocodeRemoveInput;
			break;
		}
	}

	// Найдем название выбранного пункта меню
	var menuItems = document.getElementsByClassName("tablink");
	for (let i = 0; i < menuItems.length; i++) {
		if (menuItems[i].getAttribute("tabid") == tabId) {
			menuTitle.textContent = menuItems[i].textContent;
			break;
		}
	}

	var i, tabcontent;
	tabcontent = document.getElementsByClassName("tabcontent");
	for (i = 0; i < tabcontent.length; i++) tabcontent[i].style.display = "none";
	document.getElementById(tabId).style.display = "block";

	// Уберем сообщения о результатах ввода или отмены алкогольных марок
	clearStatuses();
	// Отменим ввод даты разлива
	cancelDateInput();
	// Скроем кнопки подвала
	hideFooterButtons();
	// Скрываем контейнер модального окна
	hideModal();

	// Действия специфичные для конкретных позиций меню
	switch (tabId) {
		case "input": {
			// Подгрузим текущий статус приема ТТН
			sendToAPI({method: "getCommonStatus"});

			// Покажем кнопку быстрого переход на удаление
			footerToRemoveButton.style.display = "inline-block";

			break;
		}
		case "remove": {
			// Покажем кнопку быстрого переход на прием
			footerToInputButton.style.display = "inline-block";
			
			break;
		}
	}
}

// Закрыть меню
function closeMenu() {
	document.getElementById("mySidenav").style.width = "0";
}

// Удаление всех потомков
function removeChildrens(element) {
	while (element.firstChild) {
		element.removeChild(element.firstChild);
	}
}

// Показать модальное окно
function showModal(info, image, buttonValue) {
	// Аргументы функции по умолчанию
	image = image ? image : null;
	buttonValue = buttonValue ? buttonValue : "Ок";

	// Показываем модальный контейнер
	modalContainer.style.display = "block";

	// Убираем картинку
	modalImage.setAttribute("class", "");

	// Ставим картинку
	if (image) modalImage.setAttribute("class", ["img", image].join(" ")); 

	// Ставим нужный текст
	modalInfo.textContent = info;

	// Ставим текст кнопки
	if (buttonValue) modalButton.value = buttonValue;
}

// Скрыть модальное окно
function hideModal() {
	// Скрываем контейнер
	modalContainer.style.display = "none";

	// Убираем картинку
	modalImage.setAttribute("class", "");

	// Убираем текст
	modalInfo.textContent = "";

	// Прокрутим страницу до ввода
	alcocodeInput.scrollIntoView();
	
	// Ставим фокус на ввод алкогольной марки
	// alcocodeInput.focus();
}

// Скрыть статусные сообщения
function clearStatuses() {
	// Скрываем статус ввода алкогольной марки
	alcocodeInputStatus.style.display = "none";
	// Скрываем статус отмены алкогольной марки
	alcocodeRemoveStatus.style.display = "none";
}

// Отменить выбор даты розлива
function cancelDateInput() {
	// Скрываем кнопку "Назад" из подвала
	footerCancelButton.style.display = "none";

	// Сбросим введенную дату
	alcocodeDateInput.value = "";
	// Скрываем кнопки выбора даты
	alcocodeDateButtons.style.display = "none";
	// Забываем введенные марку и дату
	_alcocode = null;
	// Уберем текст статуса
	output.setAttribute("class", "");
	output.textContent = "";
	// Уберем картинку статуса
	outputImage.setAttribute("class", "");
	// Покажем ввод алкогольной марки
	alcocodeInput.style.display = "inline-block";
	// Текущим элементом ввода для автофокуса делаем ввод марки
	if (_currentInput != alcocodeRemoveInput) _currentInput = alcocodeInput;
	// Скрываем ввод штрихкода
	barcodeInput.style.display = "none";
}

// Скрыть кнопки подвала
function hideFooterButtons() {
	for (var i = 0; i < footer.children.length; i++) {
		footer.children[i].style.display = "none";
	}
}

// Подгрузка ресурсов
function initMedia() {
	// Список ресурсов для подгрузки
	var _images = [
		"img img-success",
		"img img-process",
		"img img-warning",
		"img img-load"
	];

	// Создаем новую корзину
	_trash = document.createElement("div");
	document.getElementsByTagName("body")[0].appendChild(_trash);

	// Добавляем в нее элементы содержащие ресурс для подгрузки
	for (var i = 0; i < _images.length; i++) {
		var _el = document.createElement("span");
		_el.setAttribute("class", _images[i]);
		_el.style.display = "none";
		_trash.appendChild(_el);
	}

	// Удаляем корзину
	setTimeout(function() {
		_trash.parentNode.removeChild(_trash);
	}, 1000)
}

// animate({
// 	duration: 1000,
// 	timing: function(timeFraction) {
// 		return timeFraction;
// 	},
// 	draw: function(progress, options) {
// 		console.log(options.from + (options.to - options.from) * progress);
// 	},
// 	from: 10,
// 	to: 15
// });

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
			callback(options);
		}
	});
}