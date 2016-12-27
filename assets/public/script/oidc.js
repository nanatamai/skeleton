

// コンストラクタ
function OidcController(options) {

    this.strage = localStorage;

    this.setInstanceValiable(options, "strage");

    this.defaultOptions = $.extend(true, {
        "client_id": "",
        "response_type": "token id_token",
        "scope": "openid offline",
        "redirect_uri": "",
        "authorization_endpoint": "",
        "userinfo_endpoint": "",
        "token_session_endpoint": "",
    }, options);

};

OidcController.prototype = {

    // オプション設定
    GenerateAuthUrl: function() {

        var urlparam = {
            "client_id": this.defaultOptions.client_id,
            "redirect_uri": this.defaultOptions.redirect_uri,
            "response_type": this.defaultOptions.response_type,
            "scope": this.defaultOptions.scope,
            "state": this.defaultOptions.state,
            "nonce": this.defaultOptions.nonce,
        };
        
        return this.defaultOptions.authorization_endpoint + "?" + $.param(urlparam);
    },
    // オプションをインスタンス変数化
    setInstanceValiable: function(options, key) {

        if (key in options) {

            this[key] = options[key];
            delete options[key];
        }
    },
    // ログイン済みの場合、リダイレクト
    LoginCheck: function() {

        if(this.AccessTokenCheck()){
            $("#noLoginMenu").toggle(false);
            $("#loginMenu").toggle(true);
        } else {
            if(location.pathname != "/" && location.pathname != "/index.html") {
                window.location.href = "/";
            } else {
                $("#noLoginMenu").toggle(true);
                $("#loginMenu").toggle(false);
            }
            
        }
    },
    // AccessTokenの確認
    AccessTokenCheck: function() {

        var ret = true;
        var datenow = new Date();
        var token = $.parseJSON(this.strage.getItem(this.defaultOptions["client_id"]));

        if(!token) {
            return false;
        }

        var expires_at = new Date( token["expires_at"] )

        // 有効期限間近の場合、更新する
        if( expires_at < datenow.setMinutes(datenow.getMinutes() + 5) ) {

            // 
            if(token.refresh_token) {

                ret = this.RewnewAccessToken(token.refresh_token);
            } else {
                ret = false;
            }
        }

        return ret;
    },
    RewnewAccessToken: function(refresh_token) {

        $.ajax({
            type: "post",
            async: false,
            url: this.defaultOptions["token_session_endpoint"],
            data: {
                "refresh": refresh_token,
            }
        })
        .done(function(data) {
            console.log("Renew Access Token : " + data);

            var datenow = new Date();
            var token = $.parseJSON(this.strage.getItem(this.defaultOptions["client_id"]));

            token["access_token"] = data["access_token"];
            token["refresh_token"] = data["refresh_token"];
            token["expires_at"] = datenow.setMinutes(datenow.getSeconds() + data["expires_in"]);

            return true;
        })
        .fail(function(data) {
            console.log(data);

            return false;
        });
    },
    GetPrivateFile: function(url, write_box_id) {

        // Access Token check
        if(!this.AccessTokenCheck()) {
            return
        }

        var token = $.parseJSON(this.strage.getItem(this.defaultOptions["client_id"]));

        $.ajax({
            url: url,
            type: "GET",
            cache : false,
//            headers: {
//                'Authorization': 'Bearer ' + token["access_token"],
//            },
            beforeSend: function(xhr) {
                xhr.setRequestHeader('Authorization', 'Bearer ' + token["access_token"]);
            },
            timeout: 10000,
        })
        .done(function( data, textStatus, jqXHR ) {
            // 通信が成功したときの処理
            var iframe = document.getElementById(write_box_id).contentWindow.document;
            iframe.open();
            iframe.write(data);
            iframe.close();
        })
        .fail(function( jqXHR, textStatus, errorThrown ) {
            // 通信が失敗したときの処理
            $("#login_error").html("エラーが発生しました。ステータス：" + jqXHR.status);
            console.log("private file error : " + jqXHR.status + " " + textStatus);

            var iframe = document.getElementById(write_box_id).contentWindow.document;
            iframe.open();
            iframe.write(textStatus);
            iframe.close();
        })
        .always(function( jqXHR, textStatus  ) {
            // 通信が完了したとき
        });
    },
    GetApiJson:  function(url, data_func) {

        var this_func = this;

        // Access Token check
        if(!this.AccessTokenCheck()) {
            return
        }

        var token = $.parseJSON(this.strage.getItem(this.defaultOptions["client_id"]));

        $.ajax({
            url: url,
            type: "GET",
            cache : false,
            headers: {
                'Authorization': 'Bearer ' + token["access_token"],
            },
            timeout: 10000,
        })
        .done(function( data, textStatus, jqXHR ) {
            // 通信が成功したときの処理
            if("result" in data) {
                if($.isArray(data)) {
                    if(data["result"].length > 0) {
                    
                        data_func(data);
                    }
                } else {
                    data_func(data);
                }
                
            }
        })
        .fail(function( jqXHR, textStatus, errorThrown ) {
            // 通信が失敗したときの処理
            this_func.ResultDialog("", "通信エラーが発生しました：" + textStatus + " " + textStatus);
//            $("#login_error").html("エラーが発生しました。ステータス：" + jqXHR.status);
            console.log("private file error : " + jqXHR.status + " " + textStatus);

        })
        .always(function( jqXHR, textStatus  ) {
            // 通信が完了したとき
        });
    },
    PostApi: function(api_url, ajax_type, data_json, result_func) {

        var this_func = this;

        // Access Token check
        if(!this.AccessTokenCheck()) {
            return
        }

        var token = $.parseJSON(this.strage.getItem(this.defaultOptions["client_id"]));

        $.ajax({
            url: api_url,
            type: ajax_type,
            cache : false,
            headers: {
                'Authorization': 'Bearer ' + token["access_token"],
            },
            data: data_json,
            timeout: 10000,
        })
        .done(function( data, textStatus, jqXHR ) {
            // 通信が成功したときの処理
            if("error" in data) {
                if(data["error"] == "") {

                    result_func();

//                    $result_dlg.html("完了しました");
                    this_func.ResultDialog("", "完了しました");
                } else {
//                    $result_dlg.html("エラーが発生しました：" + data["error"]);
                    this_func.ResultDialog("", "エラーが発生しました：" + data["error"]);
                }
            } else {
//                $result_dlg.html("不明なエラーが発生しました　受信データ：" + data);
                this_func.ResultDialog("", "不明なエラーが発生しました　受信データ：" + data);
            }

//            $result_dlg.dialog('open');
        })
        .fail(function( jqXHR, textStatus, errorThrown ) {
            // 通信が失敗したときの処理
            console.log("network error : " + jqXHR.status + " " + textStatus);

//            $result_dlg.html("通信エラーが発生しました：" + textStatus + " " + textStatus);
//            $result_dlg.dialog('open');
            this_func.ResultDialog("", "通信エラーが発生しました：" + textStatus + " " + textStatus);
        })
        .always(function( jqXHR, textStatus  ) {
            // 通信が完了したとき
        });
    },
    DeleteApi: function(api_url, result_func) {

        var this_func = this;

        // Access Token check
        if(!this.AccessTokenCheck()) {
            return
        }

        var token = $.parseJSON(this.strage.getItem(this.defaultOptions["client_id"]));

        $.ajax({
            url: api_url,
            type: "DELETE",
            cache : false,
            headers: {
                'Authorization': 'Bearer ' + token["access_token"],
            },
//            data: $input_form.find("form").serialize(),
            timeout: 10000,
        //    contentType: 'application/json',
        //    dataType: 'json'
        })
        .done(function( data, textStatus, jqXHR ) {
            // 通信が成功したときの処理
            if("error" in data) {
                if(data["error"] == "") {

                    result_func();

//                    $result_dlg.html("完了しました");
                    this_func.ResultDialog("", "完了しました");
                } else {
//                    $result_dlg.html("エラーが発生しました：" + data["error"]);
                    this_func.ResultDialog("", "エラーが発生しました：" + data["error"]);
                }
            } else {
//                $result_dlg.html("不明なエラーが発生しました　受信データ：" + data);
                this_func.ResultDialog("", "不明なエラーが発生しました　受信データ：" + data);
            }

//            $result_dlg.dialog('open');
        })
        .fail(function( jqXHR, textStatus, errorThrown ) {
            // 通信が失敗したときの処理
            console.log("network error : " + jqXHR.status + " " + textStatus);

//            $result_dlg.html("通信エラーが発生しました：" + textStatus + " " + textStatus);
//            $result_dlg.dialog('open');
            this_func.ResultDialog("", "通信エラーが発生しました：" + textStatus + " " + textStatus);
        })
        .always(function( jqXHR, textStatus  ) {
            // 通信が完了したとき
        });
    },
    ResultDialog: function(title, message) {
//        $("#crudframe", window.parent.document).height(document.body.scrollHeight + 20);
//        $("#crudframe", window.parent.document).width(document.body.scrollWidth);

        var $result_dlg = $("<div>" + message + "</div>");

        $result_dlg.dialog({
            modal: true,
            title: title,
            buttons: {
                "OK": function() {
                    $(this).dialog("close");
                }
            },
            close: function(event, ui) {
                    $(this).dialog('destroy');
                    $(event.target).remove();
            },
        });
    },
    GetToken: function() {

        var token = $.parseJSON(this.strage.getItem(this.defaultOptions["client_id"]));

        if(!token) {
            return false;
        }

        return token;
    },
    GetTokenUserID: function() {

        var token = $.parseJSON(this.strage.getItem(this.defaultOptions["client_id"]));

        if(!token) {
            return false;
        }

        return token["user_id"];
    },

    SerializeArray2PostData: function(serializeArray, prefix) {

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
    },

};

(function ($) {
    // onLoad
    $(function () {

        // レシーバ登録
//        $(window).on("message", receiveMessage, false);
        window.addEventListener("message", receiveMessage, false);

        // レシーバー本体
        function receiveMessage(event)
        {
            var showMenu = false;

            // originが違う場合、無視
            if (event.origin !== location.protocol + "//" + location.host) {
                return;
            }

            if(event.data != "error") {
                
                showMenu = true;
            } else {

                $("#errordiv").html("エラーが発生しました。ログインをやり直してください。");
            }

            $("#noLoginMenu").toggle(!showMenu);
            $("#loginMenu").toggle(showMenu);

            // loginダイアログを閉じる
            $("#loginWindow").dialog("close");
        }

        

    });

    
    
})(jQuery);
