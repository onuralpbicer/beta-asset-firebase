import { DocumentData } from '@google-cloud/firestore'

export type EquipmentMaintenanceMap = Map<string, DocumentData[]>

export interface IMaintenanceReportMaintenance {
    date: Date
    outcome: string
}

export interface IMaintenanceReportEquipment {
    name: string
    maintenances: Array<IMaintenanceReportMaintenance>
}

export interface IMaintenanceReportEquipmentType {
    name: string
    equipments: Array<IMaintenanceReportEquipment>
}

export interface IMaintenanceReport {
    name: string
    date: Date
    reportMonthYear: string
    equipmentTypes: Array<IMaintenanceReportEquipmentType>
}
