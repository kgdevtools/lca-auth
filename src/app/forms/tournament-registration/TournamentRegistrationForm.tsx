"use client";
import React, { useState } from "react";
import { registerLcaOpen2025, getAllPlayers } from "./server-actions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Image from "next/image";
import Link from "next/link";
import { HelpCircle, X } from "lucide-react";

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
  gender?: string | null;
  club?: string | null;
  city?: string | null;
}

interface RegistrationResult {
  success?: boolean;
  error?: string;
  player?: PlayerRegistration;
}

// Tooltip component for discount information
function DiscountTooltip() {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="relative inline-block ml-2">
      <button
        type="button"
        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 focus:outline-none"
        onClick={() => setShowTooltip(!showTooltip)}
        aria-label="Discount information"
      >
        <HelpCircle className="h-4 w-4" />
      </button>

      {showTooltip && (
        <div className="absolute z-10 w-64 p-3 mt-2 text-sm text-gray-700 bg-white border border-gray-200 rounded-lg shadow-lg dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600">
          <div className="font-semibold mb-1">Discount Information</div>
          <ul className="list-disc pl-5 space-y-1">
            <li>PCC members get 80% discount</li>
            <li>LCA members get 50% discount</li>
          </ul>
          <div className="mt-2">
            <Link href="/forms/register-player" className="text-blue-600 hover:underline dark:text-blue-400">
              Head over to LCA Registrations
            </Link>
          </div>
          <button
            type="button"
            className="absolute top-1 right-1 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
            onClick={() => setShowTooltip(false)}
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
}

// Modal component for poster preview
function PosterModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative max-w-4xl w-full max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="absolute top-4 right-4 z-10 p-2 bg-white rounded-full shadow-md hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700"
          onClick={onClose}
        >
          <X className="h-5 w-5 text-gray-700 dark:text-gray-300" />
        </button>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden">
          <Image
            src="/IMG-20250921-WA0000.jpg"
            alt="Limpopo Chess Academy Open 2025 Tournament Poster"
            width={800}
            height={1200}
            className="w-full h-auto object-contain"
            priority
          />
        </div>
      </div>
    </div>
  );
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
    gender: "",
    club: "",
    city: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<PlayerRegistration | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [allPlayers, setAllPlayers] = useState<PlayerRegistration[]>([]);
  const [showPosterModal, setShowPosterModal] = useState(false);

  // Handlers
  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
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
    gender: string;
    club: string;
    city: string;
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
        gender: form.gender,
        club: form.club,
        city: form.city,
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
        gender: "",
        club: "",
        city: "",
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
                <div><span className="font-semibold">Gender:</span> {success.gender || '-'}</div>
                <div><span className="font-semibold">Club:</span> {success.club || '-'}</div>
                <div><span className="font-semibold">City/Town/Village:</span> {success.city || '-'}</div>
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
                {["A", "B", "C"].map(section => (
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
    <>
      <PosterModal isOpen={showPosterModal} onClose={() => setShowPosterModal(false)} />

      <form className="max-w-2xl mx-auto bg-white dark:bg-gray-800 border border-border dark:border-gray-700 rounded-xl shadow-lg p-4 md:p-6 space-y-6 mt-8" onSubmit={handleSubmit}>
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <div
              className="relative cursor-pointer group w-full max-w-md mx-auto"
              onClick={() => setShowPosterModal(true)}
            >
              <div className="relative w-full h-12 overflow-hidden rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <Image
                  src="/IMG-20250921-WA0000.jpg"
                  alt="Limpopo Chess Academy Open 2025 Tournament Poster"
                  width={800}
                  height={1200}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <span className="text-white font-medium text-sm">Tournament Poster</span>
                </div>
              </div>
            </div>
          </div>
          <h1 className="text-2xl font-bold dark:text-white">Limpopo Chess Academy Open 2025</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">Tournament Registration Form</p>
        </div>
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="gender">Gender</Label>
                <select
                  id="gender"
                  name="gender"
                  value={form.gender}
                  onChange={handleChange}
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="club">Club</Label>
                <Input
                  id="club"
                  name="club"
                  value={form.club}
                  onChange={handleChange}
                  placeholder="Enter your club name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">City/Town/Village</Label>
                <Input
                  id="city"
                  name="city"
                  value={form.city}
                  onChange={handleChange}
                  placeholder="Enter your city/town/village"
                />
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
          <CardHeader className="flex items-center">
            <CardTitle className="flex items-center">
              Tournament Section
              <DiscountTooltip />
            </CardTitle>
            <CardDescription>Please select your tournament section</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {["A", "B", "C"].map((section) => (
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
                      {section === "A" && (
                        <span><span className="font-bold">R160</span>: Open to all</span>
                      )}
                      {section === "B" && (
                        <span><span className="font-bold">R120</span>: Players rated 1500 and lower</span>
                      )}
                      {section === "C" && (
                        <span><span className="font-bold">R100</span>: Juniors</span>
                      )}
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
    </>
  );
}

