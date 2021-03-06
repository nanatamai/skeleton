﻿

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

    this.apiUrl = "";
    this.apiReportUrl = "";
//    this.baseFile = "";

    // コンストラクタのみ有効
//    this.setInstanceValiable(options, "baseFile");
    this.setInstanceValiable(options, "apiUrl");
    this.setInstanceValiable(options, "apiReportUrl");

    this.defaultOptions = $.extend(true, {
        "configFile": "config.json",
        "config": null,
        "size": { "width": 300, "height": 350 },
        "title": "",
        "titleAppend": "",
        "baseFileFlag": false,
        "commentFlag": false,
        "comment": {
            commentText: "",
            commentDate: "",
            url: "",
        },
        "historieFlag": false,
        "skeleton_id": 0,
        "data": [],
        "dataJson": [],
        "date_move": [0],
        "overlay": [],
        "overlayJson": [],
        "overlay_date_move": [0],

        "useIdealFlag": false,
        "useSkeletonIdeal": false,
        "useOverlayIdeal": false,
        "group": false,

        // for debug
        "canvasSave": false,
        "toolTip": true,
    }, options);
    this.optionsList = [];
    this.jsonSchema = {
        "dataJson": {},
        "config": {},
        "comment": {}
    };
    this.baseData = [];
    this.ideal = [];
    this.idealJson = [];
};
GrowthSkeletonController.prototype = {

    // 
    setDefaultOption: function(options) {

        this.defaultOptions = $.extend(true, this.defaultOptions, options);
    },
    // 描画
    draw: function (selector, options) {

//        var thisInstance = this;

        marge_option = $.extend(true, $.extend(true, { "selector": selector }, this.defaultOptions), options);

        // コンフィグファイルロード済みか
        if(this.defaultOptions.configFile == marge_option.configFile) {

            if(this.defaultOptions.config) {

                marge_option.config = $.extend(true, {}, this.defaultOptions.config);

                this.loadJsonData(this, marge_option);
            } else {

                this.loadConfigData(marge_option);
            }
            
        } else {
            this.loadConfigData(marge_option);
        }
        
    },
    // configFileのロード
    loadConfigData: function(option) {

        $.ajax({
            url: option.configFile,
            dataType:'json',
            context: {controller: this, option: option},
        }).done(function(data) {

            this.option.config = data;

            this.controller.loadJsonData(this.controller, this.option);

         }).fail(function(data) {
//            alert('error!!!');
        });
    },
    //
    loadJsonData: function(controller, marge_option) {

        // 理想個体を使用するか
        var ideal_load = false;
        var api_url = "";
        if(marge_option.useSkeletonIdeal) {
            if(controller.ideal.length > 0) {
                api_url = controller.apiUrl + "/" + controller.ideal.join(",") + "/" + 0 + "?scope=skeleton." + marge_option.skeleton_id + ".read";
            } else {
                api_url = controller.apiUrl + "/" + marge_option.data.join(",") + "/" + marge_option.date_move.join(",") + "?scope=skeleton." + marge_option.skeleton_id + ".read";
                ideal_load = true;
            }
        } else {
            api_url = controller.apiUrl + "/" + marge_option.data.join(",") + "/" + marge_option.date_move.join(",") + "?scope=skeleton." + marge_option.skeleton_id + ".read";
        }
        
        

        oidc.GetApiJson(api_url, function(data_json, thisInst){

            var marge_option = thisInst.option;
            var thisInstance = thisInst.controller;
            var ideal_load2 = thisInst.ideal_load;

            for(val of data_json["result"]) {

                var parseData = JSON.parse(val["assay_data"]);

                // コメント用データ作成
                marge_option.comment.commentText = parseData["comment"];
                marge_option.comment.commentDate = val["assay_date"];
                marge_option.comment.url = location.pathname + "?skeleton_id=" + marge_option.skeleton_id + "&skeleton_data_id=" + val["id"];

                // 理想個体使用フラグ
                if(marge_option.useIdealFlag || ideal_load2) {
                    thisInstance.ideal = parseData["ideal_id"].split(",");
                }

                thisInstance.inquiryItemsArray2Hash(parseData, val);

                if(!ideal_load2) {
                    Array.prototype.push.apply(marge_option.dataJson, parseData["assay_array"]);
                }
            }
            
            // overlay
            if(marge_option.overlay.length > 0 || marge_option.useOverlayIdeal || ideal_load2) {

                var overlay_url = "";
                if(marge_option.useOverlayIdeal || ideal_load2) {
                    overlay_url = thisInstance.apiUrl + "/" + thisInstance.ideal.join(",") + "/" + 0 + "?scope=skeleton." + marge_option.skeleton_id + ".read";
                } else {
                    overlay_url = thisInstance.apiUrl + "/" + marge_option.overlay.join(",") + "/" + marge_option.overlay_date_move.join(",") + "?scope=skeleton." + marge_option.skeleton_id + ".read";
                }

                oidc.GetApiJson(overlay_url, function(overlay_json, thisInst2){

                    var marge_option = thisInst2.option;
                    var thisInstance2 = thisInst2.controller;
                    var ideal_load3 = thisInst2.ideal_load;

                    for(val of overlay_json["result"]) {

                        var parseData = JSON.parse(val["assay_data"]);

                        thisInstance2.inquiryItemsArray2Hash(parseData, val);

                        if(ideal_load3) {
                            Array.prototype.push.apply(marge_option.dataJson, parseData["assay_array"]);
                        } else {
                            Array.prototype.push.apply(marge_option.overlayJson, parseData["assay_array"]);
                        }
                    }

                    if(marge_option.dataJson.length || marge_option.overlayJson.length) {
                        thisInstance2.loadJsonComplete(marge_option);
                    }
                }, thisInst);
            } else {

                if(marge_option.dataJson.length) {
                    thisInstance.loadJsonComplete(marge_option);
                }
            }

            if(marge_option.dataJson.length || marge_option.overlayJson.length) {
                thisInstance.setToolTip(marge_option.selector);
            }
        }, {controller: controller, option: marge_option, ideal_load: ideal_load});

    },

    groupDraw: function($list, $carousel, options) {

        marge_option = $.extend(true, { "selector": $carousel}, this.defaultOptions);
        this.defaultOptions.group = true;

        api_url = options.apiGroupUrl + "/" + options.group + "/skeletons?scope=group." + options.group + ".read";

        oidc.GetApiJson(api_url, function(data_json, thisInstance){

            thisInstance.CreateUserList($list, $carousel, marge_option, data_json)
        }, this);

    },
    // ユーザー一覧を作成
    CreateUserList: function($users_div, $carousel, option, data_json) {

        var date_list = this.CreateGroupDateList(data_json);
        var $carousel_div = $("<div class=\"carousel-box slider\">").appendTo($carousel);

        if(data_json["result"].length > 0) {
            $("#ttl_first").text(data_json["result"][0]["group_name"] + "グループの生育バランスの比較");
        }

        // ユーザー情報を表示
        $.each(data_json["result"], function(i, val) {
            $user_div = $("<div class=\"user-name\">").appendTo($users_div);
            $user_div.html("<span>" + val.user_name + "<br>" + val.skeleton_name + "</span>");
        });

        // カルーセル作成
        $.each(date_list, function(i, val) {
            $date_div = $("<div class=\"date-carousel\">").appendTo($carousel_div);

            $.each(val.data_ids, function(j, data_id) {

                if(data_id) {
                    $date_div.append("<div class=\"skeleton-box\" data-skeletondataid=\"" + data_id + "\" data-skeletonid=\"" + val.skeleton_ids[j] + "\">" + "</div>");
                } else {
                    $date_div.append("<div class=\"skeleton-box none\">" + "<span class=no_display>No Image</span>" + "</div>");
                }
            });
        });

        this.SetCarousel($carousel_div, 4);
        this.CarouselLoadedSkeletonDraw($carousel_div, 4);

    },
    // カルーセル用日付リストを作成
    CreateGroupDateList: function(data_json) {

        thisInstance = this;
        var date_list = [];

        $.each(data_json["result"], function(i, val) {
            $.each(val["skeleton_data"], function(j, skeleton_data) {

                var data_array = new Array(data_json["result"].length);
                data_array[i] = skeleton_data["id"];
                var skeleton_array = new Array(data_json["result"].length);
                skeleton_array[i] = val.skeleton_id;
                
                if(i > 0) {
                    // 追加されていない日付
                    var date_index = thisInstance.SearchDateList(date_list, skeleton_data["assay_date"]);
                    if( date_index < 0){
                        date_list.push({
                            skeleton_date: skeleton_data["assay_date"],
                            data_ids: data_array,
                            skeleton_ids: skeleton_array,
                        });
                    } else {
                        date_list[date_index].data_ids[i] = skeleton_data["id"];
                        date_list[date_index].skeleton_ids[i] = val.skeleton_id;
                    }

                } else {
                    // 初回
                    date_list.push({
                        skeleton_date: skeleton_data["assay_date"],
                        data_ids: data_array,
                        skeleton_ids: skeleton_array,
                    });
                }
            });
        });

        date_list.sort(function(a,b){
                if( a.skeleton_date > b.skeleton_date ) return -1;
                if( a.skeleton_date < b.skeleton_date ) return 1;
                return 0;
        });
        return date_list;
    },
    // 日付の検索
    SearchDateList: function(date_array, date) {

        var index = -1;

        $.each(date_array, function(i, val) {

            if(val["skeleton_date"] == date) {
                index = i;
                return false;
            }
        });

        return index;
    },

    // Slickを設定
    SetCarousel: function($carousel, show_index) {

        var thisInstance = this;
        var slick_options = {
//        $("#testslick").slick({
            infinite: false,
            slidesToShow: show_index,
            appendArrows: $("#arrows"),
//            arrows: true,
        }

        // Slickを設定
        $carousel.slick(slick_options);

        // イベント追加
        $carousel.on('beforeChange', function(event, slick, currentSlide, nextSlide){
            console.log(nextSlide);

            var $carousel_date_box = $(slick.$slider.find(".date-carousel"));

//            if(slick.$slider.find(".date-carousel").length > nextSlide + show_index) {
            if($carousel_date_box.length >= nextSlide + show_index) {

                thisInstance.CarouselSkeletonDraw($($carousel_date_box[nextSlide + show_index - 1]), thisInstance);
            }
        });
    },

    // スケルトンの描画
    CarouselLoadedSkeletonDraw: function($carousel, loaded_index) {

        var thisInstance = this;

        $.each($carousel.find(".date-carousel"), function(i, date_box) {

            // 初回表示分を越えたら終了する
            if(i >= loaded_index) {
                return false;
            }

            // スケルトン分繰り返し
            thisInstance.CarouselSkeletonDraw($(date_box), thisInstance)
        });
    },
    // スケルトンの日付単位の描画
    CarouselSkeletonDraw: function($date_box, thisInstance) {

        var skeleton_boxs = $date_box.find("[data-skeletondataid]");

        for(skeleton_box of skeleton_boxs) {
//        $.each($date_box.find("[data-skeletondataid]"), function(j, skeleton_box) {

            var marge_option = $.extend(true, thisInstance.defaultOptions, {
                skeleton_id: $(skeleton_box).data("skeletonid"),
                data: [$(skeleton_box).data("skeletondataid")],
            });

//            console.log($(skeleton_box).find(".SkeletonCanvasMap"));

            thisInstance.draw($(skeleton_box), marge_option, this);

//            var testbox = $(skeleton_box).find(".SkeletonCanvasMap").append("<a href=\"" + thisInstance.apiReportUrl + "?skeleton_id=" + marge_option.skeleton_id + "&skeleton_data_id=" + marge_option.data.join(",") +  "\" target=\"_blank\">レポート表示</a>");

//            console.log($(skeleton_box).find(".SkeletonCanvasMap"));

            $(skeleton_box).removeData("skeletonid");
            $(skeleton_box).removeData("skeletondataid");
            $(skeleton_box).removeAttr("data-skeletonid");
            $(skeleton_box).removeAttr("data-skeletondataid");
//        });
        }

    },
    getUrlParams: function() {

        params = location.href.split("?");
        paramms = params.length>1&&params[1].split("&");
        var paramMap = {};

        for ( i = 0; i < paramms.length; i++ ) {
            vl = paramms[i].split("=");
            paramMap[vl[0]] = vl[1];
        }

        return paramMap;
    },
    // オプションをインスタンス変数化
    setInstanceValiable: function(options, key) {

        if (key in options) {

            this[key] = options[key];
            delete options[key];
        }
    },
    // 
    inquiryItemsArray2Hash: function(dataJson, baseJson) {

        for (var i = 0; i < dataJson["assay_array"].length; i++) {

            var coeff = 1;

            if("number_unit" in dataJson) {

                if (dataJson["number_unit"] == "cm") {
                    coeff = 10;
                }
            }

            var meta_data = JSON.parse(baseJson["skeleton_meta"]["meta_data"]);

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

                "dataId": meta_data["data_id"],
                "plantingDate":  meta_data["planting_date"],//dataJson[i][2],
                "measurementDate":  baseJson["assay_date"],
                "cultivationDensity":  parseFloat(meta_data["cultivation_density"]),

                
            };
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

        // 計算メソッドを追加
        this.inquiryItemsAddMethod(option.dataJson);
        this.inquiryItemsAddMethod(option.overlayJson);

        // configJsonの値をミリ単位へ
        this.configJsonUnitConversion(option.config)

        if(option.baseFileFlag) {
            this.insertBaseData(option, option.dataJson[0]);
        }
        if(option.commentFlag) {
            this.addCommentHtml(option.comment, 0);
        }
        if(option.historieFlag) {
            this.addCommentHtml(option.comment, 1);
        }

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

        if(option.group) {
            option.selector.find(".SkeletonCanvasMap").append("<a href=\"" + this.apiReportUrl + "?skeleton_id=" + option.skeleton_id + "&skeleton_data_id=" + option.data.join(",") +  "\" target=\"_blank\">レポート表示</a>");
        }

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

        if(option.toolTip) {
            $figure.append("<img src=\"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVQImWP4//8/AAX+Av5Y8msOAAAAAElFTkSuQmCC\" " + sizeString + " class=\"mapImageLayer\" />");

            $map = $("<map>").appendTo($figure);
            $map.append("<area data-tooltiptitle=\"茎伸長量(cm/week)\" data-info=\"stemElongation\" data-unit=\"cm\" nohref />");
            $map.append("<area data-tooltiptitle=\"直径(cm)\" data-info=\"stemDiameter\" data-unit=\"cm\" nohref />");
            $map.append("<area data-tooltiptitle=\"上位葉の大きさ(m<sup>2</sup>)\" data-info=\"topLeafArea\" data-unit=\"m2\" nohref />");
            $map.append("<area data-tooltiptitle=\"中位葉の大きさ(m<sup>2</sup>)\" data-info=\"middleLeafArea\" data-unit=\"m2\" nohref />");
            $map.append("<area data-tooltiptitle=\"下位葉の大きさ(m<sup>2</sup>)\" data-info=\"bottomLeafArea\" data-unit=\"m2\" nohref />");
        }

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
    // 基本データを設定
    insertBaseData: function (option, baseData) {

        //
        if (baseData || Object.keys(this.baseData).length) {

            var plantDate = baseData["plantingDate"].split("/");
            var measurDate = baseData["measurementDate"].split("/");

            $(".planting_date").text("定植日：" + plantDate[0] + "年" + plantDate[1] + "月" + plantDate[2] + "日");
            $(".cultivation_density").html("栽植密度：" + baseData["cultivationDensity"].toFixed(1) + "株/m<sup>2</sup>");
            $(".measurement_date").text("計測日：" + measurDate[0] + "年" + measurDate[1] + "月" + measurDate[2] + "日");
        }

        // スケルトン名の読み込み

        var api_url = option.apiSkeletonUrl + "/" + option.skeleton_id + "?scope=skeleton." + marge_option.skeleton_id + ".read";

        oidc.GetApiJson(api_url, function(data_json, thisInst){

            var marge_option = thisInst.option;
            var thisInstance = thisInst.controller;

            if("skeleton_name" in data_json["result"]) {

                $("#main div > h1").text(data_json["result"].skeleton_name);
                $("#breadcrumb_box li.active").text(data_json["result"].skeleton_name);
            }
        }, {controller: this, option: option});


    },
    // コメントを追加
    addCommentHtml: function (json, commentIndex) {

        var $commentArea = $("#new_comment_area");

        if (commentIndex) {

            $commentArea = $("#old_comment_area");
            $commentArea = $("<div class=\"comment\">").appendTo($commentArea);

//            json["url"] = url + (url.slice(-1) == "/" ? "" : "/") + this.commentLinkFile;
        } else {

            json["newFlag"] = true;
        }

        $commentArea.growthSkeletonComment(json);
    }

}
