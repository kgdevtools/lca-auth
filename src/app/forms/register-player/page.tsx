"use client";
import PlayerRegistrationForm from "./PlayerRegistrationForm";
import * as React from "react";
import { Alert } from "@/components/ui/alert";

export default function RegisterPlayerPage() {
  const [success, setSuccess] = React.useState(false);
  return (
    <div className="mx-auto max-w-2xl p-4">
      <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tighter text-center mb-4">Player Registration</h1>
      {success ? (
        <Alert>Registration successful!</Alert>
      ) : (
        <PlayerRegistrationForm onSuccess={() => setSuccess(true)} />
      )}
    </div>
  );
}
