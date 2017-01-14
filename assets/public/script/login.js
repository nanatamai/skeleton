

(function ($) {
    // onLoad
    $(function () {

        var auth_url = oidc.GenerateAuthUrl();

        // ログインダイアログ表示
        $("#loginBtn").click(function() {
            $('#loginWindow').dialog('open');
        });

        // ログインダイアログ設定
        $("#loginWindow").dialog({
            autoOpen: false,
            width: 500,
            height: 500,
            modal: true,
            open : function(){
                $("#loginWindow").append('<iframe id="iframeLogin"></iframe>');
                $("#iframeLogin").attr({
                    src : auth_url,
                    width : '450px',
                    height : '450px'
                });
            },
            close : function(){
                $("#iframeLogin").remove();
            }
        });

        // 
        if(oidc.AccessTokenCheck()){
            $("#noLoginMenu").toggle(false);
            $("#loginMenu").toggle(true);
            $("#logoutBtn").toggle(true);
        } else {
            $("#noLoginMenu").toggle(true);
            $("#loginMenu").toggle(false);
            $("#logoutBtn").toggle(false);
            
        }

    });
})(jQuery); 
