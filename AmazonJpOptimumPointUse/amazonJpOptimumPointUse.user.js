// ==UserScript==
// @name         AmazonJpOptimumPointUse
// @version      0.1
// @include      https://www.amazon.co.jp/gp/buy/spc/handlers/display.html*
// @include      https://www.amazon.co.jp/gp/cart/desktop/go-to-checkout.html*
// @grant        none
// @require      https://code.jquery.com/jquery-3.2.1.min.js
// @require      https://git.io/vMmuf
// ==/UserScript==

// Some path to order page is not covered. Need to refresh page for those cases.
// TODO: Should be covered.

waitForKeyElements("#spc-loyalty-points-input", main);
waitForKeyElements("#loyalty-points-button[style='display: none;']", resetButton);

function main() {
    // Assumes Amazon Mastercard Gold.
    // Need to be "0.015" if Amazon Mastercard Classic.
    var pointRate = 0.025;

    var price = $("#spc-form-inputs > input[name='purchaseTotal']").val();
    var availablePoint = $("#loyalty-points-hidden-fields > input[name='jpPointsAvailablePoints']").val();

    var optimumPointUse = calcOptimumPointUse(price, pointRate);
    var actualPointUse = Math.min(optimumPointUse, availablePoint);
    $("#spc-loyalty-points-input").val(actualPointUse);
}

function calcOptimumPointUse(price, pointRate) {
    var incomingPoint = Math.floor(price * pointRate);
    if (incomingPoint == price * pointRate) {
        incomingPoint--;
    }
    return price - (incomingPoint / pointRate + 1) + getCurrentAppliedPoint();
}

function getCurrentAppliedPoint() {
    var point = 0;
    $(".order-summary-unidenfitied-style").each(function(){
        if($(this).children(".a-text-left").text().startsWith("Amazonポイント")){
            point = $(this).children(".a-text-right").text().match(/\d+/)[0];
        }
    });
    return point;
}

function resetButton() {
    var button = $("#loyalty-points-button");
    var appliedText = $("#loyalty-points-applied");

    if(button.attr("style") == "display: none;"){
        appliedText.attr("style","display: none;");
        button.attr("style","display: inline-block;");
    }
}
