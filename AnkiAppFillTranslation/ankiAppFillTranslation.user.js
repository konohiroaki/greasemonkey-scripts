// ==UserScript==
// @name         AnkiAppFillTranslation
// @version      0.1
// @include      https://web.ankiapp.com/*
// @grant        GM_xmlhttpRequest
// @require      https://code.jquery.com/jquery-3.2.1.min.js
// @require      https://git.io/vMmuf
// ==/UserScript==

var backTab =  "div[data-reactid$='.$cardEditor.$left.0.$back.$sep.0.0']";
var frontForm = "div[data-reactid$='.$cardEditor.$left.0.$front.$content.$editor.$editor.0']";
var backForm  = "div[data-reactid$='.$cardEditor.$left.0.$back.$content.$editor.$editor.0']";
var applyButton = "div[data-reactid$='.$cardEditor.$left.0.$back.$content.$editor.$toolbar.$toolbar.$list-unordered.0']";

waitForKeyElements(backTab, main);

function main() {
    if(!isTargetPage) {
        return;
    }

    $(backTab).append(' <button id="fillTranslation">Fill Translation</button>');
    $("#fillTranslation").on("click", fillTranslation);
}

// Not able to control from script metadata because URL has "#"
function isTargetPage() {
    var page = $("div[data-reactid='.0.$header.$mid']").text();
    return page == "New Card" || page == "Edit Card";
}

function fillTranslation() {
    var text = $(frontForm).text();
    GM_xmlhttpRequest({
        method: "GET",
        url: "https://ejje.weblio.jp/content/" + text,
        onload: function(response) {
            var translation = $($.parseHTML(response.responseText)).find(".content-explanation").text();
            $(backForm).focus().text(translation);
            applyFill();
        }
    });
}

function applyFill() {
    $(applyButton).click();
    $(applyButton).click();
}