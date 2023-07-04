/* eslint-disable require-jsdoc */
import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'
admin.initializeApp(functions.config().firebase)

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

export const helloWorld = functions.https.onRequest((request, response) => {
    functions.logger.info('Hello logs!', { structuredData: true })

    const db = admin.firestore()

    const now = new Date()

    collectMaintenances(db, now.getMonth() + 1, now.getFullYear())
        .then(groupMaintenancesByEquipment)
        .finally(() => {
            response.send('Hello from Firebase!')
        })
})

async function collectMaintenances(
    db: admin.firestore.Firestore,
    month: number,
    year: number,
) {
    // Set the start date to the beginning of the current month
    const startDate = new Date(year, month - 1, 1)

    // Set the end date to the beginning of the next month
    const endDate = new Date(year, month, 1)

    console.log(startDate, endDate)

    const snapshot = await db
        .collection('maintenances')
        .where('date', '>=', startDate)
        .where('date', '<', endDate)
        .orderBy('date', 'desc')
        .get()

    const documents: admin.firestore.DocumentData[] = []
    snapshot.forEach((doc) => {
        documents.push(doc.data())
    })

    return documents
}

type EquipmentMaintenanceMap = Map<string, admin.firestore.DocumentData[]>

async function groupMaintenancesByEquipment(
    documents: admin.firestore.DocumentData[],
) {
    const map: EquipmentMaintenanceMap = new Map()

    documents.forEach((doc) => {
        if (map.has(doc.equipmentId)) {
            map.get(doc.equipmentId)?.push(doc)
        } else {
            map.set(doc.equipmentId, [doc])
        }
    })

    return map
}
