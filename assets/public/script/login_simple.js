

(function ($) {
    // onLoad
    $(function () {

        var auth_url = oidc.GenerateAuthUrl();

        oidc.defaultOptions.errorLocation = "";

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

                AccessTokenCheck();
            }
        });

        AccessTokenCheck();

        //
        function AccessTokenCheck() {
            if(oidc.AccessTokenCheck()){
                $("#contents").toggle(true);
                $("#logoutBtn").toggle(true);
                
                skeletonDraw();
            } else {
                $('#loginWindow').dialog('open');
                $("#contents").toggle(false);
                $("#logoutBtn").toggle(false);
            }
        }

    });
})(jQuery); 
