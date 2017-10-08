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

function main(year, detailFlag) {
    var yearList = getYearList();
    if(!!year) {
        if(yearList.includes(year)){
            getOrderHistory([year], detailFlag);
        } else {
            alert("no order for that year");
        }
    } else {
        getOrderHistory(yearList, detailFlag);
    }
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

function appendForm() {
    $("#searchForm").parent().parent().parent().after(`
<div class="a-row">
    <div class="a-column a-span6 a-span-last">
        <form id="get-order-history-form">
            <input id="get-order-history-year" type="text" placeholder="yyyy (空なら全期間)" pattern="[0-9]{4}" maxLength="4">
            <input id="get-order-history-detail-flag" type="checkbox">詳しく
            <input id="get-order-history-button" type="submit" value="CSVダウンロード">
        </form>
    </div>
</div>
    `);
    $("#get-order-history-form").submit(function() {
        event.preventDefault();
        main($("#get-order-history-year").val(), $("#get-order-history-flag").prop("checked"));
    });
}

function getYearList() {
   var list = [];
   $.each($("[id^=orderFilterEntry-year-]"), function(i, val) {
       var text = $(val).text().trim();
       list.push(text.substr(0, 4));
   });
   return list;
}

function getOrderHistory(yearList, detailFlag) {
    var pageList = [], orderList = [], detailList = [];
    $.when.apply(null,  getYearRequestList(yearList, pageList))
    .then(function() {
        $.when.apply(null, getPageRequestList(pageList, orderList))
        .then(function() {
            sortByDate(orderList);
            if(detailFlag) {
                $.when.apply(null,  getOrderRequestList(orderList, detailList))
                .then(function() {
                    // a
                });
            } else {
                download(orderList)
//                console.table(orderList);
            }
        });
    });
}

function getYearRequestList(yearList, pageList) {
    var list = [];
    $.each(yearList, function(i, year) {
        list.push($.ajax({
          url: "/gp/your-account/order-history/?orderFilter=year-" + year,
          beforeSend: function(xhr) {
              xhr.setRequestHeader("X-Requested-With", {toString: function() {return "";}});
          }
        }).done(function(data){
            pageList.push.apply(pageList, getPageList(data, year));
        }));
    });
    return list;
}

function getPageRequestList(pageList, orderList) {
    var list = [];
    $.each(pageList, function(i, page) {
        list.push($.ajax({
            url: page,
            beforeSend: function(xhr) {
              xhr.setRequestHeader("X-Requested-With", {toString: function() {return "";}});
            }
        }).done(function(data){
            orderList.push.apply(orderList, getOrderList(data));
        }));
    });
    return list;
}

function getOrderRequestList(orderList, detailList) {
    var list = [];

    return list;
}

function getPageList(html, year) {
    var list = [];
    var lastIdx = (parseInt($(html).find("ul.a-pagination li.a-normal:last a").text()) - 1) * 10;
    if(isNaN(lastIdx)) {
        lastIdx = 0;
    }
    for(var idx = lastIdx; idx >= 0; idx -= 10) {
        // e.g. https://www.amazon.co.jp/gp/your-account/order-history/?orderFilter=year-2017&startIndex=80
        list.push("/gp/your-account/order-history/?orderFilter=year-" + year + "&startIndex=" + idx);
    }
    return list;
}

function getOrderList(html) {
    var list = [];
    var loop = $(html).find(".a-fixed-right-grid:not([class*=a-spacing-top-])");
    $.each(loop, function(i, val) {
        var values = $(val).find(".a-color-secondary.value");
        var date = values[0].innerText.replace(/[年月]/g,"-").replace("日","").trim();
        list.push({
            "id"    : values[2].innerText.trim(),
            "date"  : fillZero(values[0].innerText.replace(/[年月]/g,"-").replace("日","").trim()),
            "price" : values[1].innerText.replace(/[￥,]/g,"").trim()
        });
    });
    return list;
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
        return 0;
    });
}