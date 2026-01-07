"use server";
import { createClient } from "@/utils/supabase/server";

export type PlayerRegistrationData = {
  firstName: string;
  lastName: string;
  dob: string;
  parentName?: string;
  parentContact?: string;
  emergencyContact: string;
  emergencyPhone: string;
  experience: "beginner" | "intermediate" | "advanced";
  fideId?: string;
  chessSaId?: string;
  rating?: number;
  comments?: string;
  selectedProgram?: "polokwane" | "limpopo" | "both";
  lessonType?: "physical" | "online" | "both";
};

export async function registerPlayer(formData: PlayerRegistrationData) {
  try {
    const supabase = await createClient();
    
    // Map form data to database columns (camelCase to snake_case)
    const registrationData = {
      first_name: formData.firstName,
      last_name: formData.lastName,
      date_of_birth: formData.dob,
      parent_name: formData.parentName || null,
      parent_contact: formData.parentContact || null,
      emergency_contact: formData.emergencyContact,
      emergency_phone: formData.emergencyPhone,
      experience: formData.experience,
      fide_id: formData.fideId || null,
      chesssa_id: formData.chessSaId || null,
      rating: formData.rating || null,
      comments: formData.comments || null,
      selected_program: formData.selectedProgram || null,
      lesson_type: formData.lessonType || null,
      status: 'pending'
    };

    const { error, data } = await supabase
      .from("lca_pcc_registrations")
      .insert([registrationData])
      .select()
      .single();

    if (error) {
      console.error('Registration error:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to submit registration' 
      };
    }

    return { 
      success: true, 
      data: data,
      message: 'Registration submitted successfully!' 
    };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { 
      success: false, 
      error: 'An unexpected error occurred. Please try again.' 
    };
  }
}
