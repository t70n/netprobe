echo "---[ Test des APIs REST avec curl ]-----------------------------"
echo ""
echo "===[ 1. Récupération des alarmes (GET) ]========================"
echo ""
curl -s -X GET http://localhost:8080/api/alarms | jq
echo ""
echo ""
echo "===[ 2. Création d'une alarme (POST) ]=========================="
echo ""
curl -s -X POST http://localhost:8080/api/alarms \
    -H 'Content-Type: application/json' \
    -d '{"signal_id": 0, "signal_label": "Merci JC.Buisson"}' | jq
echo ""