// Таймер поля ввода
var _barcodeInputTimeout = null;
var _barcodeFocusTimeout = null;

let _craneNumberTimer = null;
let _craneNumberManualInput = false;

// Режим разработчика
var _debugMode = null;

// Режим подтверждения каких-либо действий
var _confirmationMode = false;

// Текущая страница
// init         - главная, сканирование штрихкода
// input        - приемка кеги
// connect      - подключение кеги
// disconnect   - отключение кеги
var _currentPage = "init";

// Последний отсканированный штрихкод
var _lastBarcode = "";

// Ожидаемый номер крана номенклатуры
var _expectedCraneNumber = "";

// Выбранная дата розлива
var _bottlingDate = "";

document.addEventListener("DOMContentLoaded", function() {

    // Ввод даты
    $('#customBottlingDate').datepicker({
        onSelect: function(formattedDate, date, inst){
            if (formattedDate) {
                // Форматируем дату
                let _dateArr = formattedDate.split(".");
                _bottlingDate = _dateArr[2] + _dateArr[1] + _dateArr[0];
        
                // Закрываем календарь
                inst.hide();
            }
        }
    });

    bottlingDates.addEventListener("click", function(e) {

        for (let i = 0; i < bottlingDates.children.length; i++) {
            bottlingDates.children[i].classList.remove("primary");   
        }

        e.target.classList.add("primary");

        _bottlingDate = e.target.getAttribute("bottlingDate");

    });

    // Получим статус отладки
    sendToAPI({method: "getConstant", data: "HTTPDebug"});

    //// Прослушиваем ввод ШК/АМ
    // Автоматический фокус на ввод марки
    document.body.addEventListener("keydown", function(e) {
        if (document.activeElement != capacity && document.activeElement != craneNumber) {
            if (_currentPage == "connect") {
                craneNumber.value = "";
                craneNumber.focus();
            } else {
                barcodeInput.focus();
            }
        }
    }, false);

    barcodeInput.addEventListener("focus", function(e) {
        if (_barcodeFocusTimeout) {
            clearTimeout(_barcodeFocusTimeout);
            _barcodeFocusTimeout = null;
        }  
        
        _barcodeFocusTimeout = setTimeout(function() {
            barcodeInput.blur();
            barcodeInputTip.scrollIntoView();   
        }, 1000)
    });

    craneNumber.addEventListener("click", function(e) {
        if (_craneNumberTimer) clearTimeout(_craneNumberTimer);
        _craneNumberManualInput = true;
    });
    craneNumber.addEventListener("keyup", function(e) {
        if (!_craneNumberManualInput) {
            if (_craneNumberTimer) clearTimeout(_craneNumberTimer);

            _craneNumberTimer = setTimeout(function() {
                craneNumber.blur();

                // Подключить кегу
                // sendToAPI({method: "connectKeg", data: {
                //     barcode: _lastBarcode,
                //     craneNumber: craneNumber.value
                // }});
            }, 333);
        }
    });
    craneNumber.addEventListener("blur", function(e) {
        if (_craneNumberManualInput) _craneNumberManualInput = false;  
    });

    // При отжатии клавиши не в режиме ручного ввода ждем треть секунды перед отправкой штрихкода
    barcodeInput.addEventListener("keyup", function(e) {
        if (e.target.value.length) {
            if (_barcodeInputTimeout) {
                clearTimeout(_barcodeInputTimeout);
                _barcodeInputTimeout = null;
            }

            if (_barcodeFocusTimeout) {
                clearTimeout(_barcodeFocusTimeout);
                _barcodeFocusTimeout = null;
            }
    
            _barcodeInputTimeout = setTimeout(function() {
                // Отправим штрихкод на проверку
                sendToAPI({method: "getKegStatus", data: {
                    barcode: barcodeInput.value 
                }});
            }, 333);
        }
    }, false);
    //// Прослушиваем ввод ШК/АМ

    // Событие клика по основной кнопке
    buttonOk.addEventListener("click", function(e) {
        switch (_currentPage) {
            default: {
                console.log(_currentPage);
                break;
            }

            case "input": {
                // Принять кегу
                sendToAPI({method: "inputKeg", data: {
                    barcode: _lastBarcode,
                    capacity: capacity.value,
                    bottlingDate: _bottlingDate,
                    confirmation: _confirmationMode
                }});

                break;
            }

            case "connect": {
                let _currentCraneNumber = craneNumber.value;

                // Убедимся, что кегу подключают к ожидаемому крану
                if (_expectedCraneNumber != "" && craneNumber.value != _expectedCraneNumber && !_confirmationMode) {
                    animate({
                        duration: 500,
                        timing: function(timeFraction) {
                            return timeFraction;
                        },
                        draw: function(progress, options) {
                            barcodeInputTip.style.opacity = 1 * progress;
                            barcodeInputTip.innerText = options.fullText.substring(0, options.fullText.length * progress);
                        },
                        fullText: "Кега должна быть подключена к крану №" + _expectedCraneNumber + "\nВы уверены, что хотите подключить кегу к крану №" + _currentCraneNumber + "?"
                    });

                    playAudio("src/sounds/warning.wav"); 
                    _confirmationMode = true;
                    break;
                }

                // Подключить кегу
                sendToAPI({method: "connectKeg", data: {
                    barcode: _lastBarcode,
                    craneNumber: _currentCraneNumber
                }});

                break;
            }

            case "disconnect": {
                // Отключить кегу
                sendToAPI({method: "disconnectKeg", data: {
                    barcode: _lastBarcode,
                    disconnectionReason: disconnectionReason.value
                }});
                
                break;
            }
        }
    }, false);

    // Событие клика по дополнительной кнопке
    buttonCancel.addEventListener("click", function(e) {
        switch (_currentPage) {
            default: {
                console.log(_currentPage);
                break;
            }
            case "input": {
                // Принять кегу
                cancelInput();

                break;
            }
            case "connect": {
                // Подключить кегу
                cancelInput();

                break;
            }
            case "disconnect": {
                // Отключить кегу
                cancelInput();

                break;
            }
        }
    }, false);

    // Отмена приемки
    buttonDelete.addEventListener("click", function(e) {
        // Отключить кегу
        sendToAPI({method: "deleteKeg", data: {
            barcode: _lastBarcode
        }});
    }, false);

    // Подсказка о сканировании штрихкода
    animate({
        duration: 500,
        timing: function(timeFraction) {
            return timeFraction;
        },
        draw: function(progress, options) {
            barcodeInputTip.style.opacity = 1 * progress;
            barcodeInputTip.innerText = options.fullText.substring(0, options.fullText.length * progress);
        },
        fullText: "Отсканируйте штрихкод кеги."
    });
});

// XHR запрос к API 1С
function sendToAPI(_obj) {
    // Обработчики перед отправкой
	switch (_obj.method) {
		default: {
			console.warn("Unexpected API method");
			break;
        }
        
        case "getConstant": {
            animate({
                duration: 500,
                timing: function(timeFraction) {
                    return timeFraction;
                },
                draw: function(progress, options) {
                    barcodeInputTip.style.opacity = 1 * progress;
                    barcodeInputTip.innerText = options.fullText.substring(0, options.fullText.length * progress);
                },
                fullText: "Загрузка..."
            });
            break;
        }

		// Получить статус кеги
		case "getKegStatus": {
            // Запомним штрихкод
            _lastBarcode = barcodeInput.value;
            // Очистим ввод
            barcodeInput.value = "";
            // Снимаем фокус
            barcodeInput.blur();

            animate({
                duration: 500,
                timing: function(timeFraction) {
                    return timeFraction;
                },
                draw: function(progress, options) {
                    barcodeInputTip.style.opacity = 1 * progress;
                    barcodeInputTip.innerText = options.fullText.substring(0, options.fullText.length * progress);
                },
                fullText: "Загрузка..."
            });
			break;
        }

        // Принять кегу
        case "inputKeg": {
            // Блокируем ввод
            buttonOk.disabled = true;
            buttonCancel.disabled = true;

            // Отключаем режим подтверждения
            _confirmationMode = false;

            // Сброс даты розлива
            // dateOfBottling.value = "";

            animate({
                duration: 500,
                timing: function(timeFraction) {
                    return timeFraction;
                },
                draw: function(progress, options) {
                    barcodeInputTip.style.opacity = 1 * progress;
                    barcodeInputTip.innerText = options.fullText.substring(0, options.fullText.length * progress);
                },
                fullText: "Загрузка..."
            });

            break;
        }

        // Подключить кегу
        case "connectKeg": {
            // Блокируем ввод
            buttonOk.disabled = true;
            buttonCancel.disabled = true;

            // Отключаем режим подтверждения
            _confirmationMode = false;

            animate({
                duration: 500,
                timing: function(timeFraction) {
                    return timeFraction;
                },
                draw: function(progress, options) {
                    barcodeInputTip.style.opacity = 1 * progress;
                    barcodeInputTip.innerText = options.fullText.substring(0, options.fullText.length * progress);
                },
                fullText: "Загрузка..."
            });

            break;
        }

        // Отключить кегу
        case "disconnectKeg": {
            // Блокируем ввод
            buttonOk.disabled = true;
            buttonCancel.disabled = true;

            animate({
                duration: 500,
                timing: function(timeFraction) {
                    return timeFraction;
                },
                draw: function(progress, options) {
                    barcodeInputTip.style.opacity = 1 * progress;
                    barcodeInputTip.innerText = options.fullText.substring(0, options.fullText.length * progress);
                },
                fullText: "Загрузка..."
            });

            break;
        }

        // Отменить приемку кеги
        case "deleteKeg": {
            // Блокируем ввод
            buttonOk.disabled = true;
            buttonCancel.disabled = true;
            buttonDelete.disabled = true;

            animate({
                duration: 500,
                timing: function(timeFraction) {
                    return timeFraction;
                },
                draw: function(progress, options) {
                    barcodeInputTip.style.opacity = 1 * progress;
                    barcodeInputTip.innerText = options.fullText.substring(0, options.fullText.length * progress);
                },
                fullText: "Загрузка..."
            });

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
            modalImage.setAttribute("class", "img img-medium img-delete");
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

    // Описание результата
    let _textResult = (_answerObj.data.description != undefined && _answerObj.data.description ? _answerObj.data.description : responseText);
    // Прокрутить страницу к описанию результата
    barcodeInputTip.scrollIntoView();

	switch (_answerObj.method) {
		default: {
			console.warn("Unexpected API answer")
			break;
        }
        
        case "getConstant": {
            if (_answerObj.status && _answerObj.data) enableDebugMode();
            break;
        }

		// Получить статус кеги
		case "getKegStatus": {
            if (_answerObj.status) {
                // Скрываем причину отключения
                disconnectionReasonCont.style.display = "none";
                // Скрываем кнопки
                buttons.style.display = "none";
                // Скрываем св-ва кеги
                properties.style.display = "none";
                // Скрываем св-ва крана
                craneProperties.style.display = "none";

                switch (_answerObj.data.barcodeStatus) {
                    default: {
                        // Некорректный штрихкод
                        playAudio("src/sounds/warning.wav");
                        _currentPage = "init";

                        break;
                    }

                    // Кега не принята
                    case 1: {
                        // Покажем кнопки
                        _currentPage = "input";
                        buttons.style.display = "";
                        buttonOk.innerText = "Принять кегу";
                        buttonCancel.innerText = "Отмена";
                        buttonDelete.style.display = "none";

                        // Покажем ввод розлива и емкости
                        properties.style.display = "";
                        capacity.value = "";

                        removeChildrens(bottlingDates);
                        if (_answerObj.data.bottlingDates.length) {
                            
                            bottlingDates.style.display = "";
                            customBottlingDate.style.display = "none";

                            _answerObj.data.bottlingDates.forEach(bottlingDate => {
                                let bottlingDateElement = document.createElement("button");  
                                bottlingDateElement.classList.add("u-full-width");
                                bottlingDateElement.setAttribute("bottlingDate", bottlingDate);

                                let bottlingDateSplit = bottlingDate.split(".");
                                let date = new Date(bottlingDateSplit[0], Number(bottlingDateSplit[1] - 1), bottlingDateSplit[2]);  
                                bottlingDateElement.innerText = date.toLocaleString("ru", {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                });

                                bottlingDates.appendChild(bottlingDateElement);
                            });

                        } else {

                            bottlingDates.style.display = "none";
                            customBottlingDate.style.display = "";

                        }


                        // Скрываем св-ва крана
                        craneProperties.style.display = "none";

                        break;
                    }

                    // Кега принята
                    case 2: {
                        // Покажем кнопки
                        _currentPage = "connect";
                        buttons.style.display = "";
                        buttonOk.innerText = "Подключить кегу";
                        buttonCancel.innerText = "Отмена";

                        // Скрываем св-ва кеги
                        properties.style.display = "none";

                        // Показываем св-ва крана
                        craneProperties.style.display = "";
                        // Ожидаемый номер крана
                        _expectedCraneNumber = (_answerObj.data.expectedCraneNumber != undefined ? _answerObj.data.expectedCraneNumber : "")
                        craneNumber.value = _expectedCraneNumber;

                        // Если кега ещё не была использована, покажем кнопку отмены приемки
                        buttonDelete.style.display = (_answerObj.data.inUse ? "none" : "");

                        break;
                    }

                    // Кега подключена
                    case 3: {
                        // Покажем выбор причины отключения 
                        disconnectionReasonCont.style.display = "";
                                       
                        // Покажем кнопки
                        _currentPage = "disconnect";
                        buttons.style.display = "";
                        buttonOk.innerText = "Отключить кегу";
                        buttonCancel.innerText = "Отмена";
                        buttonDelete.style.display = "none";

                        // Скрываем св-ва кеги
                        properties.style.display = "none";

                        // Скрываем св-ва крана
                        craneProperties.style.display = "none";

                        break;
                    }
                }
            }

            animate({
                duration: 500,
                timing: function(timeFraction) {
                    return timeFraction;
                },
                draw: function(progress, options) {
                    barcodeInputTip.style.opacity = 1 * progress;
                    barcodeInputTip.innerText = options.fullText.substring(0, options.fullText.length * progress);
                },
                fullText: _textResult
            });

			break;
        }

        // Принять кегу
        case "inputKeg": {
            // Разблокируем ввод
            buttonOk.disabled = false;
            buttonCancel.disabled = false;

            if (_answerObj.status) {
                playAudio("src/sounds/success.wav"); 
                
                // Скрываем кнопки
                buttons.style.display = "none";
                // Скрываем св-ва кеги
                properties.style.display = "none";
                // Скрываем св-ва крана
                craneProperties.style.display = "none";
            } else {
                playAudio("src/sounds/warning.wav"); 
                
                if (_answerObj.data.needConfirmation != undefined && _answerObj.data.needConfirmation) _confirmationMode = true;
            }

            animate({
                duration: 500,
                timing: function(timeFraction) {
                    return timeFraction;
                },
                draw: function(progress, options) {
                    barcodeInputTip.style.opacity = 1 * progress;
                    barcodeInputTip.innerText = options.fullText.substring(0, options.fullText.length * progress);
                },
                fullText: _textResult
            });

            break;
        }

        // Подключить кегу
        case "connectKeg": {
            // Разблокируем ввод
            buttonOk.disabled = false;
            buttonCancel.disabled = false;

            if (_answerObj.status) {
                playAudio("src/sounds/success.wav"); 

                // Скрываем кнопки
                buttons.style.display = "none";
                // Скрываем св-ва кеги
                properties.style.display = "none";
                // Скрываем св-ва крана
                craneProperties.style.display = "none";

                // Кега успешно подключена
                _currentPage = "init";
            } else {
                playAudio("src/sounds/warning.wav");    
            }

            animate({
                duration: 500,
                timing: function(timeFraction) {
                    return timeFraction;
                },
                draw: function(progress, options) {
                    barcodeInputTip.style.opacity = 1 * progress;
                    barcodeInputTip.innerText = options.fullText.substring(0, options.fullText.length * progress);
                },
                fullText: _textResult
            });

            break;
        }

        // Отключить кегу
        case "disconnectKeg": {
            // Разблокируем ввод
            buttonOk.disabled = false;
            buttonCancel.disabled = false;

            if (_answerObj.status) {
                playAudio("src/sounds/success.wav"); 

                // Скрываем кнопки
                buttons.style.display = "none";
                // Скрываем св-ва кеги
                properties.style.display = "none";
                // Скрываем св-ва крана
                craneProperties.style.display = "none";
            } else {
                playAudio("src/sounds/warning.wav");    
            }

            animate({
                duration: 500,
                timing: function(timeFraction) {
                    return timeFraction;
                },
                draw: function(progress, options) {
                    barcodeInputTip.style.opacity = 1 * progress;
                    barcodeInputTip.innerText = options.fullText.substring(0, options.fullText.length * progress);
                },
                fullText: _textResult
            });

            break;
        }

        // Отключить кегу
        case "deleteKeg": {
            // Разблокируем ввод
            buttonOk.disabled = false;
            buttonCancel.disabled = false;
            buttonDelete.disabled = false;
            // buttonDelete.style.display = "none";

            if (_answerObj.status) {
                playAudio("src/sounds/success.wav"); 

                // Скрываем кнопки
                buttons.style.display = "none";
                // Скрываем св-ва кеги
                properties.style.display = "none";
                // Скрываем св-ва крана
                craneProperties.style.display = "none";

                // Кега успешно удалена
                _currentPage = "init";
            } else {
                playAudio("src/sounds/warning.wav");    
            }

            animate({
                duration: 500,
                timing: function(timeFraction) {
                    return timeFraction;
                },
                draw: function(progress, options) {
                    barcodeInputTip.style.opacity = 1 * progress;
                    barcodeInputTip.innerText = options.fullText.substring(0, options.fullText.length * progress);
                },
                fullText: _textResult
            });

            break;
        }
	}
}

// Сервисные функции
function cancelInput() {
    _currentPage = "init";
    _lastBarcode = "";
    _confirmationMode = false;
    buttons.style.display = "none";
    properties.style.display = "none";
    craneProperties.style.display = "none";
    animate({
        duration: 500,
        timing: function(timeFraction) {
            return timeFraction;
        },
        draw: function(progress, options) {
            barcodeInputTip.style.opacity = 1 * progress;
            barcodeInputTip.innerText = options.fullText.substring(0, options.fullText.length * progress);
        },
        fullText: "Отсканируйте штрихкод кеги."
    });
}

function enableDebugMode() {
    _debugMode = document.createElement("div");
    document.body.appendChild(_debugMode);
}