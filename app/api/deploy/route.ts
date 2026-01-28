import { NextResponse } from 'next/server'
import { gql, GraphQLClient } from 'graphql-request'

export async function POST(req: Request) {
    const { beeperToken, flyToken, bridge, region, appName, redeploy } = await req.json()

    // If redeploy flag is passed, update existing machine to latest image
    if (redeploy) {
        const res_list = await fetch(`https://api.machines.dev/v1/apps/${appName}/machines`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${flyToken}`,
                'Content-Type': 'application/json',
            }
        })

        if (res_list.status !== 200) {
            const list_data = await res_list.json()
            return NextResponse.json({ error: JSON.stringify(list_data) }, { status: 500 })
        }

        const machines = await res_list.json()
        if (!machines || machines.length === 0) {
            return NextResponse.json({ error: `No machines found for app ${appName}` }, { status: 404 })
        }

        const machine = machines[0]

        const update_res = await fetch(`https://api.machines.dev/v1/apps/${appName}/machines/${machine.id}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${flyToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                config: {
                    ...machine.config,
                    image: "ghcr.io/beeper/bridge-manager"
                }
            })
        })

        if (update_res.status !== 200) {
            const update_data = await update_res.json()
            return NextResponse.json({ error: JSON.stringify(update_data) }, { status: 500 })
        }

        return NextResponse.json({ success: true })
    }

    const app_name = `sh-${bridge}-${Date.now()}`

    // Create the app
    const res_create_app = await fetch('https://api.machines.dev/v1/apps', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${flyToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ app_name: app_name, org_slug: 'personal' })
    })

    if (res_create_app.status != 201) {
        const create_app_data = await res_create_app.json()
        return NextResponse.json({ error: JSON.stringify(create_app_data) }, { status: 500 })
    }

    // Allocate shared IPv4
    const graphQLClient = new GraphQLClient('https://api.fly.io/graphql', {
        headers: {
            authorization: `Bearer ${flyToken}`,
        },
    })

    const ip_query = gql`
        mutation($input: AllocateIPAddressInput!) {
            allocateIpAddress(input: $input) {
                app {
                    sharedIpAddress
                }
            }
        }
    `

    const ip_variables = {
        "input": {
            "appId": app_name,
            "type": "shared_v4",
            "region": region
        }
    }

    const ip_request_data: any = await graphQLClient.request(ip_query, ip_variables)

    if (!ip_request_data.allocateIpAddress?.app?.sharedIpAddress) {
        return NextResponse.json({ error: JSON.stringify(ip_request_data) }, { status: 500 })
    }

    // Set secrets
    const secrets_query = gql`
        mutation($input: SetSecretsInput!) {
            setSecrets(input: $input) {
                release {
                    id
                    version
                    reason
                    description
                    user {
                        id
                        email
                        name
                    }
                    evaluationId
                    createdAt
                }
            }
        }
    `

    const secrets_variables = {
        "input": {
            "appId": app_name,
            "secrets": [
                { "key": "MATRIX_ACCESS_TOKEN", "value": beeperToken },
                { "key": "BRIDGE_NAME", "value": app_name },
                { "key": "DB_DIR", "value": "/data" }
            ]
        }
    }

    const secrets_request_data: any = await graphQLClient.request(secrets_query, secrets_variables)

    if (!secrets_request_data?.setSecrets?.hasOwnProperty('release')) {
        return NextResponse.json({ error: JSON.stringify(secrets_request_data) }, { status: 500 })
    }
    const res_create_volume = await fetch(
        `https://api.machines.dev/v1/apps/${app_name}/volumes`,
        {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${flyToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                name: "bridge_data",
                region: region,
                size_gb: 1
            })
        }
    )

    if (res_create_volume.status !== 201) {
        const volume_data = await res_create_volume.json()
        return NextResponse.json(
            { error: JSON.stringify(volume_data) },
            { status: 500 }
        )
    }
    const volume = await res_create_volume.json()
    const volumeId = volume.id

    await new Promise((r) => setTimeout(r, 500))

    // Create machine
    const res_create_machine = await fetch(`https://api.machines.dev/v1/apps/${app_name}/machines`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${flyToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            "region": region,
            "config": {
                "image": "ghcr.io/beeper/bridge-manager",
                "env": {
                    "APP_ENV": "production"
                },
                "mounts": [
                    {
                        volume: volumeId,
                        path: "/data"
                    }
                ],
                "services": [
                    {
                        "ports": [
                            {
                                "port": 443,
                                "handlers": [
                                    "tls",
                                    "http"
                                ]
                            },
                            {
                                "port": 80,
                                "handlers": [
                                    "http"
                                ]
                            }
                        ],
                        "protocol": "tcp",
                        "internal_port": 8080
                    }
                ]
            }
        })
    })

    if (res_create_machine.status != 200) {
        const create_machine_data = await res_create_machine.json()
        return NextResponse.json({ error: JSON.stringify(create_machine_data) }, { status: 500 })
    }

    // Wait for the app to deploy before returning
    let beeper_bridges: string[] = []
    while (!(beeper_bridges.includes(app_name))) {
        const beeper_whoami = await fetch('https://api.beeper.com/whoami', {
            headers: {
                'Authorization': `Bearer ${beeperToken}`,
                'Content-Type': 'application/json',
            },
        })

        if (beeper_whoami.status != 200) {
            const beeper_bridge_data = await beeper_whoami.json()
            return NextResponse.json({ error: JSON.stringify(beeper_bridge_data) }, { status: 500 })
        }

        const beeper_bridge_response = await beeper_whoami.json()
        beeper_bridges = Object.keys(beeper_bridge_response.user.bridges)

        await new Promise(r => setTimeout(r, 1000))
    }

    return NextResponse.json({ "appName": app_name })
}
