import { NextResponse } from "next/server";

const BEEPER_UA = "bbctl/v0.15.0 mautrix-go/0.22.0 Go/1.25.0";
const BEEPER_AUTH = "Bearer BEEPER-PRIVATE-API-PLEASE-DONT-USE";

export async function POST(req: Request) {
    const { requestId, code } = await req.json();

    if (!requestId || !code) {
        return NextResponse.json(
            { error: "Missing requestId or code" },
            { status: 400 }
        );
    }

    // Exchange the email code for a JWT login token
    const codeResponse = await fetch("https://api.beeper.com/user/login/response", {
        method: "POST",
        headers: {
            "Authorization": BEEPER_AUTH,
            "Content-Type": "application/json",
            "User-Agent": BEEPER_UA,
        },
        body: JSON.stringify({
            request: requestId,
            response: code.replace(/\s+/g, ""),
            appType: "bbctl",
            onlyExistingAccounts: true,
        }),
    });

    const codeData = await codeResponse.json();

    if (!codeResponse.ok) {
        const retries = codeData.retries;
        const message =
            retries !== undefined
                ? `Invalid code (${retries} retries left)`
                : codeData.error ?? "Failed to verify code";
        return NextResponse.json({ error: message }, { status: codeResponse.status });
    }

    // Exchange the JWT for a Matrix access token
    const matrixResponse = await fetch(
        "https://matrix.beeper.com/_matrix/client/v3/login",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "User-Agent": BEEPER_UA,
            },
            body: JSON.stringify({
                type: "org.matrix.login.jwt",
                initial_device_display_name: "Beeper Bridge Self-Host",
                token: codeData.token,
            }),
        }
    );

    const matrixData = await matrixResponse.json();

    if (!matrixResponse.ok) {
        return NextResponse.json(
            { error: matrixData.error ?? "Failed to get Matrix token" },
            { status: matrixResponse.status }
        );
    }

    return NextResponse.json({ token: matrixData.access_token });
}
