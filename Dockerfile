FROM centos:7

# 本体スクリプトは以下のようにLinux用バイナリを出力させる
# GOOS=linux GOARCH=amd64 go build

RUN mkdir /app
COPY pdj-rp-skeleton /app
COPY assets/ /app/assets
WORKDIR /app

ENV APICONF2="{\"host\": {\"host\": \"https://skdemo.aoidn.com\", \"port\": 80}, \"oidc_client\": {\"client_id\": \"rp-skeleton\",\"secret\": \"foobar\", \"scopes\": \"openid, pdjrp-skeleton, offline\", \"redirect_url\": \"http://skdemo.aoidn.com/callback.html\", \"auth_url\": \"http://skdemo.aoidn.com:1234/oidc/auth\", \"token_url\": \"http://pdj-rp-admin:1234/oidc/token\"}}"

EXPOSE 80
CMD [ "/app/pdj-rp-skeleton" ]

