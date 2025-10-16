import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    // Création de quelques alarmes
    const alarm1 = await prisma.alarm.create({
        data: {
            signal_id: 1,
            signal_label: "Alarme réseau - Perte de connexion"
        }
    });
    console.log("Alarm1:", alarm1);

    const alarm2 = await prisma.alarm.create({
        data: {
            signal_id: 2,
            signal_label: "Alarme physique - Température élevée"
        }
    });
    console.log("Alarm2:", alarm2);

    const alarm3 = await prisma.alarm.create({
        data: {
            signal_id: 3,
            signal_label: "Alarme QoS - Latence élevée"
        }
    });
    console.log("Alarm3:", alarm3);

    const alarm4 = await prisma.alarm.create({
        data: {
            signal_id: 4,
            signal_label: "Alarme réseau - Erreur de configuration"
        }
    });
    console.log("Alarm4:", alarm4);

    const alarm5 = await prisma.alarm.create({
        data: {
            signal_id: 5,
            signal_label: "Alarme physique - Ventilateur défectueux"
        }
    });
    console.log("Alarm5:", alarm5);

    // Récupérer toutes les alarmes
    const alarms = await prisma.alarm.findMany({});
    console.log("All alarms:", alarms);
}

main()
    .catch(e => {
        throw e;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
