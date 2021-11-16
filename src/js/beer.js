var _lastBeerId = "";
const _perPage = 24;

document.addEventListener("DOMContentLoaded", function() {
    // Получим и отрисуем список разливного пива
    sendToAPI({method: "getBeer"});

    modalContainer.addEventListener("click", function(e) {
        if (e.target.classList.contains("modal-container")) {
            _lastBeerId = "";
            modalContainer.setAttribute("style", "display: none");
        }

        let _beerValueEl = findChildByClassName(e.target, "beer-weight");
        if (_beerValueEl) {
            modalImage.setAttribute("class", "img img-medium img-load");
            modalInfo.innerText = "Печать штрихкода..";

            sendToAPI({
                method: "printBeerBarcode",
                data: {
                    beerId: _lastBeerId,
                    beerValue: _beerValueEl.getAttribute("value") 
                }
            });
        }
    }, false);
});

// XHR запрос к API 1С
function sendToAPI(_obj) {
	switch (_obj.method) {
		default: {
			console.warn("Unexpected API method");
			break;
		}

		// Получить список разливного пива
		case "getBeer": {
			break;
        }
        
        // Распечатать штрихкод нужного объема
        case "printBeerBarcode": {
            // console.log(_obj);
            modalBeerWeightContainer.style.display = "none";
            modalInfoContainer.style.display = "block";
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
		if (XHR.status == 500) {
			// Сообщим о том, что в 1С возникла ошибка
			console.log("error", XHR);

			// showModal("Ошибка 1С!", "img-medium img-warning");
			return;
		}
		
		// Обрабатываем ответ 1С
		receiveFromAPI(JSON.parse(XHR.responseText));
	}
}

// Обработка ответа из 1С
function receiveFromAPI(_answerObj) {
	switch (_answerObj.method) {
		default: {
			console.warn("Unexpected API answer")
			break;
		}

		// Получить список разливного пива
		case "getBeer": {
            if (_answerObj.status && _answerObj.data.length) {
                drawBeer(_answerObj.data);
                if (_answerObj.data.length > _perPage) drawFooter(_answerObj.data);
            }
            break;
        }

        case "printBeerBarcode": {

            if (_answerObj.status) {
                modalContainer.style.display = "none";
                modalBeerWeightContainer.style.display = "none";
                modalInfoContainer.style.display = "none";
                location.reload();
            } else {
                modalImage.setAttribute("class", "img img-medium img-warning");
                modalInfo.innerText = _answerObj.data.errorDescription;
            }

            break;
        }
	}
}

function compareNumeric(a, b) {
    if (Number(a.number) > Number(b.number)) return 1;
    if (Number(a.number) < Number(b.number)) return -1;
}

function drawBeer(beerList) {
    // Сортируем по номеру крана
    beerList.sort(compareNumeric);

    for (let i = 0; i < beerList.length; i++) {
        var _newBeer = document.createElement("div");
        _newBeer.setAttribute("class", "img img-big img-beer");
        _newBeer.setAttribute("jsBeerId", beerList[i].id);
        _newBeer.setAttribute("jsBeerNumber", beerList[i].number);
        _newBeer.setAttribute("jsBeerTitle", beerList[i].title);
        _newBeer.setAttribute("jsBeerQty", beerList[i].qty);
        _newBeer.setAttribute("jsBeerTotalQty", beerList[i].totalQty);
        _newBeer.classList.add("beer");

        var _span = document.createElement("span");
        _span.innerText = beerList[i].number;
        _span.setAttribute("class", "beer-description");
        _newBeer.appendChild(_span);

        beers.appendChild(_newBeer);
    }

    beers.addEventListener("click", function(e){
        var _beer = findChildByClassName(e.target, "beer");
        if (_beer) {
            _lastBeerId = _beer.getAttribute("jsBeerId");
            modalContainer.style.display = "block";
            modalBeerWeightContainer.style.display = "block";
            modalBeerWeightInfo.innerText = _beer.getAttribute("jsBeerTitle") + "\n" + _beer.getAttribute("jsBeerNumber");
            modalBeerWeightQty.innerText = _beer.getAttribute("jsBeerQty");
            modalNotInStock.style.display = (Number(_beer.getAttribute("jsBeerQty")) ? "none" : "");
            modalBeerWeightTotalQty.innerText = _beer.getAttribute("jsBeerTotalQty");
            modalInfoContainer.style.display = "none";
        }
    }, false);
}

function drawFooter(beerList) {
    var _pageCount = Math.ceil(beerList.length / _perPage);
    footer.setAttribute("style", "");

    for (let i = 0; i < _pageCount; i++) {
        let _newPage = document.createElement("div");
        _newPage.setAttribute("class", "page");
        _newPage.innerText = i + 1;
        
        footer.appendChild(_newPage);
    }

    footer.addEventListener("click", function(e){
        if (e.target.classList.contains("page")) beers.children[((+e.target.innerText) - 1) * _perPage].scrollIntoView(true);
    }, false);
}

function findChildByClassName(_el, _cn) {
    while (_el != document.body) {
        if (_el.classList.contains(_cn)) return _el;
        _el = _el.parentNode;
    }
    return null;
}