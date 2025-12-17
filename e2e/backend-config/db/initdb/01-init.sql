\set app_db `echo "$APP_DB_NAME"`
\set app_user `echo "$APP_DB_USER"`
\set app_password `echo "$APP_DB_PASSWORD"`

CREATE USER :"app_user" WITH PASSWORD :'app_password';

CREATE DATABASE :"app_db" WITH OWNER = :"app_user";

GRANT CONNECT ON DATABASE :"app_db" TO :"app_user";

\c :app_db

GRANT USAGE ON SCHEMA public TO :"app_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO :"app_user";
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO :"app_user";

ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO :"app_user";
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT USAGE, SELECT ON SEQUENCES TO :"app_user";
