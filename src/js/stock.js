let manualInput = false;
let barcodeInputTimeout = null;
let lastBarcode = null;
let successSound= document.createElement("audio");
successSound.src = "src/sounds/success.wav";

document.addEventListener("DOMContentLoaded", function() {
    // При клике по вводу, считаем, что осуществляется ручной ввод
    barcodeInput.addEventListener("click", function(e) {
        manualInput = true;
    }, false);
    // При росфокусировке ввода и режиме ручного ввода отправляем штрихкод
    barcodeInput.addEventListener("blur", function(e) {
        if (e.target.value.length > 3 && manualInput) {
            getQty(e.target.value);

            manualInput = false;
            e.target.value = "";
        }
    }, false);
    // При отжатии клавиши не в режиме ручного ввода ждем треть секунды перед отправкой штрихкода
    barcodeInput.addEventListener("keyup", function(e) {
        if (e.target.value.length > 3 && !manualInput) {
            if (barcodeInputTimeout) {
                clearTimeout(barcodeInputTimeout);
                barcodeInputTimeout = null;
            }
    
            barcodeInputTimeout = setTimeout(function() {
                getQty(e.target.value);

                barcodeInput.blur();
                e.target.value = "";
            }, 333);
        }
    }, false);

    // Автоматический фокус на ввод марки
    document.getElementsByTagName("body")[0].addEventListener("keydown", function(e) {
        barcodeInput.focus();
    }, false);

    // Кнопка - обновить
    refreshButton.addEventListener("click", function(e) {
        if (lastBarcode) getQty(lastBarcode);    
    });
});

async function getQty(barcode) {
    productInfo.style.display = "";
    productTitle.classList.remove("warning");

    animate({
    	duration: 500,
    	timing: function(timeFraction) {
    		return timeFraction;
    	},
    	draw: function(progress, options) {
    		productTitle.innerText = options.fullText.substring(0, options.fullText.length * progress);
    	},
    	fullText: "Загрузка..."
    });

    let response = await fetch("api", {
        method: "POST",
        headers: {
            "Content-Type": "application/json;charset=utf-8"
        },
        body: JSON.stringify({
            method: "getQty",
            data: {
                barcode: barcode,
                searchAlcoMark: searchAlcoMark.checked
            }
        })
    });

    if (response.ok) {
        lastBarcode = barcode;

        let answer = await response.json();
        console.log(answer);

        if (searchAlcoMark.checked) {
            if (answer.status && answer.data.qty) {
                productTitle.classList.add("warning");
                answer.data.description = "Обнаружена искомая марка!";
                successSound.play();
            } else {
                answer.data.description = "Марка не находится в поиске.";
            }
        }
        
        // productTitle.innerText = answer.data.description;
        if (answer.status) {
            productQty.style.display = "";
            productPrice.style.display = "";

            productQtyValue.innerText = answer.data.qty;
            productPriceValue.innerText = answer.data.price + " ₽";
            productCompetitorPriceValue.innerText = answer.data.competitorPrice + " ₽";
            productDiscountSource.innerText = answer.data.discountSource;
            if (answer.data.discountSource === "Мониторинг") productDiscountSource.classList.add("productPriceDiscount");
        } else {
            productQty.style.display = "none";
            productPrice.style.display = "none";

            productQtyValue.innerText = 0;
            productPriceValue.innerText = "";
            productCompetitorPriceValue.innerText = "";
            productDiscountSource.innerText = "";
            productDiscountSource.classList.remove("productPriceDiscount");
        }
        
        animate({
            duration: 500,
            timing: function(timeFraction) {
                return timeFraction;
            },
            draw: function(progress, options) {
                productTitle.innerText = options.fullText.substring(0, options.fullText.length * progress);
            },
            fullText: answer.data.description
        });
    } else {
        productTitle.innerText = "Error!";
    }
}