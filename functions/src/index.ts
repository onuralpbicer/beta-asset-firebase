/* eslint-disable require-jsdoc */
import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'

admin.initializeApp(functions.config().firebase)

const contentfulSpaceId = 'v00lofp5qjmx'
const contentfulAccessToken = '4Av2evmSsl_ZqurMdfVdX0RQry3fQGihm3h7JAa4nXI'

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

export const helloWorld = functions.https.onRequest((request, response) => {
    functions.logger.info('Hello logs!', { structuredData: true })

    const db = admin.firestore()

    const now = new Date()

    collectMaintenances(db, now.getMonth() + 1, now.getFullYear())
        .then(groupMaintenancesByEquipment)
        .then((map) =>
            generateMaintenanceReport(map, now).finally(() => {
                response.send('Hello from Firebase!')
            }),
        )
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

interface IMaintenanceReportMaintenance {
    date: Date
    outcome: string
}

interface IMaintenanceReportEquipment {
    name: string
    maintenances: Array<IMaintenanceReportMaintenance>
}

interface IMaintenanceReportEquipmentType {
    name: string
    equipments: Array<IMaintenanceReportEquipment>
}

interface IMaintenanceReport {
    name: string
    date: Date
    reportMonthYear: string
    equipmentTypes: Array<IMaintenanceReportEquipmentType>
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

function getEntityPath(id: string) {
    return `https://cdn.contentful.com/spaces/${contentfulSpaceId}/environments/master/entries/${id}?access_token=${contentfulAccessToken}`
}

async function getEquipmentTypesList(): Promise<IEquipmentType[]> {
    const path = getEntityPath('4Xi1mtiYcpKsR2ZKWLn9mN')

    const response = await fetch(path).then((res) => res.json())

    return Promise.all(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (response.fields.equipmentTypes as any[]).map(
            async (equimentType: IContentfulLink): Promise<IEquipmentType> => ({
                id: equimentType.sys.id,
                ...(await getEquipmentType(equimentType.sys.id)),
            }),
        ),
    )
}

interface IEquipmentType {
    id: string
    name: string
    equipments: Array<string>
}

interface IContentfulLink {
    sys: {
        id: string
    }
}

async function getEquipmentName(id: string) {
    const path = getEntityPath(id)

    const response = await fetch(path).then((res) => res.json())

    return response.fields.name as string
}

async function getEquipmentType(id: string) {
    const path = getEntityPath(id)

    const response = await fetch(path).then((res) => res.json())

    return {
        name: response.fields.name as string,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        equipments: (response.fields.equipments as any[]).map(
            (equipment: IContentfulLink) => equipment.sys.id,
        ),
    }
}
