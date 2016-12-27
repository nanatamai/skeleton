// 生育スケルトン描画プラグイン

(function ($) {

    var CANVAS_HEIGHTCENTI = 500;    // 描画高さ（mm）
    var CANVAS_LEAFOFFSET = 30;      // 葉オフセット（mm）
    var CANVAS_LEAFHEIGHT = 20;      // 葉描画高さ（mm）

    // 生育スケルトン描画
    $.fn.growthSkeletonDraw = function (options) {

        // 描画Picelを算出
        var drawPicel = calculationPixcel($(this), options.dataJson, options.config);

        differenceColor(drawPicel, options.config.drawColor.skeleton);

        return this.each(function () {

            var $map = createImageMapTag($(this));
            // tooltipへ値を書き出し
            setTooltipValue($map, options.dataJson);

            growthDrawProcess($(this), $map, drawPicel, options.config.drawColor.skeleton, false);
        });
    }

    // 生育スケルトン重ね合わせ
    $.fn.growthSkeletonOverlay = function (options) {

        // 描画Picelを算出
        var drawPicel = calculationPixcel($(this), options.dataJson, options.config);

        differenceOverlayColor(drawPicel, options.config.drawColor.overlay);

        return this.each(function () {

            growthDrawProcess($(this), null, drawPicel, options.config.drawColor.overlay, true);
        });
    }

    // イメージマップタグを生成
    function createImageMapTag($drawCanvas) {

        var mapNameBase = "canvasMap";
        var canvasLength = $("canvas").length;

        var $img = $drawCanvas.parent().find("img");
        var $map = $drawCanvas.parent().find("map");

        // map名を設定
        $img.attr("usemap", "#" + mapNameBase + canvasLength);
        $map.attr("name", mapNameBase + canvasLength);

        return $map;
    }

    // 
    function calculationPixcel($drawCanvas, dataAvgJson, highlightJson) {

        var drawPicel = {};

        drawPicel["canvasWidth"] = Math.round($drawCanvas[0].width);
        drawPicel["canvasHeight"] = Math.round($drawCanvas[0].height);
        drawPicel["refPoint"] = Math.round(drawPicel.canvasWidth * highlightJson.referencePoint);
        drawPicel["leafWidth"] = drawPicel.canvasWidth - drawPicel.refPoint;
        drawPicel["stemWidth"] = drawPicel.refPoint;

        // ①茎伸長の描画位置を算出
        if (dataAvgJson["stemElongation"].average()) {
            drawPicel["elongation"] = Math.round((drawPicel.canvasHeight / CANVAS_HEIGHTCENTI) * dataAvgJson["stemElongation"].average());
        } else {
            drawPicel["elongation"] = 0;
        }
        // ②茎径の算出
        drawPicel["stemDiameter"] = DeplictionVariablePicel(dataAvgJson["stemDiameter"].average(), drawPicel.stemWidth, highlightJson["stemDiameter"]);
        drawPicel["diameterX"] = Math.round((drawPicel.stemWidth * (highlightJson["stemDiameter"]["drawBase"])) - drawPicel.stemDiameter.pixcel);
        // ⑥上位葉算出
        drawPicel["topLeafWidth"] = DeplictionVariableLeafWidthPicel(dataAvgJson["topLeafArea"].average(), drawPicel.leafWidth, drawPicel.refPoint, highlightJson["topLeaf"])
        // ⑥中位葉算出
        drawPicel["middLeafWidth"] = DeplictionVariableLeafWidthPicel(dataAvgJson["middleLeafArea"].average(), drawPicel.leafWidth, drawPicel.refPoint, highlightJson["middleLeaf"])
        // ⑥下位葉算出
        drawPicel["bottomLeafWidth"] = DeplictionVariableLeafWidthPicel(dataAvgJson["bottomLeafArea"].average(), drawPicel.leafWidth, drawPicel.refPoint, highlightJson["bottomLeaf"])

        // 葉間関係
        drawPicel["leafNum"] = Math.round(dataAvgJson["topNumberLeaves"].average());
        drawPicel["leafOffset"] = Math.round((drawPicel.canvasHeight / CANVAS_HEIGHTCENTI) * CANVAS_LEAFOFFSET);
        drawPicel["leafInterval"] = (drawPicel.canvasHeight - drawPicel.leafOffset - drawPicel.leafOffset -
                                        ((drawPicel.canvasHeight / CANVAS_HEIGHTCENTI) * CANVAS_LEAFHEIGHT)) / (drawPicel.leafNum - 1);

        return drawPicel;
    }

    function differenceColor(drawPicel, colorSet) {

        var diffSet = [
            "stemDiameter",
            "topLeafWidth",
            "middLeafWidth",
            "bottomLeafWidth",
        ];

        for (var i = 0; i < diffSet.length; i++) {

            if (drawPicel[diffSet[i]]["limitFlag"]) {

                if (drawPicel[diffSet[i]]["raw"] > 0) {
                    drawPicel[diffSet[i]]["color"] = colorSet.baseOver;
                } else if (drawPicel[diffSet[i]]["raw"] < 0) {
                    drawPicel[diffSet[i]]["color"] = colorSet.baseUnder;
                } else {
                    drawPicel[diffSet[i]]["color"] = colorSet.base;
                }
            } else {
                drawPicel[diffSet[i]]["color"] = colorSet.base;
            }

            if (drawPicel[diffSet[i]]["warningFlag"]) {

                if (drawPicel[diffSet[i]]["raw"] > 0) {
                    drawPicel[diffSet[i]]["strokeColor"] = colorSet.warningOver;
                } else if (drawPicel[diffSet[i]]["raw"] < 0) {
                    drawPicel[diffSet[i]]["strokeColor"] = colorSet.warningUnder;
                } else {
                    drawPicel[diffSet[i]]["strokeColor"] = colorSet.base;
                }
            } else {
                drawPicel[diffSet[i]]["strokeColor"] = colorSet.base;
            }
        }
    }

    function differenceOverlayColor(drawPicel, colorSet) {

        var diffSet = [
            "stemDiameter",
            "topLeafWidth",
            "middLeafWidth",
            "bottomLeafWidth",
        ];

        for (var i = 0; i < diffSet.length; i++) {

            drawPicel[diffSet[i]]["color"] = colorSet.base;
            drawPicel[diffSet[i]]["strokeColor"] = "rgba(0, 0, 0, 0)";
        }

        drawPicel["stemDiameter"]["strokeColor"] = colorSet.base;
    }

    // 描画処理
    function growthDrawProcess($drawCanvas, $map, drawPicel, colorSet, overrayFlag) {

        var baseHash = {
            groups: ['growthSkeleton'],
//            strokeStyle: colorSet.base,
        };

        if ($map) {

        }

        // 描画基準を左上に
        $.jCanvas.defaults.fromCenter = false;
        // レイヤーを使用
        $.jCanvas.defaults.layer = true;

        // canvasへの共通設定
        var diameterHash = $.extend({}, baseHash, {
            strokeWidth: (drawPicel.stemDiameter.limitFlag ? 2 : 0),
            x: drawPicel.diameterX,
            y: drawPicel.elongation,
            height: drawPicel.canvasHeight - drawPicel.elongation,
            width: drawPicel.refPoint - drawPicel.diameterX,
        })

        // top50の描画
        drawRectAndAddMapArea($drawCanvas, $map, $.extend({}, diameterHash, {
            fillStyle: colorSet.elongation,
            y: 0,
            height: drawPicel.elongation,
        }), "stemElongation");

        if (overrayFlag) {

            $drawCanvas.drawRect($.extend({}, diameterHash, {
                fillStyle: "rgba(0, 0, 0, 0)",
                // maskの関係で幅が小さく見えるため+1する
                width: drawPicel.refPoint + 0 - drawPicel.diameterX,
                mask: true
            })).drawRect($.extend({}, diameterHash, {
                strokeStyle: colorSet.base,
                strokeWidth: 4,
            })).restoreCanvas();

        } else {
            drawRectAndAddMapArea($drawCanvas, $map, $.extend({}, diameterHash, {
//            $drawCanvas.drawRect($.extend({}, diameterHash, {
                fillStyle: drawPicel.stemDiameter.color
            }), "stemDiameter");

            if (drawPicel.stemDiameter.warningFlag) {
                $drawCanvas.drawRect($.extend({}, diameterHash, {
                    fillStyle: "rgba(0, 0, 0, 0)",
                    // maskの関係で幅が小さく見えるため+1する
                    y: 0,
                    height: drawPicel.canvasHeight,
                    mask: true
                })).drawRect($.extend({}, diameterHash, {
                    strokeStyle: drawPicel.stemDiameter.strokeColor,
                    strokeWidth: 4,
                    y: 0,
                    height: drawPicel.canvasHeight
                })).restoreCanvas();
            }
        }

        var leafWidthHash = $.extend({}, baseHash, {
            x: drawPicel.refPoint,
            height: ((drawPicel.canvasHeight / CANVAS_HEIGHTCENTI) * CANVAS_LEAFHEIGHT),
        });

        // ⑥葉描画
        for (var i = 0; i < drawPicel.leafNum; i++) {

            if (i == 0) {
                // 上位葉
                drawRectAndAddMapArea($drawCanvas, $map, $.extend({}, leafWidthHash, {
                    fillStyle: drawPicel.topLeafWidth.color,
                    strokeWidth: (drawPicel.topLeafWidth.warningFlag ? 2 : 0),
                    strokeStyle: drawPicel.topLeafWidth.strokeColor,
                    y: drawPicel.leafOffset,
                    width: drawPicel.topLeafWidth.pixcel,
                 }), "topLeafArea");
            } else if (Math.round(drawPicel.leafNum / 2) > i + 1) {
                // 上位-中位葉
                $drawCanvas.drawRect($.extend({}, leafWidthHash, {
                    fillStyle: colorSet.base,
                    strokeWidth: 0,
                    y: drawPicel.leafOffset + Math.round(drawPicel.leafInterval * i),
                    width: drawPicel.topLeafWidth.pixcel + (((drawPicel.middLeafWidth.pixcel - drawPicel.topLeafWidth.pixcel) / (Math.round(drawPicel.leafNum / 2) - 1)) * i),
                }));
            } else if (Math.round(drawPicel.leafNum / 2) == i + 1) {
                // 中位葉
                drawRectAndAddMapArea($drawCanvas, $map, $.extend({}, leafWidthHash, {
                    fillStyle: drawPicel.middLeafWidth.color,
                    strokeWidth: (drawPicel.middLeafWidth.warningFlag ? 2 : 0),
                    strokeStyle: drawPicel.middLeafWidth.strokeColor,
                    y: drawPicel.leafOffset + Math.round(drawPicel.leafInterval * i),
                    width: drawPicel.middLeafWidth.pixcel,
                }), "middleLeafArea");
            } else if (drawPicel.leafNum == i + 1) {
                // 下位葉
                drawRectAndAddMapArea($drawCanvas, $map, $.extend({}, leafWidthHash, {
                    fillStyle: drawPicel.bottomLeafWidth.color,
                    strokeWidth: (drawPicel.bottomLeafWidth.warningFlag ? 2 : 0),
                    strokeStyle: drawPicel.bottomLeafWidth.strokeColor,
                    y: drawPicel.leafOffset + Math.round(drawPicel.leafInterval * i),
                    width: drawPicel.bottomLeafWidth.pixcel,
                }), "bottomLeafArea");
            } else {
                // 中位-下位葉
                $drawCanvas.drawRect($.extend({}, leafWidthHash, {
                    fillStyle: colorSet.base,
                    strokeWidth: 0,
                    y: drawPicel.leafOffset + Math.round(drawPicel.leafInterval * i),
                    width: drawPicel.middLeafWidth.pixcel + (((drawPicel.bottomLeafWidth.pixcel - drawPicel.middLeafWidth.pixcel) / (Math.round(drawPicel.leafNum / 2))) * (i + 1 - (Math.round(drawPicel.leafNum / 2)))),
                }));
            }
        }

        $drawCanvas.drawLayers();
    }

    function DeplictionVariablePicel(value, targetWidth, highlightJson) {

        var refToPixcel = 0;
        var limitFlag = false;
        var warningFlag = false;
        var refDiff = value - highlightJson["valueStandard"];
        var drawPlusLimit = value * highlightJson["alphaPlus"];
        var drawMinusLimit = value * highlightJson["alphaMinus"];
        var raw = refDiff;

        if (refDiff > 0) {

            // リミットを越えていた場合、最大値へ
            if (refDiff > drawPlusLimit) {
                refDiff = drawPlusLimit;
                limitFlag = true;
            }

            var drawArea = targetWidth * (highlightJson["drawMax"] - highlightJson["drawBase"]); // 描画ピクセル数

            refToPixcel = refDiff / drawPlusLimit * drawArea;     // 基準位置からの描画ピクセル数

            // 大きくなり気味アラーム
            var warn = targetWidth * (highlightJson["drawBase"] - highlightJson["overWarning"]);
            if (refToPixcel > warn) {
                warningFlag = true;
            }

        } else if (refDiff < 0) {

            // リミットを越えていた場合、最小値へ
            if (refDiff < (-drawMinusLimit)) {
                refDiff = -drawMinusLimit;
                limitFlag = true;
            }

            var drawArea = targetWidth * (highlightJson["drawBase"] - highlightJson["drawMin"]); // 描画ピクセル数

            refToPixcel = (refDiff / drawMinusLimit) * drawArea;     // 基準位置からの描画ピクセル数

            // 小さくなり気味アラーム
            var warn = targetWidth * (highlightJson["drawBase"] - highlightJson["underWarning"]);
            if (refToPixcel < -warn) {
                warningFlag = true;
            }
        }

        return { "pixcel": refToPixcel, "limitFlag": limitFlag, "raw": raw, "warningFlag": warningFlag };
    }

    function DeplictionVariableLeafWidthPicel(value, targetWidth, refPoint, highlightJson) {

        var leafDiff = DeplictionVariablePicel(value, targetWidth, highlightJson);

        leafDiff.pixcel = Math.round(leafDiff.pixcel + (targetWidth * highlightJson["drawBase"]));// + refPoint;

        return leafDiff;
    }

    // 四角形の描画とイメージマップエリアを追加
    function drawRectAndAddMapArea($drawCanvas, $map, rectHash, hashKey) {

        // 描画
        $drawCanvas.drawRect(rectHash);

        if ($map) {

            var $area = $($map.find("[data-info=\"" + hashKey + "\"]"));

            if ($($map.find("[data-info=\"" + hashKey + "\"]"))) {
                
                $area.attr("shape", "rect");
                $area.attr("coords", rectHash.x + "," + rectHash.y + "," + (rectHash.x + rectHash.width) + "," + (rectHash.y + rectHash.height));
            }
        }
    }

    // tooltip情報の作成
    function setTooltipValue($map, dataAvgJson) {

        var $areas = $map.find("area");

        $map.find("area").each(function () {

            var key = $(this).data("info");

            if (dataAvgJson[key]) {

                $(this).attr("data-tooltipvalue", dataAvgJson[key].average());
            }
        });
    }

})(jQuery);