// 生育スケルトン描画プラグイン

(function ($) {

    // 生育スケルトンテーブルへデータを追加
    $.fn.growthSkeletonTable = function (options) {

        return this.each(function () {

            insertTableValue($(this), options.dataAverageJson, options.referenceAverageJson);
        });
    }

    // 生育スケルトンノートへメッセージを追加
    $.fn.growthSkeletonNote = function (options) {

        return this.each(function () {

            insertNoteMessage($(this), options.dataAverageJson, options.referenceAverageJson);
        });
    }

    // 生育スケルトンコメントへメッセージを追加
    $.fn.growthSkeletonComment = function (options) {

        return this.each(function () {
            insertComment($(this), options);
        });
    }

    function insertTableValue($table, dataAverageJson, referenceAverageJson) {

        // 変化量表示
        $table.find("[data-info]").each(function (index, row) {

            var $row = $(row);
            var test = $row.data("unit");
            var targetKey = $row.data("info");
            var errorRate = 0;
            var baseString = "-";
            var refString = "-";

            if (targetKey in dataAverageJson) {

                if (targetKey in referenceAverageJson) {

                    errorRate = calculationErrorRate(dataAverageJson[targetKey].average(), referenceAverageJson[targetKey].average());
                }
                baseString = calculationUnit(dataAverageJson[targetKey].average(), $row).toFixed(2);
            }

            if (targetKey in referenceAverageJson) {
                refString = calculationUnit(referenceAverageJson[targetKey].average(), $row).toFixed(2);
            }

            numberModifier($row, errorRate);
            $row.find("[data-content='base']").text(baseString);
            $row.find("[data-content='reference']").text(refString);

        });
    }

    // 誤差率算出
    function calculationErrorRate(dataAverage, referenceAverage) {

        var errorRate = 0;
        var avePerAve = dataAverage / referenceAverage;

        if ((avePerAve - 1) * 100 >= 1 || (avePerAve - 1) * 100 <= -1) {
            errorRate = (avePerAve - 1) * 100;
        }

        return errorRate;
    }

    // 設定単位による桁合わせ
    function calculationUnit(mm, $row) {

        var unit = $row.data("unit");
        var ret = mm;

        if (unit == "cm") {
            ret = mm / 10;
        } else if (unit == "m2") {
            ret = mm / 100 / 100 / 100;
        }

        return ret;
    }

    function numberModifier($row, val) {

        var valString = "";
        var setClass = "";
        var rotate = "";
        var $vectorTag = $("<span>→</span>");
        var $selRate = $row.find("[data-content='rate']");

        // 対象クラスの削除
        if ($selRate.hasClass("plus")) $selRate.removeClass("plus");
        if ($selRate.hasClass("minus")) $selRate.removeClass("minus");
        if ($selRate.hasClass("zero")) $selRate.removeClass("zero");

        val = Math.round(val);

        // 矢印の向きを設定
        if (val > 0 && val <= 10) {
            rotate = "rotate(-15deg)";
        } else if (val > 10 && val <= 20) {
            rotate = "rotate(-45deg)";
        } else if (val > 20 && val <= 30) {
            rotate = "rotate(-60deg)";
        } else if (val > 30) {
            rotate = "rotate(-90deg)";
        } else if (val < 0 && val >= -10) {
            rotate = "rotate(15deg)";
        } else if (val < -10 && val >= -20) {
            rotate = "rotate(45deg)";
        } else if (val < -20 && val >= -30) {
            rotate = "rotate(60deg)";
        } else if (val < -30) {
            rotate = "rotate(90deg)";
        }

        if (val > 0) {
            valString = val.toString() + " ";
            setClass = "plus";
        } else if (val < 0) {
            valString = Math.abs(val).toString() + " ";
            setClass = "minus";
        } else {
            valString = val.toString() + " ";
            setClass = "zero";
        }

        $selRate.text(valString).append($vectorTag);
        $selRate.find("span").css("display", "inline-block").css("transform", rotate);
        $selRate.addClass(setClass);
    }

    function insertNoteMessage($note, dataAverageJson, referenceAverageJson) {

        var messageList = [

            { "itemJson": "stemElongation", "itemName": "茎の伸び", "connect": "が", "changePlus": "大きい", "changeMinus": "小さい", "messageLast": "です。" },
            { "itemJson": "stemDiameter", "itemName": "茎の太さ", "connect": "が", "changePlus": "太く", "changeMinus": "細く", "messageLast": "なりました。" },
            { "itemJson": "averageSectionLength", "itemName": "平均節間長", "connect": "は", "changePlus": "長く", "changeMinus": "短く", "messageLast": "なりました。" },
            { "itemJson": "numberLeaves", "itemName": "葉数", "connect": "が", "changePlus": "増大", "changeMinus": "減少", "messageLast": "しました。" },
            { "itemJson": "middleLeafArea", "itemName": "中位葉", "connect": "が", "changePlus": "大きく", "changeMinus": "小さく", "messageLast": "なり、" },
            { "itemJson": "bottomLeafArea", "itemName": "下位葉", "connect": "は", "changePlus": "大きく", "changeMinus": "小さく", "messageLast": "なっています。" },
            { "itemJson": "top50LeafArea", "itemName": "Top50cmの葉面積", "connect": "が", "changePlus": "大きく", "changeMinus": "小さく", "messageLast": "なり、" },
            { "itemJson": "overallLeafArea", "itemName": "個体全体の葉面積", "connect": "は", "changePlus": "大きく", "changeMinus": "小さく", "messageLast": "なっています。" },
            { "itemJson": "lai", "itemName": "積算LAI", "connect": "は", "changePlus": "大きく", "changeMinus": "小さく", "messageLast": "なっています。" },
        ];
        var note = "";

        // 両方無い場合表示しない
        if ($.isEmptyObject(dataAverageJson) || $.isEmptyObject(referenceAverageJson)) {

            $note.html(note);
            return;
        }

        for (var i = 0; i < messageList.length; i++) {

            // 項目追加
            var oneNnote = messageList[i]["itemName"];

            var errorRateMessage = "";
            var errorRate = calculationErrorRate(dataAverageJson[messageList[i]["itemJson"]].average(), referenceAverageJson[messageList[i]["itemJson"]].average());

            if (Math.abs(errorRate) >= 11) {
//                oneNnote += "に<font color=\"red\">変化はありません</font>。";
//            } else {

                // 接続語追加
                oneNnote += messageList[i]["connect"];

                // 誤差率によるコメント追加
                if (Math.abs(errorRate) < 21) {
                    oneNnote += "わずかに";
                } else if (Math.abs(errorRate) < 31) {
                    oneNnote += "かなり";
                } else {
                    oneNnote += "非常に";
                }

                // 変化追加
                if(errorRate < 0) {
                    oneNnote += messageList[i]["changeMinus"];
                } else {
                    oneNnote += messageList[i]["changePlus"];
                }

                // 最後のメッセージを追加
                oneNnote += messageList[i]["messageLast"];

                note += oneNnote;
            }
        }

        // 最後が"、"の場合変更する
        if (note.slice(-1) == "、") {
            note = note.substr(0, note.length - 3) + "なっています。";
        }
        
        $note.html(note);
    }

    function insertComment($comment, options) {
        
        var date = options["commentDate"].split("/");

        var $dl = $("<dl class=\"comment_list\">").appendTo($comment);
        var $dt = $("<dt class=\"comment_date\"></dt>").appendTo($dl);

        var $span = $("<span class=\"date\"></span>");
        $span.text(date[0] + "年" + date[1] + "月" + date[2] + "日");

        if (options["url"]) {

            $a = $("<a>").appendTo($dt);
            $a.attr("href", options["url"]);

            $a.append($span);
        } else {

            $dt.append($span);
        }

        if(options["newFlag"]) {
            $dt.append("<span class=\"label label-danger\">NEW</span>");
        }
        
        var $dd = $("<dd class=\"comment_content\"></dd>").appendTo($dl);

        $dd.text(options["commentText"]);
    }

})(jQuery);