// Код номенклатуры
var _currentItemId = "";
// Таймер ввода штрихкода
var _barcodeInputTimeout = null;
// Действие кнопки модального окна
var _modalButtonAction = "";
// Последний отсканированный штрихкод номенклатуры или АМ
var _lastBarcode = "";
// Признак ручного ввода штрихкода
var _manualInput = false;
// Признак уточнения штрихкода к алкогольной марке
var _confirmBarcode = false;
// Режим разработчика
var _debugMode = null;

document.addEventListener("DOMContentLoaded", function() {

    // Получим статус инвентаризации
    sendToAPI({method: "getInventory"});

    // Получим статус отладки
    sendToAPI({method: "getConstant", data: "HTTPDebug"});

    //// Прослушиваем ввод ШК/АМ
    // При клике по вводу, считаем, что осуществляется ручной ввод
    barcodeInput.addEventListener("click", function(e) {
        _manualInput = true;
    }, false);
    // При росфокусировке ввода и режиме ручного ввода отправляем штрихкод
    barcodeInput.addEventListener("blur", function(e) {
        if (e.target.value.length > 6 && _manualInput) sendToAPI(
            {
                method: "checkBarcode", 
                data: {
                    barcode: (_confirmBarcode ? _lastBarcode : barcodeInput.value),
                    confirmBarcode: (_confirmBarcode ? barcodeInput.value : null),
                    forceBarcode: forceBarcode.checked,
                    forceExcise: forceExcise.checked
                }
            }
        );
    }, false);
    // При отжатии клавиши не в режиме ручного ввода ждем треть секунды перед отправкой штрихкода
    barcodeInput.addEventListener("keyup", function(e) {
        if (e.target.value.length > 6 && !_manualInput) {
            if (_barcodeInputTimeout) {
                clearTimeout(_barcodeInputTimeout);
                _barcodeInputTimeout = null;
            }
    
            _barcodeInputTimeout = setTimeout(function() {
                sendToAPI(
                    {
                        method: "checkBarcode", 
                        data: {
                            barcode: (_confirmBarcode ? _lastBarcode : barcodeInput.value), 
                            confirmBarcode: (_confirmBarcode ? barcodeInput.value : null),
                            forceBarcode: forceBarcode.checked,
                            forceExcise: forceExcise.checked
                        }
                    }
                );
            }, 333);
        }
    }, false);

    // Редактирование кол-ва для введенного штрихкода
    qtyInput.addEventListener("click", function(e) {
        if (qtyInput.value == 1) qtyInput.value = "";    
    });

    // Запись введенного количества в базу
    saveQty.addEventListener("click", function(e) {
        sendToAPI({method: "saveQty", data: {item_id: _currentItemId, qty: qtyInput.value}});
    }, false);

    // Сброс количества
    restartQty.addEventListener("click", function(e) {
        // Переключим режим действия модального окна
        _modalButtonAction = "restartQty";

        // Покажем модальное окно с предупреждением
        modalContainer.style.display = "";
        modalText.innerText = "Вы уверены?";
        modalButtons.style.display = "";
    }, false);

    // Отмена уточнения штрихкода
    removeExcise.addEventListener("click", function(e) {
        // Переключим режим действия модального окна
        _modalButtonAction = "removeExcise";

        // Покажем модальное окно с предупреждением
        modalContainer.style.display = "";
        modalText.innerText = "Вы уверены?";
        modalButtons.style.display = "";
    }, false);

    // Действия модального окна
    modalButtonOk.addEventListener("click", function(e) {
        switch (_modalButtonAction) {
            case "restartQty": {
                sendToAPI({method: "restartQty", data: {item_id: _currentItemId}});
                break;
            }

            case "removeExcise": {
                // Выключаем режим подтверждения штрихкода
                _confirmBarcode = false;
                // Скрываем модальное окно
                modalContainer.style.display = "none";
                // Скрываем информационное сообщение
                outputStatusText.style.display = "none";
                // Скрываем кнопку отмены
                removeExcise.style.display = "none";
                break;
            }
        }
    }, false);

    // Отмена сброса количества
    modalButtonCancel.addEventListener("click", function(e) {
        // Скроем модальное окно с предупреждением
        modalContainer.style.display = "none";
    }, false);

    // Автоматический фокус на ввод марки
    document.getElementsByTagName("body")[0].addEventListener("keydown", function(e) {
        if (document.activeElement != qtyInput) barcodeInput.focus();
    }, false);
});

// XHR запрос к API 1С
function sendToAPI(_obj) {
	switch (_obj.method) {
		default: {
			console.warn("Unexpected API method");
			break;
        }
        
        case "getConstant": {
            //
            break;
        }

		// Получить актуальную инвентаризацию
		case "getInventory": {
            // Покажем модальное окно загрузки
            modalContainer.style.display = "";
            modalText.innerText = "Соединение..";
            modalButtons.style.display = "none";

			break;
        }

        // Проверить введенный ШК
        case "checkBarcode": {
            if (_manualInput) _manualInput = false;
            
            // Снимаем фокус с ввода ШК
            barcodeInput.blur();

            // Запомним последний введенный штрихкод в случае, если не происходит уточнение штрихкода
            if (!_confirmBarcode) _lastBarcode = barcodeInput.value;
            
            // Скроем свойства АМ
            exciseProperties.style.display = "none";
            // Скроем свойства ШК
            barcodeProperties.style.display = "none";
            barcodeInput.disabled = true;

            // Покажем модальное окно загрузки
            modalContainer.style.display = "";
            modalText.innerText = "Соединение..";
            modalButtons.style.display = "none";

            break;
        }

        // Отправить количество
        case "saveQty": {
            // Покажем модальное окно загрузки
            modalContainer.style.display = "";
            modalText.innerText = "Соединение..";
            modalButtons.style.display = "none";

            saveQty.disabled = true;
            break;
        }

        // Сбросить количество
        case "restartQty": {
            modalButtonOk.disabled = true;
            break;
        }

        // Удалить алкогольную марку
        case "removeExcise": {
            modalButtonOk.disabled = true;
            break;
        }
	}

	// Формируем XHR запрос
	var XHR = new XMLHttpRequest();
	XHR.open("POST", "api", true);
	XHR.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
	XHR.send(JSON.stringify(_obj));
	XHR.onload = function() {
		// Обработаем ошибку ответа
		if (XHR.status == 200) {
			// Обрабатываем ответ 1С
		    receiveFromAPI(JSON.parse(XHR.responseText), XHR.responseText);
		} else {
			// Сообщим о том, что в 1С возникла ошибка
            console.log("error", XHR);
            
            // Покажем модальное окно ошибки
            modalContainer.style.display = "";
            modalText.innerText = XHR.responseText;
            modalButtons.style.display = "none";
        }
    }
    
    if (_debugMode) {
        removeChildrens(_debugMode);

        let _el = document.createElement("details");
        _el.classList.add("info");
        _el.innerText = JSON.stringify(_obj, null, '\t');
        _debugMode.appendChild(_el);
        let _el2 = document.createElement("summary");
        _el.appendChild(_el2);
        _el2.innerText = "Запрос";
    }
}

// Обработка ответа из 1С
function receiveFromAPI(_answerObj, responseText) {
    if (_debugMode) {
        let _el = document.createElement("details");
        _el.classList.add((_answerObj.status ? "success" : "error"));
        _el.innerText = responseText;
        _debugMode.appendChild(_el);
        let _el2 = document.createElement("summary");
        _el.appendChild(_el2);
        _el2.innerText = "Ответ";
    }

	switch (_answerObj.method) {
		default: {
			console.warn("Unexpected API answer")
			outputStatusText.innerText = _answerObj.data.description;
			break;
        }
        
        case "getConstant": {
            if (_answerObj.status && _answerObj.data) enableDebugMode();
            break;
        }

		// Получить актуальную инвентаризацию
		case "getInventory": {
            // Скрываем модальное окно загрузки
            modalContainer.style.display = "none";

            if (_answerObj.status) {
                inventoryId.innerText = _answerObj.data.inventoryId;
            } else {
                inventoryIsStarted.style.display = "none";
                inventoryIsNotStarted.style.display = "";
            }
            break;
        }

        // Проверить введенный шк
        case "checkBarcode": {
            // Отменяем уточнение номенклатуры
            _confirmBarcode = false;

            // Скрываем модальное окно загрузки
            modalContainer.style.display = "none";

            // Скрываем заголовок с номером инвентаризации
            inventoryHeader.style.display = "none";

            // Показываем информационное сообщение
            outputStatus.style.display = "";
            
            // Очистим старое сообщение
            outputStatusText.innerText = "Ошибка 1С, обновите страницу.";

            // Скроем кнопку отмены
            removeExcise.style.display = "none";
			
            try {
	            if (_answerObj.status) {
	                // Смотрим, что конкретно было отсканировано, ШК или АМ
	                if (_answerObj.data.type == "excise") {
	                    // Отсканирована алкогольная марка

	                    // Покажем свойства АМ
	                    exciseProperties.style.display = "";

	                    // Покажем название алкогольной продукции
	                    if (_answerObj.data.title) {
	                        exciseTitle.innerText = _answerObj.data.title;
	                    } else {
	                        exciseTitle.innerText = "";
	                    }

                        // Покажем количество
                        exciseQty.style.display = (_answerObj.data.qty || _answerObj.data.maxQty ? "" : "none");
                        currentQtyExcise.innerText = _answerObj.data.qty;
                        maxQtyExcise.innerText = _answerObj.data.maxQty;

	                    // Покажем сообщение
	                    outputStatusText.innerText = _answerObj.data.description;

	                    // Звук успешного выполнения операции
	                    playAudio('src/sounds/success.wav');
	                } else {
	                    // Отсканирован штрихкод товара

	                    // Количество по умолчанию равное 1
	                    qtyInput.value = 1;

	                    // Покажем свойства ШК
	                    barcodeProperties.style.display = "";
	                    
	                    // Покажем сообщение
	                    outputStatusText.innerText = _answerObj.data.items[0].title;
	                    currentQty.innerText = _answerObj.data.items[0].currentQty;
	                    qty.innerText = _answerObj.data.items[0].qty;

	                    // Запомним код номенклатуры
                        _currentItemId = _answerObj.data.items[0].id;
                        
                        qtyInput.focus();
	                }
	            } else {
                    // Уточнение штрихкода номенклатуры
                    if (_answerObj.data.type == "confirmBarcode") {
                        // Покажем сообщение
                        outputStatusText.style.display = "";
                        outputStatusText.innerText = _answerObj.data.description;

                        // Покажем кнопку отмены
                        removeExcise.style.display = "";

                        // Ожидаем уточняющий штрихкод
                        _confirmBarcode = true;
                    } else {
                        // Покажем сообщение
                        outputStatusText.innerText = _answerObj.data.description;

                        // Сбросим код номенклатуры
                        _currentItemId = "";
                    } 

                    // Звук внимания
                    playAudio('src/sounds/warning.wav');
	            }
	        } catch {
	        	// Покажем сообщение
                outputStatusText.innerText = "Марка неопределена, отсканируйте повторно.";
                
	        	// Звук при возникновении ошибки
	            playAudio('src/sounds/error.mp3');
	        }

            // Очистим и разблокируем ввод
            barcodeInput.disabled = false;
            barcodeInput.value = "";

            break;
        }

        // Отправить количество
        case "saveQty": {
            // Скрываем модальное окно загрузки
            modalContainer.style.display = "none";

            // Скрываем свойства ШК
            barcodeProperties.style.display = "none";
            saveQty.disabled = false;
            outputStatus.style.display = "";

            if (_answerObj.status) {
                // Покажем сообщение
                outputStatusText.innerText = _answerObj.data.description;

                // Звук успешного выполнения операции
                playAudio('src/sounds/success.wav');
            } else {
                // Покажем сообщение
                outputStatusText.innerText = _answerObj.data.description;

                // Звук при возникновении ошибки
                playAudio('src/sounds/error.mp3');
            }

            break;
        }

        // Сбросить количество
        case "restartQty": {
            modalButtonOk.disabled = false;

            if (_answerObj.status) {
                barcodeProperties.style.display = "none";
                outputStatus.style.display = "";
                modalContainer.style.display = "none";
                
                // Покажем сообщение
                outputStatusText.innerText = _answerObj.data.description;
            }

            break;
        }

        // Удалить алкогольную марку
        case "removeExcise": {
            modalButtonOk.disabled = false;

            if (_answerObj.status) {
                exciseProperties.style.display = "none";
                outputStatus.style.display = "";
                modalContainer.style.display = "none";
                
                // Покажем сообщение
                outputStatusText.innerText = _answerObj.data.description;
            }

            break;
        }
	}
}

function enableDebugMode() {
    _debugMode = document.createElement("div");
    document.body.appendChild(_debugMode);
}