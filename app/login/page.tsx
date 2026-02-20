"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useDb } from "@/components/DbProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KeyRound, Lock, ArrowRight } from "lucide-react";

export default function LoginPage() {
    const { authenticate, authError, isNewDatabase, isAuthenticated } = useDb();
    const router = useRouter();
    const [password, setPassword] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isAuthenticated) {
            router.push("/");
        }
    }, [isAuthenticated, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!password) return;

        setIsSubmitting(true);
        await authenticate(password);
        setIsSubmitting(false);
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-4 dark:bg-black">
            <div className="w-full max-w-md overflow-hidden rounded-3xl border border-zinc-200 bg-white p-8 shadow-xl dark:border-zinc-800 dark:bg-zinc-950">
                <div className="mb-8 flex flex-col items-center justify-center text-center">
                    <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-900">
                        {isNewDatabase ? (
                            <KeyRound className="h-8 w-8 text-zinc-900 dark:text-zinc-50" />
                        ) : (
                            <Lock className="h-8 w-8 text-zinc-900 dark:text-zinc-50" />
                        )}
                    </div>
                    <h1 className="font-display text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                        {isNewDatabase ? "Welcome to IB Life" : "Welcome back"}
                    </h1>
                    <p className="mt-2 font-sans text-sm text-zinc-500 dark:text-zinc-400">
                        {isNewDatabase
                            ? "Create a secure master password. This will encrypt your database offline forever. Do not lose it."
                            : "Enter your master password to decrypt your offline database and access your planner."}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                        <Input
                            type="password"
                            placeholder="Master Password"
                            className="h-12 border-zinc-200 bg-zinc-50 font-sans text-base shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={isSubmitting}
                            autoFocus
                        />
                    </div>

                    {authError && (
                        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-400">
                            {authError}
                        </div>
                    )}

                    <Button
                        type="submit"
                        size="lg"
                        className="mt-2 h-12 rounded-xl font-bold shadow-md transition-all hover:-translate-y-0.5"
                        disabled={!password || isSubmitting}
                    >
                        {isSubmitting ? "Decrypting..." : isNewDatabase ? "Create & Encrypt" : "Unlock Planner"}
                        <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                </form>

                <div className="mt-8 text-center">
                    <p className="font-sans text-[10px] uppercase tracking-widest text-zinc-400">
                        Secure offline AES-GCM Encrypted Database
                    </p>
                </div>
            </div>
        </div>
    );
}
