import { NextResponse } from "next/server";

export async function POST(req: Request) {
    const { beeperToken } = await req.json();

    if (!beeperToken) {
        return NextResponse.json({ error: "Missing beeperToken" }, { status: 400 });
    }

    const response = await fetch("https://matrix.beeper.com/_matrix/client/v3/logout", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${beeperToken}`,
            "Content-Type": "application/json",
        },
    });

    if (!response.ok) {
        let details = "";
        try {
            details = JSON.stringify(await response.json());
        } catch {
            details = await response.text();
        }

        return NextResponse.json(
            { error: "Failed to logout from Beeper API", details },
            { status: response.status }
        );
    }

    return NextResponse.json({ success: true });
}
