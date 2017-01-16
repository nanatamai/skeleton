

var oidc = new OidcController({
        "client_id": "rp-skeleton",
        "response_type": "code",
        "scope": "openid offline",
        "redirect_uri": "http://localhost:4321/callback.html",
        "authorization_endpoint": "http://localhost:1234/oidc/auth",
        "token_session_endpoint": "http://localhost:1234/oidc/token",
        "state": "some-random-state-foobar",
        "nonce": "abcdefg-hijklmn",
        "strage": localStorage,
    });

(function ($) {
    // onLoad
    $(function () {
        
    });
})(jQuery); 
