import { NextResponse } from "next/server";

const BEEPER_UA = "bbctl/v0.15.0 mautrix-go/0.22.0 Go/1.25.0";
const BEEPER_AUTH = "Bearer BEEPER-PRIVATE-API-PLEASE-DONT-USE";

export async function POST(req: Request) {
    const { requestId, email } = (await req.json().catch(() => null)) ?? {};

    if (!requestId || !email) {
        return NextResponse.json(
            { error: "Missing requestId or email" },
            { status: 400 }
        );
    }

    const response = await fetch("https://api.beeper.com/user/login/email", {
        method: "POST",
        headers: {
            "Authorization": BEEPER_AUTH,
            "Content-Type": "application/json",
            "User-Agent": BEEPER_UA,
        },
        body: JSON.stringify({
            request: requestId,
            email,
            appType: "bbctl",
            onlyExistingAccounts: true,
        }),
    });

    if (!response.ok) {
        let error = "Failed to send login email";
        try {
            const data = await response.json();
            error = data.error ?? error;
        } catch {}
        return NextResponse.json({ error }, { status: response.status });
    }

    return NextResponse.json({ success: true });
}
