import { useState } from "react";

export default function BeeperLogin({ setBeeperToken }: any) {
    const [step, setStep] = useState<"email" | "code">("email");
    const [requestId, setRequestId] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    async function sendLoginEmail(event: any) {
        event.preventDefault();
        setLoading(true);
        setError("");

        const email = event.target[0].value;

        try {
            // Start login session
            const startRes = await fetch("/api/beeper/login/start", {
                method: "POST",
            });
            const startData = await startRes.json();
            if (!startRes.ok) throw new Error(startData.error);

            // Send email code
            const emailRes = await fetch("/api/beeper/login/email", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ requestId: startData.requestId, email }),
            });
            const emailData = await emailRes.json();
            if (!emailRes.ok) throw new Error(emailData.error);

            setRequestId(startData.requestId);
            setStep("code");
        } catch (e: any) {
            setError(e.message ?? "Something went wrong");
        } finally {
            setLoading(false);
        }
    }

    async function verifyCode(event: any) {
        event.preventDefault();
        setLoading(true);
        setError("");

        const code = event.target[0].value;

        try {
            const res = await fetch("/api/beeper/login/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ requestId, code }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            setBeeperToken(data.token);
            window.localStorage.setItem("beeperToken", data.token);
        } catch (e: any) {
            setError(e.message ?? "Something went wrong");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="m-20">
            <p className="text-center text-4xl font-bold">Sign in to Beeper</p>
            <p className="text-center mt-5">
                This will be used to connect your self-hosted bridge to your Beeper
                account. Your credentials are passed directly to Fly.
            </p>

            {step === "email" ? (
                <div className="mx-auto w-72 mt-16">
                    <form onSubmit={sendLoginEmail}>
                        <p>Email:</p>
                        <input
                            className="p-2 border-2 rounded-md w-full"
                            name="email"
                            type="email"
                            required
                        />
                        <button
                            className="p-2 mt-4 rounded-md w-full bg-purple-600 border-0 text-white hover:bg-purple-500 disabled:bg-purple-300"
                            type="submit"
                            disabled={loading}
                        >
                            {loading ? "Sending..." : "Send Login Code"}
                        </button>
                    </form>
                    {error && <p className="mt-3 text-red-600 text-sm">{error}</p>}
                </div>
            ) : (
                <div className="mx-auto w-72 mt-16">
                    <form onSubmit={verifyCode}>
                        <p>{"We've emailed you a login code. Enter it here:"}</p>
                        <input
                            className="p-2 mt-2 border-2 rounded-md w-full"
                            name="code"
                            type="text"
                            inputMode="numeric"
                            placeholder="123 456"
                            autoComplete="one-time-code"
                            required
                        />
                        <button
                            className="p-2 mt-4 rounded-md w-full bg-purple-600 border-0 text-white hover:bg-purple-500 disabled:bg-purple-300"
                            type="submit"
                            disabled={loading}
                        >
                            {loading ? "Verifying..." : "Login"}
                        </button>
                    </form>
                    {error && <p className="mt-3 text-red-600 text-sm">{error}</p>}
                    <button
                        className="mt-3 text-sm text-gray-500 underline"
                        disabled={loading}
                        onClick={() => { setStep("email"); setError(""); }}
                    >
                        Use a different email
                    </button>
                </div>
            )}
        </div>
    );
}
