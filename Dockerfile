FROM centos:7

# 本体スクリプトは以下のようにLinux用バイナリを出力させる
# GOOS=linux GOARCH=amd64 go build

RUN mkdir /app
COPY pdj-rp-skeleton /app
COPY assets/ /app/assets
WORKDIR /app

ENV APICONF2="{\"host\": {\"host\": \"https://localhost\", \"port\": 4321}, \"oidc_client\": {\"client_id\": \"rp-skeleton\",\"secret\": \"foobar\", \"scopes\": \"openid, pdjrp-skeleton, offline\", \"redirect_url\": \"http://localhost:4321/callback.html\", \"auth_url\": \"http://pdj-rp-admin:1234/oidc/auth\", \"token_url\": \"http://pdj-rp-admin:1234/oidc/token\"}}"

EXPOSE 4321
CMD [ "/app/pdj-rp-skeleton" ]

