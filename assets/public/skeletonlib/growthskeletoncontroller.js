

(function ($) {

    // ページ読み込み時の処理
    $(function () {

        // cookieをJSONとして扱う
        $.cookie.json = true;

        var accordionState = $.cookie("accordionState");

        // cookieが無い場合、空のハッシュを設定
        if (!accordionState) {
            accordionState = {};
        }

        $(".accordion_box").each(function (index, row) {

            var openFlag = true;

            if ("accordion_box" + index in accordionState) {
                if (accordionState["accordion_box" + index] == "close") {
                    openFlag = false;
                }
            }

            $(this).toggle(openFlag);
            $(this).parent().find(".SlideButton[data-button='close']").toggle(openFlag);
            $(this).parent().find(".SlideButton[data-button='open']").toggle(!openFlag);


            $(this).parent().find(".SlideButton").click(function () {

                // 開閉処理
                $(this).parent().find(".accordion_box").slideToggle();
                $(this).parent().find(".SlideButton").toggle();

                // 開閉状態を連想配列へ反映
                if ($(this).parent().find(".SlideButton[data-button='open']").is(":visible")) {
                    accordionState["accordion_box" + index] = "close";
                } else {
                    delete accordionState["accordion_box" + index];
                }

                // cookie処理
                if (Object.keys(accordionState).length) {
                    $.cookie("accordionState", accordionState, { path: "/", domain: ".plantdata.net" });
                } else {
                    $.removeCookie("accordionState", { path: "/", domain: ".plantdata.net" });
                }

            });

        });

    });

})(jQuery);


// 生育スケルトンクラス

// コンストラクタ
function GrowthSkeletonController(options) {

    this.apiUrl = ""
    this.baseFile = "";
    this.commentFile = "comment.json.js";
    this.commentLinkFile = "index.html";
    this.histories = [];

    // コンストラクタのみ有効
    this.setInstanceValiable(options, "baseFile");
    this.setInstanceValiable(options, "commentFile");
    this.setInstanceValiable(options, "commentLinkFile");
    this.setInstanceValiable(options, "histories");
    this.setInstanceValiable(options, "apiUrl");

    this.defaultOptions = $.extend(true, {
        "configFile": "config.json.js",
        "config": {},
//        "baseFile": "",
        "size": { "width": 300, "height": 350 },
        "title": "",
        "titleAppend": "",
        "data": [],
        "dataJson": [],
        "overlay": [],
        "overlayJson": [],

        // for debug
        "canvasSave": false
    }, options);
    this.optionsList = [];
    this.jsonSchema = {
        "dataJson": {},
        "config": {},
        "comment": {}
    };
    this.baseData = [];
};
GrowthSkeletonController.prototype = {

    // オプション設定
    set: function (selector, options) {

        this.optionsList.push($.extend(true, $.extend(true, { "selector": selector }, this.defaultOptions), options));
    },
    // 描画
    draw_old: function () {

        // 読み込みキャッシュの無効化
        $.ajaxSetup({
            cache: false,
            beforeSend: function(jqXHR, settings) {
                jqXHR.url = settings.url;
            }
        });

        // JSON Schemaの読み出し
        this.loadJsonSchema();
    },
    draw: function (selector, options) {

        var thisInstance = this;

        marge_option = $.extend(true, $.extend(true, { "selector": selector }, this.defaultOptions), options);

        $.ajaxSetup({async: false});//同期通信(json取ってくるまで待つ)
        $.getJSON(marge_option.configFile, function(data){
            marge_option.config = data;
        });
//        $.ajaxSetup({async: true});

        api_url = thisInstance.apiUrl + "/" + marge_option.data.join(",") + "?scope=skeleton." + marge_option.skeleton_id + ".read";

        oidc.GetApiJson(api_url, function(data_json){

            $.each(data_json["result"], function(i, val) {

                var parseData = JSON.parse(val["assay_data"]);

                thisInstance.inquiryItemsArray2Hash(parseData, val);

                Array.prototype.push.apply(marge_option.dataJson, parseData["assay_array"]);
            });
            
            // overlay
            if(marge_option.overlay.length > 0) {

                overlay_url = thisInstance.apiUrl + "/" + marge_option.overlay.join(",") + "?scope=skeleton." + marge_option.skeleton + ".read";

                oidc.GetApiJson(api_url, function(overlay_json){

                    $.each(overlay_json["result"], function(i, val) {

                        var parseData = JSON.parse(val["assay_data"]);

                        thisInstance.inquiryItemsArray2Hash(parseData, val);

                        Array.prototype.push.apply(marge_option.overlayJson, parseData["assay_array"]);
                    });

                    thisInstance.loadJsonComplete(marge_option);
                });
            } else {

                thisInstance.loadJsonComplete(marge_option);
            }

            thisInstance.setToolTip(selector);


        });
    },
    // オプションをインスタンス変数化
    setInstanceValiable: function(options, key) {

        if (key in options) {

            this[key] = options[key];
            delete options[key];
        }
    },
    // schemaを読み込む
    loadJsonSchema: function() {

        var jsonSchema = this.jsonSchema;
        var thisInstance = this;

        $.when(this.ajaxJsonpFunction("/skeletonlib/schema/dataSchema.min.js", "growthDataArraySchemaJson"),
               this.ajaxJsonpFunction("/skeletonlib/schema/configSchema.min.js", "configSchemaJson"),
               this.ajaxJsonpFunction("/skeletonlib/schema/commentSchema.min.js", "commentSchemaJson"))
            .done(function (dataSchema, configSchema, commentSchema) {

                jsonSchema.dataJson = dataSchema[2].responseJSON;
                jsonSchema.config = configSchema[2].responseJSON;
                jsonSchema.comment = commentSchema[2].responseJSON;

                // dataを同期読み出し
                thisInstance.loadJsonpData(0, 0);

                // コメントを読み出し
                thisInstance.loadJsonpComment(0);
            })
        .fail(function (jqXHR, statusText, errorThrown) {

            var $error = $("<div class=\"error_msg\">").appendTo("#error_area");
            $error.html(jqXHR.url + " ファイルを開けませんでした。<br />" + statusText);
        });

        return;
    },
    ajaxJsonpFunction: function(url, callback) {

        return $.ajax({
            type: 'GET',
            url: url,
            dataType: 'jsonp',
            jsonpCallback: callback,
        });
    },
    // 読み込み
    loadJsonpData: function (optionsIndex, dataIndex) {

        var jsonPath = this.loadDataName(optionsIndex, dataIndex);
        var thisInstance = this;

        if (Object.keys(jsonPath).length == 0) {

            // 描画処理の開始
            this.loadJsonComplete(this.optionsList[optionsIndex]);

            // オプションを進める
            optionsIndex++;
            dataIndex = 0;

            // 再取得
            jsonPath = this.loadDataName(optionsIndex, dataIndex);

            if (Object.keys(jsonPath).length == 0) {

                // 基本データを設定
                this.setBaseData();

                // tooltipを紐付け
                this.setToolTip();
                return;
            }
        }

        $.ajax({
            type: 'GET',
            url: jsonPath["path"],
            dataType: 'jsonp',
            jsonpCallback: jsonPath["callback"],

        })
        .done(function (json) {

            // JSONの保持
            if (thisInstance.setJsonData(json, jsonPath["path"], optionsIndex, dataIndex, thisInstance.jsonSchema)) {

                // 再起呼び出し
                thisInstance.loadJsonpData(optionsIndex, dataIndex + 1);
            }
        })
        .fail(function (jqXHR, statusText, errorThrown) {

            var $error = $("<div class=\"error_msg\">").appendTo("#error_area");
            $error.html(jqXHR.url + " ファイルを開けませんでした。<br />" + statusText);
        });;
    },
    // 読み込み対象ファイル名
    loadDataName: function (optionsIndex, dataIndex) {

        var jsonPath = {};

        if (this.optionsList.length > optionsIndex) {
            if (this.optionsList[optionsIndex].data.length > dataIndex) {

                jsonPath["path"] = this.optionsList[optionsIndex].data[dataIndex];
                jsonPath["callback"] = "dataJson";
            } else if (this.optionsList[optionsIndex].overlay.length > (dataIndex - this.optionsList[optionsIndex].data.length)) {

                jsonPath["path"] = this.optionsList[optionsIndex].overlay[(dataIndex - this.optionsList[optionsIndex].data.length)];
                jsonPath["callback"] = "dataJson";
            } else if (this.optionsList[optionsIndex].data.length + this.optionsList[optionsIndex].overlay.length == dataIndex) {

                jsonPath["path"] = this.optionsList[optionsIndex].configFile;
                jsonPath["callback"] = "configJson";
            }
        }

        return jsonPath;
    },
    // 読み込んだJSONの保存
    setJsonData: function (json, jsonName, optionsIndex, dataIndex, jsonSchema) {

        var ret = false;

        if (this.optionsList[optionsIndex].data.length > dataIndex) {

            if (this.validateJson(jsonName, json, jsonSchema.dataJson)) {

                Array.prototype.push.apply(this.optionsList[optionsIndex].dataJson, json.inquiryItems);
                this.baseFileJuge(jsonName, json);
                ret = true;
            }
        } else if (this.optionsList[optionsIndex].overlay.length > (dataIndex - this.optionsList[optionsIndex].data.length)) {

            if (this.validateJson(jsonName, json, jsonSchema.dataJson)) {

                Array.prototype.push.apply(this.optionsList[optionsIndex].overlayJson, json.inquiryItems);
                this.baseFileJuge(jsonName, json);
                ret = true;
            }
        } else if (this.optionsList[optionsIndex].data.length + this.optionsList[optionsIndex].overlay.length == dataIndex) {

            if (this.validateJson(jsonName, json, jsonSchema.config)) {

                var colorDefault = $.extend(true, {
                    "config": {
                        "drawColor": {
                            "skeleton": {
                                "base": "rgb(0, 100, 0)",
                                "baseOver": "rgb(230, 82, 38)",
                                "baseUnder": "rgb(128, 0, 128)",
                                "elongation": "rgb(255, 165, 0)",
                                "warningOver": "rgb(255, 0, 0)",
                                "warningUnder": "rgb(0, 0, 255)"
                            },
                            "overlay": {
                                "base": "rgba(165, 165, 165, 0.6)",
                                "elongation": "rgba(165, 165, 165, 0.6)"
                            }
                        }
                    }
                }, json);

                this.optionsList[optionsIndex]["config"] = $.extend(true, colorDefault, this.optionsList[optionsIndex]["config"]);
                ret = true;
            }
        }

        return ret;
    },
    // ファイル名をbaseFileと比較
    baseFileJuge: function (jsonName, dataJson) {

        if (this.baseData && Object.keys(this.baseData).length) {
            return;
        }

        if (this.baseFile == jsonName) {

            this.inquiryItemsArray2Hash(dataJson.inquiryItems);

            this.baseData = dataJson.inquiryItems[0];
        }
    },
/*
    // 読み込んだDataJsonの配列を連想配列に変換する
    inquiryItemsArray2Hash: function(dataJson) {

        for (var i = 0; i < dataJson.length; i++) {

            var coeff = 1;

            // 21個目は単位（無い場合、mm）
            if (dataJson[i].length == 21) {

                if (dataJson[i][20] == "cm") {
                    coeff = 10;
                }
            }

            dataJson[i] = {
                "leafAreaCoefficient": dataJson[i][7],
                "stemElongation": dataJson[i][8] * coeff,
                "stemCircumference": dataJson[i][9] * coeff,
                "topDistance": dataJson[i][10] * coeff,
                "topNumberLeaves": dataJson[i][11],
                "numberLeaves": dataJson[i][12],
                "upperLeafArea": {
                    "verticalWidth": dataJson[i][13] * coeff,
                    "breadth": dataJson[i][14] * coeff
                },
                "mediumLeafArea": {
                    "verticalWidth": dataJson[i][15] * coeff,
                    "breadth": dataJson[i][16] * coeff

                },
                "lowerLeafArea": {
                    "verticalWidth": dataJson[i][17] * coeff,
                    "breadth": dataJson[i][18] * coeff
                },
                "growingCondition": dataJson[i][19],

                "dataId": dataJson[i][0],
                "plantingDate":  dataJson[i][2],
                "measurementDate":  dataJson[i][4],
                "cultivationDensity":  dataJson[i][3],
            };
        }
    },
*/
    inquiryItemsArray2Hash: function(dataJson, baseJson) {

        for (var i = 0; i < dataJson["assay_array"].length; i++) {

            var coeff = 1;

            if("number_unit" in dataJson) {

                if (dataJson["number_unit"] == "cm") {
                    coeff = 10;
                }
            }

            dataJson["assay_array"][i] = {
                "leafAreaCoefficient": dataJson["coefficient"],
                "stemElongation": dataJson["assay_array"][i]["stemElongation"] * coeff,
                "stemCircumference": dataJson["assay_array"][i]["stemCircumference"] * coeff,
                "topDistance": dataJson["assay_array"][i]["topDistance"] * coeff,
                "topNumberLeaves": parseInt(dataJson["assay_array"][i]["topNumberLeaves"]),
                "numberLeaves": parseInt(dataJson["assay_array"][i]["numberLeaves"]),
                "upperLeafArea": {
                    "verticalWidth": dataJson["assay_array"][i]["upperLeafArea_verticalWidth"] * coeff,
                    "breadth": dataJson["assay_array"][i]["upperLeafArea_breadth"] * coeff
                },
                "mediumLeafArea": {
                    "verticalWidth": dataJson["assay_array"][i]["mediumLeafArea_verticalWidth"] * coeff,
                    "breadth": dataJson["assay_array"][i]["mediumLeafArea_breadth"] * coeff

                },
                "lowerLeafArea": {
                    "verticalWidth": dataJson["assay_array"][i]["lowerLeafArea_verticalWidth"] * coeff,
                    "breadth": dataJson["assay_array"][i]["lowerLeafArea_breadth"] * coeff
                },
                "growingCondition": dataJson["assay_array"][i]["growingCondition"],

                "dataId": "",
                "plantingDate":  "",//dataJson[i][2],
                "measurementDate":  baseJson["assay_date"],
                "cultivationDensity":  dataJson["assay_time"],
            };
        }
    },
    // 読み込みJSONのvalidation
    validateJson: function(jsonName, json, schema) {

        var validate = jsen(schema);
        var valid = validate(json);

        if (valid) {
            return true;
        } else {

            var $error = $("<div class=\"error_msg\">").appendTo("#error_area");
            $error.html(jsonName + "の内容が正しくありません。<br />");

            $.each(validate.errors, function (index, val) {
                $error.append("path : " + val.path + "　　keyword : " + val.keyword + "<br />");
            });

            return false;
        }
    },
    // 内部処理はミリ単位
    configJsonUnitConversion: function (configJson) {

        // 茎周を直径に変換
        configJson["stemDiameter"]["valueStandard"] *= 10 / Math.PI;
        configJson["topLeaf"]["valueStandard"] *= 100;
        configJson["middleLeaf"]["valueStandard"] *= 100;
        configJson["bottomLeaf"]["valueStandard"] *= 100;
    },
    // Jsonロード完了後処理
    loadJsonComplete: function (option) {

        // 配列を連想配列へ変換
//        this.inquiryItemsArray2Hash(option.dataJson);
//        this.inquiryItemsArray2Hash(option.overlayJson);

        // 計算メソッドを追加
        this.inquiryItemsAddMethod(option.dataJson);
        this.inquiryItemsAddMethod(option.overlayJson);

        // configJsonの値をミリ単位へ
        this.configJsonUnitConversion(option.config)

        var title = this.titleSeach(option);

        // 必要なタグを生成
        this.addBaseHtml(option, option.selector, title);

        // データが無い場合無視する
        if (option.dataJson.length > 0) {

            var overlayJson = option.overlayJson.length == 0 ? {} : option.overlayJson["Overall"];

            option.selector.find("canvas").growthSkeletonDraw({ dataJson: option.dataJson["Overall"], config: option.config });
        }
        // データが無い場合無視する
        if (option.overlayJson.length > 0) {
            // 重ね合わせ
            option.selector.find("canvas").growthSkeletonOverlay({ dataJson: option.overlayJson["Overall"], config: option.config });
        }

        // キャプションを設定
        option.selector.find("figcaption").text(title);

        // 表へ値を設定
        var tableInfo = option.selector.find(".growth-table-area");

        option.selector.find(".growth-table-area").growthSkeletonTable({ dataAverageJson: option.dataJson["Overall"], referenceAverageJson: option.overlayJson["Overall"] });

        // noteを追加
        option.selector.find(".growth-note-area p").growthSkeletonNote({ dataAverageJson: option.dataJson["Overall"], referenceAverageJson: option.overlayJson["Overall"] });
    },
    // 指定位置へ必要なタグを追加
    addBaseHtml: function (option, $addArea, title) {

        var sizeString = "width=\"" + option.size.width + "\" height=\"" + option.size.height + "\"";

        var $div = $addArea.find(".growth-draw-area");

        if ($div.length == 0) {
            $div = $("<div class=\"growth-draw-area\">").appendTo($addArea);
        }

        $figure = $("<figure class=\"SkeletonCanvasMap\">").appendTo($div);
        $figure.append("<canvas " + sizeString + "></canvas>");
        $figure.append("<img src=\"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVQImWP4//8/AAX+Av5Y8msOAAAAAElFTkSuQmCC\" " + sizeString + " class=\"mapImageLayer\" />");

        $map = $("<map>").appendTo($figure);
        $map.append("<area data-tooltiptitle=\"茎伸長量(cm/week)\" data-info=\"stemElongation\" data-unit=\"cm\" nohref />");
        $map.append("<area data-tooltiptitle=\"直径(cm)\" data-info=\"stemDiameter\" data-unit=\"cm\" nohref />");
        $map.append("<area data-tooltiptitle=\"上位葉の大きさ(m<sup>2</sup>)\" data-info=\"topLeafArea\" data-unit=\"m2\" nohref />");
        $map.append("<area data-tooltiptitle=\"中位葉の大きさ(m<sup>2</sup>)\" data-info=\"middleLeafArea\" data-unit=\"m2\" nohref />");
        $map.append("<area data-tooltiptitle=\"下位葉の大きさ(m<sup>2</sup>)\" data-info=\"bottomLeafArea\" data-unit=\"m2\" nohref />");

        // titleが設定されていない場合、タグを生成しない
        if (title != null) {

            var $saveButton = $("<figcaption class=\"canvassave\">").appendTo($figure);

            // 保存機能を設定
            if (option.canvasSave) {
                this.setSaveButton($saveButton, option, title);
            }
        }

    },
    // dataJsonへ計算式を追加
    inquiryItemsAddMethod: function (inquiryItems) {

        // 個別計算クラス
        function IndividualCalculationClass(inquiryItem) {

            this.inquiryItem = inquiryItem;
        };
        IndividualCalculationClass.prototype = {

            // 直径の算出
            stemDiameter: function () {

                return Math.round((this.inquiryItem["stemCircumference"] / Math.PI));
            },
            // 平均節間隔
            averageSectionLength: function () {

                return 500 / this.inquiryItem["topNumberLeaves"];
            },
            // 上葉面積
            topLeafArea: function () {

                return (this.inquiryItem["upperLeafArea"]["verticalWidth"] *
                    this.inquiryItem["upperLeafArea"]["breadth"]);
            },
            // 中葉面積
            middleLeafArea: function () {

                return (this.inquiryItem["mediumLeafArea"]["verticalWidth"] *
                    this.inquiryItem["mediumLeafArea"]["breadth"]);
            },
            // 下葉面積
            bottomLeafArea: function () {

                return (this.inquiryItem["lowerLeafArea"]["verticalWidth"] *
                    this.inquiryItem["lowerLeafArea"]["breadth"]);
            },
            // Top50以下の葉数
            underNumberLeaves: function () {

                return this.inquiryItem["numberLeaves"] - this.inquiryItem["topNumberLeaves"];
            },
            // Top50の葉面積
            top50LeafArea: function () {

                return (((this.topLeafArea() + this.bottomLeafArea() + this.middleLeafArea()) * this.inquiryItem["topNumberLeaves"]) / 3) * this.inquiryItem["leafAreaCoefficient"];
            },
            // 全体の葉面積
            overallLeafArea: function () {

                return this.top50LeafArea() + (this.bottomLeafArea() * this.underNumberLeaves() * this.inquiryItem["leafAreaCoefficient"]);
            },
            // Leaf Area Index
            lai: function () {

                return this.overallLeafArea() * 2.5;
            },
            // 新規果房生成速度
            newBunchSpeed: function () {

                return (this.inquiryItem["stemElongation"] / 50) * (this.inquiryItem["topNumberLeaves"] / 3);
            }
        }


        // 平均値算出用クラス
        function OverallCalculationClass(key, inquiryItems) {

            this.HashKey = key;
            this.inquiryItems = inquiryItems;
        };
        OverallCalculationClass.prototype = {

            // 合計値
            sum: function () {
                var sumValue = 0;

                for (var i = 0; i < this.inquiryItems.length; i++) {

                    if (typeof inquiryItems[i][this.HashKey] == "number") {
                        sumValue += this.inquiryItems[i][this.HashKey];
                    } else if (typeof inquiryItems[i]["IndividualCalculation"][this.HashKey] == "function") {
                        sumValue += this.inquiryItems[i]["IndividualCalculation"][this.HashKey]();
                    }
                };

                return (sumValue);
            },
            // 平均値
            average: function () {

                return this.sum() / this.validLength();
            },
            // 有効な値の個数
            validLength: function(){
                var valid = 0;

                for (var i = 0; i < this.inquiryItems.length; i++) {
                    if (typeof inquiryItems[i][this.HashKey] == "number") {

                        if (inquiryItems[i][this.HashKey]) {
                            valid++;
                        }
                    } else if (typeof inquiryItems[i]["IndividualCalculation"][this.HashKey] == "function") {
                        if (inquiryItems[i]["IndividualCalculation"][this.HashKey]()) {
                            valid++;
                        }
                    }
                };

                return valid;
            }
        }

        for (var i = 0; i < inquiryItems.length; i++) {

            inquiryItems[i]["IndividualCalculation"] = new IndividualCalculationClass(inquiryItems[i]);
        }

        inquiryItems["Overall"] = {};
        for (key in inquiryItems[0]) {

            if (typeof inquiryItems[0][key] == "number") {

                inquiryItems["Overall"][key] = new OverallCalculationClass(key, inquiryItems);
            } else if (inquiryItems[0][key] instanceof IndividualCalculationClass) {

                for (key2 in inquiryItems[0][key]) {

                    if (typeof inquiryItems[0][key][key2] == "function") {
                        inquiryItems["Overall"][key2] = new OverallCalculationClass(key2, inquiryItems);
                    }
                }
            }

        }
    },
    // titleを決定
    titleSeach: function (option) {

        var title = option.title;

        if (!title && title != null) {
            // titleが設定されていないときjsonから取得
            if (option.dataJson && option.dataJson.length) {

                title = option.dataJson[0].measurementDate;

            } else if (option.overlayJson && option.overlayJson.length) {

                title = option.overlayJson[0].measurementDate;
            }
        }

        if (option.titleAppend) {

            if (title) {
                title += " " + option.titleAppend;
            } else {
                title = option.titleAppend;
            }
        }

        return title;
    },
    // ToolTipを設定
    setToolTip: function (selector) {

        var calculationUnit = this.calculationUnit;

        // 描画完了後、tooltipを設定
        selector.find("area").each(function () {
            $(this).qtip({ //
                content: {
                    text: function (event, api) {
                        var cu = calculationUnit($(this).data("tooltipvalue"), $(this));
                        return cu.val + " " + cu.unit;
                    },
                    title: $(this).data("tooltiptitle")
                },
                position: {
                    my: "bottom left",
                    at: "top center",
                },
                style: {
                    classes: "qtip-green qtip-shadow qtip-rounded",
                    tip: {
                        corner: true
                    }
                }
            });
        });
    },
    // セーブ機能の有効化
    setSaveButton: function ($saveButton, option) {

        // 保存ファイル名
        var fileName = "";

        if (option.titleAppend) {
            fileName = option.titleAppend + "_";
        }

        if (option.title) {
            fileName += option.title;
        } else {
            if (option.dataJson && option.dataJson.length) {
                fileName += option.dataJson[0]["dataId"] + "_" + option.dataJson[0]["measurementDate"].replace(/\//g, "");
            } else if (option.overlayJson && option.overlayJson.length) {
                fileName += option.overlayJson[0]["dataId"] + "_" + option.overlayJson[0]["measurementDate"].replace(/\//g, "");
            }
        }

        fileName += ".png";

            // 保存機能の有効か
        $saveButton.on("click", function () {

            var base64Data = $(this).parent().find("canvas")[0].toDataURL();
            var blob = (function (_base64) {
                var i;
                var tmp = _base64.split(',');
                var data = atob(tmp[1]);
                var mime = tmp[0].split(':')[1].split(';')[0];

                var arr = new Uint8Array(data.length);
                for (i = 0; i < data.length; i++) { arr[i] = data.charCodeAt(i); }
                var blob = new Blob([arr], { type: mime });
                return blob;
            }(base64Data));
            (function (_blob, _file) {
                if (typeof window.navigator.msSaveBlob == "function") {	// IEの場合
                    window.navigator.msSaveBlob(_blob, _file);
                }
                else {
                    var url = (window.URL || window.webkitURL);
                    var data = url.createObjectURL(_blob);
                    var e = document.createEvent("MouseEvents");
                    e.initMouseEvent("click", true, false, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
                    var a = document.createElementNS("http://www.w3.org/1999/xhtml", "a");
                    a.href = data;
                    a.download = _file;
                    a.dispatchEvent(e);
                }
            }(blob, fileName));

        });
    },
    // 表示単位修正
    calculationUnit: function (mm, $row) {

        var unit = $row.data("unit");
        var ret = { "val": 0, "unit": unit };

        if (unit == "cm") {
            ret.val = Math.round(mm * 10) / 100;
        } else if (unit == "m2") {
            ret.val = Math.round(mm / 100 / 100) / 100;
            ret.unit = "m<sup>2</sup>";
        } else {
            ret.val = Math.round(mm * 100) / 100;
        }
        return ret;
    },
    // 基本データ設定
    setBaseData: function() {

        // 基本データを取得

        if (this.baseData && Object.keys(this.baseData).length) {
            this.insertBaseData(this.baseData);
        } else {
            this.loadBaseData(this.baseFile);
        }
    },
    // 基本データの読み込み
    loadBaseData: function (baseFile) {

        var thisInstance = this;

        $.ajax({
            type: 'GET',
            url: baseFile,
            dataType: 'jsonp',
            jsonpCallback: "dataJson",

        })
        .done(function (json) {

            // JSONの検査
            if (thisInstance.validateJson(baseFile, json, thisInstance.jsonSchema.dataJson)) {

                thisInstance.inquiryItemsArray2Hash(json.inquiryItems);
                thisInstance.insertBaseData(json.inquiryItems[0]);
            }
        })
        .fail(function (jqXHR, statusText, errorThrown) {

            var $error = $("<div class=\"error_msg\">").appendTo("#error_area");
            $error.html(jqXHR.url + " ファイルを開けませんでした。<br />" + statusText);
        });;
    },
    // 基本データを設定
    insertBaseData: function (baseData) {

        //
        if (baseData || Object.keys(this.baseData).length) {

            var plantDate = baseData["plantingDate"].split("/");
            var measurDate = baseData["measurementDate"].split("/");

            $(".planting_date").text("定植日：" + plantDate[0] + "年" + plantDate[1] + "月" + plantDate[2] + "日");
            $(".cultivation_density").html("栽植密度：" + baseData["cultivationDensity"].toFixed(1) + "株/m<sup>2</sup>");
            $(".measurement_date").text("計測日：" + measurDate[0] + "年" + measurDate[1] + "月" + measurDate[2] + "日");
        }

    },
    // コメント読み込み
    loadJsonpComment: function (commentIndex) {

        var jsonPath = this.commentFile;
        var thisInstance = this;

        if (this.histories.length < commentIndex) {

            // end
            return;
        }

        if (commentIndex) {

            // 過去のディレクトリのコメントを設定
            jsonPath = this.histories[commentIndex - 1] + (this.histories[commentIndex - 1].slice(-1) == "/" ? "" : "/") + this.commentFile;
        }


        $.ajax({
            type: 'GET',
            url: jsonPath,
            dataType: 'jsonp',
            jsonpCallback: "commentJson",

        })
        .done(function (json) {

            // JSONの検査
            if (thisInstance.validateJson(jsonPath, json, thisInstance.jsonSchema.comment)) {


                thisInstance.addCommentHtml(json, commentIndex, thisInstance.histories[commentIndex - 1]);

                // 再起呼び出し
                thisInstance.loadJsonpComment(commentIndex + 1);
            }
        })
        .fail(function (jqXHR, statusText, errorThrown) {

            var $error = $("<div class=\"error_msg\">").appendTo("#error_area");
            $error.html(jqXHR.url + " ファイルを開けませんでした。<br />" + statusText);
        });;
    },
    // コメントを追加
    addCommentHtml: function (json, commentIndex, url) {

        var $commentArea = $("#new_comment_area");

        if (commentIndex) {

            $commentArea = $("#old_comment_area");
            $commentArea = $("<div class=\"comment\">").appendTo($commentArea);

            json["url"] = url + (url.slice(-1) == "/" ? "" : "/") + this.commentLinkFile;
        } else {

            json["newFlag"] = true;
        }

        $commentArea.growthSkeletonComment(json);
    }

}
