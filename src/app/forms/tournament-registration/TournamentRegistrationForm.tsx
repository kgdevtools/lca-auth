"use client";
import React, { useState, useEffect } from "react";
import { registerLcaOpen2025, getAllPlayers } from "./server-actions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface PlayerRegistration {
  id: string;
  surname: string;
  names: string;
  section: string;
  chessa_id: string | null;
  federation: string | null;
  rating: number | null;
  sex: string | null;
  created_at: string;
  phone: string;
  dob: string;
  emergency_name: string;
  emergency_phone: string;
  comments?: string;
}

interface RegistrationResult {
  success?: boolean;
  error?: string;
  player?: PlayerRegistration;
}

export default function TournamentRegistrationForm() {
  // Form state
  const [form, setForm] = useState({
    surname: "",
    names: "",
    phone: "",
    dob: "",
    chessaId: "",
    rating: "",
    section: "",
    emergencyName: "",
    emergencyPhone: "",
    comments: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<PlayerRegistration | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [allPlayers, setAllPlayers] = useState<PlayerRegistration[]>([]);

  // Handlers
  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  }

  function handleSectionSelect(section: string) {
    setForm(f => ({ ...f, section }));
  }

  type FormFields = {
    surname: string;
    names: string;
    phone: string;
    dob: string;
    chessaId: string;
    rating: string;
    section: string;
    emergencyName: string;
    emergencyPhone: string;
    comments: string;
  };

  function validate(form: FormFields) {
    const errors: Record<string, string> = {};
    if (!form.surname.trim()) errors.surname = "Surname is required.";
    if (!form.names.trim()) errors.names = "Name(s) is required.";
    if (!form.phone.trim()) errors.phone = "Phone number is required.";
    else if (!/^\d{8,}$/.test(form.phone.replace(/[^\d]/g, ""))) errors.phone = "Enter a valid phone number.";
    if (!form.dob) errors.dob = "Date of birth is required.";
    if (!form.section) errors.section = "Please select a section.";
    if (!form.emergencyName.trim()) errors.emergencyName = "Emergency contact name is required.";
    if (!form.emergencyPhone.trim()) errors.emergencyPhone = "Emergency contact phone is required.";
    else if (!/^\d{8,}$/.test(form.emergencyPhone.replace(/[^\d]/g, ""))) errors.emergencyPhone = "Enter a valid phone number.";
    return errors;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    const errors = validate(form);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setSubmitting(true);

    try {
      const result: RegistrationResult = await registerLcaOpen2025({
        surname: form.surname,
        names: form.names,
        phone: form.phone,
        dob: form.dob,
        chessaId: form.chessaId,
        rating: form.rating,
        section: form.section,
        emergencyName: form.emergencyName,
        emergencyPhone: form.emergencyPhone,
        comments: form.comments,
      });

      if (result?.error) {
        setError(result.error);
        setSubmitting(false);
        return;
      }

      if (!result?.success || !result?.player) {
        setError("Registration failed. Please try again.");
        setSubmitting(false);
        return;
      }

      // On successful registration, fetch all players
      const allPlayersData = await getAllPlayers();

      setAllPlayers(allPlayersData);
      setSuccess(result.player);
      
      // Reset form
      setForm({
        surname: "",
        names: "",
        phone: "",
        dob: "",
        chessaId: "",
        rating: "",
        section: "",
        emergencyName: "",
        emergencyPhone: "",
        comments: "",
      });
    } catch (error) {
      console.error("Form submission error:", error);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    // Calculate section counts from all players
    const sectionCounts = allPlayers.reduce((acc: Record<string, number>, player) => {
      acc[player.section] = (acc[player.section] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return (
      <div className="max-w-5xl mx-auto bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-700 rounded-lg p-8 mt-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-extrabold mb-2 text-green-800 dark:text-green-400">Registration Successful!</h2>
          <p className="mb-4 text-green-900 dark:text-green-100 text-lg">Thank you for registering for the Limpopo Chess Academy Open 2025.</p>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Player Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1 text-sm md:text-base">
                <div><span className="font-semibold">Surname:</span> {success.surname}</div>
                <div><span className="font-semibold">Name(s):</span> {success.names}</div>
                <div><span className="font-semibold">Section:</span> {success.section}</div>
                <div><span className="font-semibold">Phone:</span> {success.phone}</div>
                <div><span className="font-semibold">Date of Birth:</span> {success.dob}</div>
                <div><span className="font-semibold">Chessa ID:</span> {success.chessa_id || '-'}</div>
                <div><span className="font-semibold">Rating:</span> {success.rating || '-'}</div>
                <div><span className="font-semibold">Emergency Contact:</span> {success.emergency_name} ({success.emergency_phone})</div>
                <div className="col-span-2"><span className="font-semibold">Comments:</span> {success.comments || '-'}</div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="space-y-8">
          {/* All Players Summary */}
          <Card>
            <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between space-y-2 md:space-y-0">
              <div>
                <CardTitle>Tournament Registration Overview</CardTitle>
                <CardDescription>Current registration status across all sections</CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                {["A", "B", "Junior"].map(section => (
                  <Badge key={section} variant={success.section === section ? "default" : "outline"}>
                    {section} Section: {sectionCounts[section] || 0}
                  </Badge>
                ))}
              </div>
            </CardHeader>
            
            <CardContent>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead className="text-center">Section</TableHead>
                      <TableHead className="text-center">Rating</TableHead>
                      <TableHead className="text-center hidden md:table-cell">CHESSA ID</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allPlayers.map((player, index) => (
                      <TableRow key={player.id} className={player.id === success.id ? "bg-blue-50 dark:bg-blue-900/20" : ""}>
                        <TableCell className="font-medium">{index + 1}</TableCell>
                        <TableCell>
                          {player.surname}, {player.names}
                          {player.id === success.id && (
                            <Badge variant="secondary" className="ml-2">You</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline">{player.section}</Badge>
                        </TableCell>
                        <TableCell className="text-center">{player.rating || 'Unrated'}</TableCell>
                        <TableCell className="text-center hidden md:table-cell">{player.chessa_id || '-'}</TableCell>
                      </TableRow>
                    ))}
                    {allPlayers.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-4 text-gray-500 dark:text-gray-400">
                          No players registered yet.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Alert>
            <AlertDescription className="text-center">
              Official tournament pairings will be posted on chess-results.com when available.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <form className="max-w-2xl mx-auto bg-white dark:bg-gray-800 border border-border dark:border-gray-700 rounded-xl shadow-lg p-4 md:p-8 space-y-8 mt-8" onSubmit={handleSubmit}>
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold dark:text-white">Limpopo Chess Academy Open 2025</h1>
        <p className="text-gray-600 dark:text-gray-300 mt-2">Tournament Registration Form</p>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
          <div className="text-red-800 dark:text-red-200 font-medium">Error</div>
          <div className="text-red-700 dark:text-red-300 mt-1">{error}</div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>Please provide your personal details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="surname">Surname *</Label>
              <Input
                id="surname"
                name="surname"
                value={form.surname}
                onChange={handleChange}
                placeholder="Enter your surname"
                className={fieldErrors.surname ? "border-red-500" : ""}
              />
              {fieldErrors.surname && <p className="text-red-500 text-sm">{fieldErrors.surname}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="names">Name(s) *</Label>
              <Input
                id="names"
                name="names"
                value={form.names}
                onChange={handleChange}
                placeholder="Enter your name(s)"
                className={fieldErrors.names ? "border-red-500" : ""}
              />
              {fieldErrors.names && <p className="text-red-500 text-sm">{fieldErrors.names}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number *</Label>
              <Input
                id="phone"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="Enter your phone number"
                className={fieldErrors.phone ? "border-red-500" : ""}
              />
              {fieldErrors.phone && <p className="text-red-500 text-sm">{fieldErrors.phone}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="dob">Date of Birth *</Label>
              <Input
                id="dob"
                name="dob"
                type="date"
                value={form.dob}
                onChange={handleChange}
                className={fieldErrors.dob ? "border-red-500" : ""}
              />
              {fieldErrors.dob && <p className="text-red-500 text-sm">{fieldErrors.dob}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="chessaId">CHESSA ID</Label>
              <Input
                id="chessaId"
                name="chessaId"
                value={form.chessaId}
                onChange={handleChange}
                placeholder="Enter your CHESSA ID (if available)"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rating">Current Rating</Label>
              <Input
                id="rating"
                name="rating"
                value={form.rating}
                onChange={handleChange}
                placeholder="Enter your current rating (if available)"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tournament Section</CardTitle>
          <CardDescription>Please select your tournament section</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {["A", "B", "Junior"].map((section) => (
                <div
                  key={section}
                  onClick={() => handleSectionSelect(section)}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    form.section === section
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                      : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
                  }`}
                >
                  <div className="font-medium">{section} Section</div>
                  <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                    {section === "A" && "Open to all players"}
                    {section === "B" && "For players rated 1430 and below"}
                    {section === "Junior" && "For players 14 years and younger"}
                  </div>
                </div>
              ))}
            </div>
            {fieldErrors.section && <p className="text-red-500 text-sm">{fieldErrors.section}</p>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Emergency Contact</CardTitle>
          <CardDescription>Please provide emergency contact information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="emergencyName">Emergency Contact Name *</Label>
              <Input
                id="emergencyName"
                name="emergencyName"
                value={form.emergencyName}
                onChange={handleChange}
                placeholder="Enter emergency contact name"
                className={fieldErrors.emergencyName ? "border-red-500" : ""}
              />
              {fieldErrors.emergencyName && <p className="text-red-500 text-sm">{fieldErrors.emergencyName}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="emergencyPhone">Emergency Contact Phone *</Label>
              <Input
                id="emergencyPhone"
                name="emergencyPhone"
                value={form.emergencyPhone}
                onChange={handleChange}
                placeholder="Enter emergency contact phone"
                className={fieldErrors.emergencyPhone ? "border-red-500" : ""}
              />
              {fieldErrors.emergencyPhone && <p className="text-red-500 text-sm">{fieldErrors.emergencyPhone}</p>}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Additional Information</CardTitle>
          <CardDescription>Any additional comments or special requirements</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="comments">Comments</Label>
            <Textarea
              id="comments"
              name="comments"
              value={form.comments}
              onChange={handleChange}
              placeholder="Enter any additional comments or special requirements"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-center">
        <Button type="submit" disabled={submitting} className="w-full md:w-auto">
          {submitting ? "Registering..." : "Register for Tournament"}
        </Button>
      </div>
    </form>
  );
}