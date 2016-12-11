
(function ($) {
    // onLoad
    $(function () {

        var $input_form = $("#inputForm");
        var $basic_form = $("#basic_form");
        var $json_form = $("#json_form");
        var $new_btn = $("#newRecordBtn");
        var $data_list = $("#datalist");
        var $date_picker = $(".datetimepicker");
        var crud_read_link = ".crud_read_link";
        var crud_edit_link = ".crud_edit_link";
        var crud_del_link = ".crud_del_link";

        if(!oidc.AccessTokenCheck()){
            window.location.href = "/";
            return;
        }

        // 一覧取得
        oidc.GetApiJson(UserApiUrl(api_url) + "?scope=user." + oidc.GetTokenUserID(), SetColumn);

        // オプション設定
        GetFormOption($input_form, api_url);

        // Varidator
        $basic_form.validationEngine({
            promptPosition: "inline",
            showArrowOnRadioAndCheckbox: true,
            focusFirstField: false,
            scroll: false
        });
        $json_form.validationEngine({
            promptPosition: "inline",
            showArrowOnRadioAndCheckbox: true,
            focusFirstField: false,
            scroll: false
        });

        // 入力フォームにjsFormを設定
        $input_form.jsForm({
            data: null,
        });
        $json_form.jsForm({
            data: null,
        });

        // 入力フォームの日付入力
        if($date_picker.length > 0) {
            $date_picker.datetimepicker({
                timepicker:false,
                format:"Y/m/d",
                lang: "ja",
            });
        }

        

        // 入力フォームのcheckbox
        $.each($input_form.find("[data-crud-check]"), function(i, check_text) {

            var check_name = $(check_text).data("crudCheck");
            var sel_check = "[name=\"" + check_name + "\"]";

            $(document).on('change', sel_check, function(){

                var value_string = "";

                $.each($input_form.find(sel_check), function(i, check_box) {

                    if($(check_box).is(":checked")) {

                        if(value_string) {
                            value_string += ",";
                        }

                        value_string += $(check_box).attr("value")
                    }

                    $(check_text).val(value_string);
                });
            });
        });

        // 新規作成ボタン
        $new_btn.click(function() {

            // フォームのクリア
            $input_form.jsForm("reset");
            $json_form.jsForm("reset");

            $input_form.dialog({
                modal: true,
                title: "新規作成",
                width: "1000px",
                buttons: {
                    "キャンセル": function() {
                        $(this).dialog("close");
                        return false;
                    },
                    "新規作成": function() {
                        oidc.PostApi(api_url, "POST", CreateFormData(), function() {

                            // リストを破棄して再読込
                            $data_list.columns("destroy");
                            oidc.GetApiJson(UserApiUrl(api_url) + "?scope=user." + oidc.GetTokenUserID(), SetColumn);
                        });

                        $(this).dialog("close");
                    }
                },
            });

//            $input_form.dialog('open');
        });

        // 詳細リンク
        $(document).on('click', crud_read_link, function(){

            // フォームのクリア
//            $input_form.jsForm("reset");

            oidc.GetApiJson($(this).attr("href") + "?scope=user." + oidc.GetTokenUserID(), function(json_data) {

                $input_form.jsForm("fill", json_data.result);

                if ("meta_data" in json_data.result) {
                    $json_form.jsForm("fill", JSON.parse(json_data.result.meta_data));
                } else if ("assay_data" in json_data.result) {
                    $json_form.jsForm("fill", JSON.parse(json_data.result.assay_data));
                }
                

//                $input_form.find("input[type=submit]").hide();
                HiddenText2CheckBox();

                $input_form.dialog({
                    title: "詳細",
                    buttons: {},
                });

//                $input_form.dialog('open');
            });

            return false;
        });


        // 削除リンク
        $(document).on('click', crud_del_link, function(){

            var del_url = $(this).attr("href") + "?scope=user." + oidc.GetTokenUserID();
            var $confirm_dlg = $("<div>削除してもよろしいですか？</div>");

            $confirm_dlg.dialog({
                modal: true,
                title: "削除確認",
                buttons: {
                    "キャンセル": function() {
                        $(this).dialog("close");
                        return false;
                    },
                    "削除": function() {
                        oidc.DeleteApi(del_url, function(json_data) {

                            // リストを破棄して再読込
                            $data_list.columns("destroy");
                            oidc.GetApiJson(UserApiUrl(api_url) + "?scope=user." + oidc.GetTokenUserID(), SetColumn);
                        });

                        $(this).dialog("close");
                    }
                },
                close: function(event, ui) {
                        $(this).dialog('destroy');
                        $(event.target).remove();
                },
            });

            return false;
        });
    

        // 入力フォームのSelectタグの内容を取得し設定
        function GetFormOption($input_form, api_url) {

            if( $input_form.find("select").length > 0 ) {

                oidc.GetApiJson(api_url + "/options?scope=user." + oidc.GetTokenUserID(), SetFormOptions);

            } else {
                console.log("select tag no set");
            }
        }

        // 入力フォームのselectタグを設定
        function SetFormOptions(json_data) {

            if(!$.isArray(json_data["result"])) {
                console.log("json format error");
                return;
            }

            $.each($input_form.find("select"), function(j, sel_tag) {
//            $input_form.find("select").each(function() {

                var $select_tag = $(sel_tag);

                $.each(json_data["result"], function(i, sel_opt) {

                    var select_name = $select_tag.attr("name");

                    if(select_name == ("data." + sel_opt["select_name"])) {

                        // optionのmapを作成
                        var $option = $.map(sel_opt["option_data"],function(optdata, i){
                            return $("<option>",{
                                value: optdata["id"],
                                text: optdata["view_name"] + (optdata["delete_flag"] ? " [削除済み]" : "")
                            });
                        });

                        // selectへ追加
                        $select_tag.append($option)

                        // break
                        return false;
                    }
                });
            });
        }

        // 入力フォームの値をチェックボックスへ
        function HiddenText2CheckBox() {

            // 対象input hidden分繰り返し
            $.each($input_form.find("[data-crud-check]"), function(i, check_text) {

                var check_name = $(check_text).data("crudCheck");
                var hidden_text = $(check_text).val().split(",");

                $input_form.find("[name=\"" + check_name + "\"]").prop("checked", false);

                $.each(hidden_text, function(i, check_value) {

                    $input_form.find("[name=\"" + check_name + "\"][value=\"" + check_value + "\"]").prop("checked", true);
                });
            });
        }

        function CreateFormData() {

            var token = oidc.GetToken();

            var basic_array = $basic_form.serializeArray();
            var json_data = ($json_form.serializeArray());

            basic_array.push({"name":"data.meta_data","value":JSON.stringify(SerializeArray2PostData(json_data, "data."))});
            basic_array.push({"name":"data.user_id","value":token["user_id"]});
            basic_array.push({"name":"scope","value":"user." + token["user_id"]});

            return SerializeArray2PostData(basic_array);
        }

        function UserApiUrl(apiurl) {

            return (apiurl + "/user/" + oidc.GetTokenUserID());
        }

        function SerializeArray2PostData(serializeArray, prefix) {

            var postdata = {};
            var name = '';
            var val = '';

            for (var key in serializeArray) {
                name 	= serializeArray[key]['name'];
                val 	= serializeArray[key]['value'];

                if(prefix) {
                    postdata[name.replace(prefix, "")] =  val;
                } else {
                    postdata[name] =  val;
                }
            }

            return postdata;
        }
    });


})(jQuery);