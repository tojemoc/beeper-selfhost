import { useState } from "react";

export default function BridgeInstance({ name, onFly, beeperToken, flyToken, onDelete, onRedeploy }: any) {

    const [deleteInProgress, setDeleteInProgress] = useState(false)
    const [errorMessage, setErrorMessage] = useState("")
    const [redeploying, setRedeploying] = useState(false)

    async function deleteBridge() {
        setDeleteInProgress(true);

        const res = await fetch("/api/delete", {
            method: 'DELETE',
            body: JSON.stringify({ beeperToken: beeperToken, flyToken: flyToken, name: name, onFly: onFly })
        })

        if (res.status === 500) {
            const error_data = await res.json();
            setErrorMessage(error_data.error);
            return;
        }

        setDeleteInProgress(false);
        onDelete();
    }

    async function redeployBridge() {
        setRedeploying(true)

        const res = await fetch("/api/deploy", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                redeploy: true,
                appName: name,
                flyToken: flyToken
            })
        })

        if (res.status !== 200) {
            const error_data = await res.json()
            setErrorMessage(error_data.error)
        }

        setRedeploying(false)
        onRedeploy()
    }

    return (
        <tr>
            <td className="border p-2">
                <p className="p-2">{name}</p>
            </td>

            <td className="border p-2 text-center">
                {onFly && <button className="p-2 rounded-md m-4 bg-gray-600 border-0 text-white hover:bg-gray-500" onClick={() => { navigator.clipboard.writeText(`@${name}bot:beeper.local`) }}>Copy</button>}
            </td>

            <td className="border p-2 text-center">
                {onFly && <a target="_blank" href={`https://fly.io/apps/${name}/monitoring`} rel="noopener noreferrer">View on Fly</a>}
            </td>

            <td className="border p-2 text-center">
                {!deleteInProgress ? (
                    <button className="p-2 rounded-md m-4 bg-red-600 border-0 text-white hover:bg-red-500" onClick={deleteBridge}>Delete</button>
                ) : (
                    <button className="p-2 rounded-md m-4 bg-red-300 border-0 text-white" disabled={true}>Deleting...</button>
                )}
                {errorMessage}
            </td>

            <td className="border p-2 text-center">
                {!redeploying ? (
                    <button className="p-2 rounded-md m-4 bg-blue-600 border-0 text-white hover:bg-blue-500" onClick={redeployBridge}>Redeploy</button>
                ) : (
                    <button className="p-2 rounded-md m-4 bg-blue-300 border-0 text-white" disabled={true}>Redeploying...</button>
                )}
            </td>
        </tr>
    )
}
