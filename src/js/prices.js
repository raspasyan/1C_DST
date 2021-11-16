document.addEventListener("DOMContentLoaded", init);
function init() {
    document.body.addEventListener("keydown", (e) => {
        document.getElementById("input-block-input-element").focus();
    });

    document.getElementById("input-block-input-element").addEventListener("click", (e) => {
        e.currentTarget.dataset.manualInput = true;
    });

    document.getElementById("input-block-input-element").addEventListener("blur", (e) => {
        if (e.currentTarget.dataset.manualInput) {
            e.currentTarget.dataset.manualInput = false;

            checkBarcode(document.getElementById("input-block-input-element").value).then((result) => {
                drawCheckBarcode(result);

                getControlTable().then((result) => {
                    drawControlTable(result);
                });
            });
        }
    });

    document.getElementById("input-block-input-element").addEventListener("keydown", (e) => {
        let inputTimer = e.currentTarget.dataset.inputTimer;
        if (inputTimer) clearTimeout(inputTimer);

        if (e.currentTarget.dataset.manualInput != "true") {
            inputTimer = setTimeout(() => {
                checkBarcode(document.getElementById("input-block-input-element").value).then((result) => {
                    drawCheckBarcode(result);

                    getControlTable().then((result) => {
                        drawControlTable(result);
                    });
                });
            }, 333);
            e.currentTarget.dataset.inputTimer = inputTimer;
        }
    });

    getControlTable().then((result) => {
        drawControlTable(result);   
    });
}

function drawCheckBarcode(result) {
    document.getElementById("input-block-input-element").value = "";

    if (result.description) {
        document.getElementById("output-block").style.display = "";
        document.getElementById("output-block").scrollIntoView({block: "end", behavior: "smooth"});
        animate({
            duration: 500,
            timing: function(timeFraction) {
                return timeFraction;
            },
            draw: function(progress, options) {
                document.getElementById("output-block-description").style.opacity = 1 * progress;
                document.getElementById("output-block-description").innerText = options.fullText.substring(0, options.fullText.length * progress);
            },
            fullText: result.description
        });
    }

    if (!result.status && result.data.error) console.error(result.data.error);
}

function drawControlTable(result) {
    document.getElementById("loader-block").style.display = "none";

    let openElements = [];
    if (document.getElementById("view-block").children.length) {
        let elements = (document.getElementById("view-block").getElementsByClassName("list"));
        for (let index = 0; index < elements.length; index++) if (elements[index].open) openElements.push(elements[index].getAttribute('code'));
    }

    if (result.status) {
        while (document.getElementById("view-block").children.length) document.getElementById("view-block").removeChild(document.getElementById("view-block").children[0]);
        
        let currentParent = null;
        let currentItemsList = null;
        result.data.forEach(dataRow => {
            if (dataRow.parent != currentParent) {
                currentDetailsEl = document.createElement("details");
                currentDetailsEl.setAttribute("code", dataRow.code);
                currentDetailsEl.open = openElements.indexOf(dataRow.code) != -1;
                currentDetailsEl.classList.add("list");

                let summaryElement = document.createElement("summary");
                summaryElement.classList.add("list-header");

                let divElementTitle = document.createElement("div");
                divElementTitle.classList.add("list-header-title");
                divElementTitle.innerText = dataRow.parent;
                summaryElement.appendChild(divElementTitle);

                let divElementIcon = document.createElement("div");
                divElementIcon.classList.add("list-header-icon");
                summaryElement.appendChild(divElementIcon);
                
                currentDetailsEl.appendChild(summaryElement);

                currentItemsList = document.createElement("list-items");
                currentItemsList.classList.add("list-items");
                currentDetailsEl.appendChild(currentItemsList);

                document.getElementById("view-block").appendChild(currentDetailsEl);

                currentParent = dataRow.parent;
            }

            let liElementItem = document.createElement("li");

            let divElementItemImg = document.createElement("div");
            divElementItemImg.setAttribute("class", "list-item-icon img img-medium");
            let icon = "img-print";
            switch (dataRow.state) {
                case 1: {
                    icon = "img-shelf";    
                }
            } 
            divElementItemImg.classList.add(icon);
            liElementItem.appendChild(divElementItemImg);

            let divElementItemTitle = document.createElement("div");
            divElementItemTitle.innerText = "[" + dataRow.code + "] " + dataRow.title;
            divElementItemTitle.classList.add("list-item-title");
            liElementItem.appendChild(divElementItemTitle);

            currentItemsList.appendChild(liElementItem);
        });
    } else {
        document.getElementById("output-block").style.display = "";
        animate({
            duration: 500,
            timing: function(timeFraction) {
                return timeFraction;
            },
            draw: function(progress, options) {
                document.getElementById("output-block-description").style.opacity = 1 * progress;
                document.getElementById("output-block-description").innerText = options.fullText.substring(0, options.fullText.length * progress);
            },
            fullText: result.description
        });
    }
}

async function checkBarcode(barcode) {
    document.getElementById("input-block").style.display = "none";
    document.getElementById("input-block-input-element").disabled = true;
    
    document.getElementById("output-block").style.display = "none";
    document.getElementById("output-block-description").innerText = "";

    document.getElementById("loader-block").style.display = "";

    let body = {
        "method": "pricesCheckBarcode",
        "data": {
            "barcode": barcode
        }
    }
    
    let response = await fetch("api", {
        method: "POST",
        headers: {
          "Content-Type": "application/json;charset=utf-8"
        },
        body: JSON.stringify(body)
    });
    
    let result = await response.json();

    document.getElementById("input-block").style.display = "";
    document.getElementById("input-block-input-element").disabled = false;

    document.getElementById("loader-block").style.display = "none";
    
    return result;
}

async function getControlTable() {
    document.getElementById("loader-block").style.display = "";

    let body = {
        "method": "pricesGetControlTable"
    }
    
    let response = await fetch("api", {
        method: "POST",
        headers: {
          "Content-Type": "application/json;charset=utf-8"
        },
        body: JSON.stringify(body)
    });
    
    let result = await response.json();

    document.getElementById("loader-block").style.display = "none";
    
    return result;
}