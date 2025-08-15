"use server"

import { createClient } from "@/utils/supabase/server"

type Experience = "beginner" | "intermediate" | "advanced"

export type RegisterPlayerInput = {
  firstName: string
  lastName: string
  dob: string
  parentName?: string
  parentContact?: string
  emergencyContact: string
  emergencyPhone: string
  experience: Experience
  fideId?: string
  chessSaId?: string
  rating?: number
  comments?: string
}

function validate(input: RegisterPlayerInput) {
  const required: Array<keyof RegisterPlayerInput> = [
    "firstName",
    "lastName",
    "dob",
    "emergencyContact",
    "emergencyPhone",
    "experience",
  ]
  for (const key of required) {
    const value = input[key]
    if (value === undefined || value === null || String(value).trim() === "") {
      throw new Error(`Missing required field: ${key}`)
    }
  }
  if (!["beginner", "intermediate", "advanced"].includes(input.experience)) {
    throw new Error("Invalid experience level")
  }
}

export async function registerPlayer(input: RegisterPlayerInput) {
  validate(input)
  const supabase = await createClient()

  const { error } = await supabase
    .from("playerRegistrations")
    .insert({ data_entry: input })

  if (error) {
    throw new Error(error.message)
  }
}



