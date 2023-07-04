/* eslint-disable require-jsdoc */

const contentfulSpaceId = 'v00lofp5qjmx'
const contentfulAccessToken = '4Av2evmSsl_ZqurMdfVdX0RQry3fQGihm3h7JAa4nXI'

function getEntityPath(id: string) {
    return `https://cdn.contentful.com/spaces/${contentfulSpaceId}/environments/master/entries/${id}?access_token=${contentfulAccessToken}`
}

export async function getEquipmentTypesList(): Promise<IEquipmentType[]> {
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

export async function getEquipmentName(id: string) {
    const path = getEntityPath(id)

    const response = await fetch(path).then((res) => res.json())

    return response.fields.name as string
}

export async function getEquipmentType(id: string) {
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
