

var oidc = new OidcController({
        "client_id": "rp-skeleton",
//        "client_id": "localhost",
        "response_type": "code",
        "scope": "openid offline",
        "redirect_uri": "http://skdemo.aoidn.com/callback.html",
//        "redirect_uri": "http://localhost:8080/callback.html",
        "authorization_endpoint": "http://skdemo.aoidn.com:1234/oidc/auth",
        "token_session_endpoint": "http://skdemo.aoidn.com:1234/oidc/token",
        "state": "some-random-state-foobar",
        "nonce": "abcdefg-hijklmn",
        "strage": localStorage,
    });

(function ($) {
    // onLoad
    $(function () {
        
    });
})(jQuery); 
