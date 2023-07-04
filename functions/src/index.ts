/* eslint-disable require-jsdoc */
import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import {
    EquipmentMaintenanceMap,
    IMaintenanceReport,
    IMaintenanceReportEquipment,
    IMaintenanceReportEquipmentType,
} from './types'
import { getEquipmentName, getEquipmentTypesList } from './contentful'

admin.initializeApp(functions.config().firebase)

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

export const helloWorld = functions.https.onRequest((request, response) => {
    functions.logger.info('Hello logs!', { structuredData: true })

    run().finally(() => {
        response.send('Hello from Firebase!')
    })
})

async function run() {
    const db = admin.firestore()

    const now = new Date()

    const maintenances = await collectMaintenances(
        db,
        now.getMonth() + 1,
        now.getFullYear(),
    )

    const map = await groupMaintenancesByEquipment(maintenances)

    const report = await generateMaintenanceReport(map, now)

    await generateExcel(report)
}

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

async function generateMaintenanceReport(
    maintenances: EquipmentMaintenanceMap,
    now: Date,
) {
    const report: IMaintenanceReport = {
        name: 'KLİMA VE HAVALANDIRMA SİSTEMLERİ',
        date: now,
        reportMonthYear: format(now, 'LLLL yyyy', { locale: tr }),
        equipmentTypes: [],
    }

    const equipmentTypesList = await getEquipmentTypesList()

    for (const equipmentType of equipmentTypesList) {
        const reportEquipmentType: IMaintenanceReportEquipmentType = {
            name: equipmentType.name,
            equipments: [],
        }
        for (const equipment of equipmentType.equipments) {
            const maintenanceListForEquipment = maintenances.get(equipment)

            const reportForEquipment: IMaintenanceReportEquipment = {
                name: await getEquipmentName(equipment),
                maintenances: (maintenanceListForEquipment ?? []).map(
                    (maintenance) => {
                        console.log(maintenance)
                        return {
                            date: maintenance.date.toDate(),
                            outcome: 'outcome',
                        }
                    },
                ),
            }
            reportEquipmentType.equipments.push(reportForEquipment)
        }
        report.equipmentTypes.push(reportEquipmentType)
    }

    return report
}

async function generateExcel(report: IMaintenanceReport) {
    console.log(report)
    //
}
