// ==UserScript==
// @name         AmazonJpGetOrderHistory
// @namespace    https://github.com/konohiroaki/
// @version      0.1
// @include      https://www.amazon.co.jp/gp/css/order-history*
// @include      https://www.amazon.co.jp/gp/your-account/order-history*
// @grant        none
// @require      https://code.jquery.com/jquery-3.2.1.min.js
// @require      https://git.io/vMmuf
// ==/UserScript==

waitForKeyElements("#searchForm", appendForm);

function appendForm() {
    $("#searchForm").parent().parent().parent().after(`
<div class="a-row">
    <div class="a-column a-span6 a-span-last">
        <form id="get-order-history-form">
            <input id="get-order-history-year" type="text" placeholder="yyyy (空なら全期間)" pattern="[0-9]{4}" maxLength="4">
            <input id="get-order-history-button" type="submit" value="CSVダウンロード">
        </form>
    </div>
</div>
    `);
    $("#get-order-history-form").submit(function(event) {
        event.preventDefault();
        main($("#get-order-history-year").val());
    });
}

function main(year) {
    var yearList = getYearList();
    if(!!year) {
        if(yearList.includes(year)){
            getOrderHistory([year]);
        } else {
            alert("no order for that year");
        }
    } else {
        getOrderHistory(yearList);
    }
}

function getYearList() {
   var list = [];
   $.each($("[id^=orderFilterEntry-year-]"), function(i, val) {
       var text = $(val).text().trim();
       list.push(text.substr(0, 4));
   });
   return list;
}

function getOrderHistory(yearList) {
    var pageList = [], purchaseList = [], orderInfoList = [];
    $.when.apply(null,  getYearRequestList(yearList, pageList))
    .then(function() { // created page list
        $.when.apply(null, getPageRequestList(pageList, purchaseList, orderInfoList))
        .then(function() { // created most data but need to finalize with detail access for some orders.
            $.when.apply(null,  getOrderRequestList(orderInfoList, purchaseList))
            .then(function() {
                sortByDate(purchaseList);
                download(purchaseList);
//                console.table(purchaseList);
            });
        });
    });
}

function getYearRequestList(yearList, pageList) {
    var list = [];
    $.each(yearList, function(i, year) {
        list.push(createAjaxRequest("/gp/your-account/order-history/?orderFilter=year-" + year, function(data) {
          pageList.push.apply(pageList, getPageList(data, year));
        }));
    });
    return list;
}

function getPageList(html, year) {
    var list = [];
    var lastIdx = (parseInt($(html).find("ul.a-pagination li.a-normal:last a").text()) - 1) * 10;
    if(isNaN(lastIdx)) {
        lastIdx = 0;
    }
    for(var idx = lastIdx; idx >= 0; idx -= 10) {
        list.push("/gp/your-account/order-history/?orderFilter=year-" + year + "&startIndex=" + idx);
    }
    return list;
}

function getPageRequestList(pageList, purchaseList, orderInfoList) {
    var list = [];
    $.each(pageList, function(i, page) {
        list.push(createAjaxRequest(page, function(data) {
            fillList(data, purchaseList, orderInfoList);
        }));
    });
    return list;
}

function fillList(html, purchaseList, orderInfoList) {
    var orderList = $(html).find(".order");
    $.each(orderList, function(i, order){
        var values = $(order).find(".order-info .a-color-secondary.value");
        var orderInfo = {
            "id": values[2].innerText.trim(),
            "date": fillZero(values[0].innerText.replace(/[年月]/g,"-").replace("日","").trim()),
            "price": values[1].innerText.replace(/[￥,]/g,"").trim()
        };

        if($(order).find(".shipment .a-fixed-right-grid:contains('すべての商品を表示')").length) {
            orderInfoList.push(orderInfo);
        } else {
            purchaseList.push.apply(purchaseList, getPurchaseItemList(order, orderInfo));
        }
    });
}

function getPurchaseItemList(html, orderInfo) {
    var list = [];
    var itemList = $(html).find(".shipment .a-fixed-left-grid");
    $.each(itemList, function(i, item) {
        var detail = $(item).find(".a-fixed-left-grid-col.a-col-right > .a-row");
        list.push({
            "id": orderInfo.id,
            "date": orderInfo.date,
            "name": detail[0].innerText.trim().replace(/^商品名：|、数量：\d+$|,/g,"").split("\n")[0],
            "url": "https://www.amazon.co.jp" + $(detail[0]).find("a").attr("href").split("ref=")[0],
            "seller": detail.find("span:contains('販売: ')").text().trim().replace(/^販売:|,/g,"").trim().trim().split("\n")[0],
            "unitPrice": detail.find("span:contains('￥ ')").text().replace(/[￥,]/g,"").trim(),
            "quantity": $(item).find(".item-view-qty").text().trim() || "1",
            "orderPrice": orderInfo.price
        });
    });
    return list;
}

function getOrderRequestList(orderInfoList, purchaseList) {
    var list = [];
    $.each(orderInfoList, function(i, orderInfo) {
        list.push(createAjaxRequest("/gp/your-account/order-details/?orderID=" + orderInfo.id, function(data) {
          purchaseList.push.apply(purchaseList, getPurchaseItemList(data, orderInfo));
        }));
    });
    return list;
}

function createAjaxRequest(url, doneFunc) {
    return $.ajax({
        url: url,
        // remove "X-Requested-With: XMLHttpRequest" header.
        beforeSend: function(xhr) {xhr.setRequestHeader("X-Requested-With", {toString: function() {return "";}});}
    }).done(doneFunc);
}

function download(history) {
    var bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
    var content = createCSV(history);
    var blob = new Blob([bom, content], {"type": "text/csv"});
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = 'amazon_history.csv';
    a.click();
}

function createCSV(history) {
    var keys = Object.keys(history[0]);
    var header = keys.join(",") + "\n";
    var body = "";
    $.each(history, function(i, val) {
        body += Object.values(val).join(",") + "\n";
    });
    return header + body;
}

function fillZero(date) {
    var list = date.split("-");
    for(var i=1; i<list.length; i++){
        if(list[i].length === 1) {
            list[i] = "0" + list[i];
        }
    }
    return list.join("-");
}

function sortByDate(data) {
    data.sort(function(a, b) {
        if(a.date < b.date) return -1;
        if(a.date > b.date) return 1;
        if(a.name < b.name) return -1;
        if(a.name > b.name) return 1;
        return 0;
    });
}