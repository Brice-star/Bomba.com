$env:DB_HOST='gondola.proxy.rlwy.net'
$env:DB_PORT='16820'
$env:DB_USER='root'
$env:DB_PASSWORD='xvVFwZMOdEpJMPYRbFrobapgtbSYuhJT'
$env:DB_NAME='railway'

Write-Host "Running test-db with DB_HOST=$env:DB_HOST DB_PORT=$env:DB_PORT DB_USER=$env:DB_USER DB_NAME=$env:DB_NAME"

npm run test-db
