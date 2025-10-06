curl -X GET     http://localhost:8080/api/alarms

echo "\n####################\n"

curl -X POST    http://localhost:8080/api/alarms -H 'Content-Type: application/json'   -d '{"signal_id": 1234, "signal_label": "Exemple d'\''alarme coco3"}'

echo "\n####################\n"

    