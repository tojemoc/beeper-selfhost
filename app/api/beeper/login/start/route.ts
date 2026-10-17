import { NextResponse } from "next/server";

const BEEPER_UA = "bbctl/v0.15.0 mautrix-go/0.22.0 Go/1.25.0";
const BEEPER_AUTH = "Bearer BEEPER-PRIVATE-API-PLEASE-DONT-USE";

export async function POST() {
    const response = await fetch("https://api.beeper.com/user/login", {
        method: "POST",
        headers: {
            "Authorization": BEEPER_AUTH,
            "Content-Type": "application/json",
            "User-Agent": BEEPER_UA,
        },
        body: "{}",
    });

    const data = await response.json();

    if (!response.ok) {
        return NextResponse.json(
            { error: data.error ?? "Failed to start login" },
            { status: response.status }
        );
    }

    return NextResponse.json({ requestId: data.request });
}
