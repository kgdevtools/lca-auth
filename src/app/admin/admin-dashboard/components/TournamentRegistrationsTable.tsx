// src/app/admin/admin-dashboard/components/TournamentRegistrationsTable.tsx

"use client";

import React, { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getTournamentRegistrations, deleteTournamentRegistration, updateTournamentRegistration, exportRegistrationsToExcelFile } from "../server-actions";
import { Trash2, Edit, FileDown, Download } from "lucide-react";

interface TournamentRegistration {
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

export default function TournamentRegistrationsTable() {
  const [registrations, setRegistrations] = useState<TournamentRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<TournamentRegistration>>({});

  useEffect(() => {
    fetchRegistrations();
  }, []);

  async function fetchRegistrations() {
    setLoading(true);
    setError(null);
    
    try {
      const result = await getTournamentRegistrations();
      if (result.error) {
        setError(result.error);
      } else {
        setRegistrations(result.data || []);
      }
    } catch (err) {
      setError("Failed to fetch tournament registrations");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // Calculate section counts
  const sectionCounts = registrations.reduce((acc: Record<string, number>, player) => {
    acc[player.section] = (acc[player.section] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this registration?")) return;
    
    try {
      const result = await deleteTournamentRegistration(id);
      if (result.success) {
        await fetchRegistrations();
      } else {
        setError(result.error || "Failed to delete registration");
      }
    } catch (err) {
      setError("Failed to delete registration");
      console.error(err);
    }
  };

  const handleEdit = (registration: TournamentRegistration) => {
    setEditingId(registration.id);
    setEditForm({ ...registration });
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    
    try {
      const result = await updateTournamentRegistration(editingId, editForm);
      if (result.success) {
        setEditingId(null);
        setEditForm({});
        await fetchRegistrations();
      } else {
        setError(result.error || "Failed to update registration");
      }
    } catch (err) {
      setError("Failed to update registration");
      console.error(err);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

// src/app/admin/admin-dashboard/components/TournamentRegistrationsTable.tsx

const handleExportToExcel = async () => {
  setExporting(true);
  
  try {
    const result = await exportRegistrationsToExcelFile();
    
    if (result.success && result.data) {
      // Create blob directly from Uint8Array
      const blob = new Blob([result.data], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      
      // Create a download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lca_open_2025_registrations_${new Date().toISOString().split('T')[0]}.xlsx`;
      
      // Trigger the download
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 0);
    } else {
      setError(result.error || "Failed to export to Excel");
    }
  } catch (err) {
    setError("Failed to export to Excel");
    console.error(err);
  } finally {
    setExporting(false);
  }
};


  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tournament Registrations</CardTitle>
          <CardDescription>Loading tournament registration data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tournament Registrations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-red-500">Error: {error}</div>
          <Button onClick={fetchRegistrations} className="mt-4">Retry</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between space-y-2 md:space-y-0">
        <div>
          <CardTitle>Tournament Registrations</CardTitle>
          <CardDescription>Manage player registrations for LCA Open 2025</CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-2">
            {["A", "B", "Junior"].map(section => (
              <Badge key={section} variant="outline">
                {section} Section: {sectionCounts[section] || 0}
              </Badge>
            ))}
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className="flex items-center gap-1" 
            onClick={handleExportToExcel}
            disabled={exporting}
          >
            {exporting ? (
              <>
                <Download className="h-4 w-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <FileDown className="h-4 w-4" />
                Export to Excel
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Section</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>CHESSA ID</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {registrations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-4 text-gray-500 dark:text-gray-400">
                    No registrations found.
                  </TableCell>
                </TableRow>
              ) : (
                registrations.map((registration) => (
                  <TableRow key={registration.id}>
                    <TableCell>
                      {editingId === registration.id ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            name="surname"
                            value={editForm.surname || ""}
                            onChange={handleEditChange}
                            className="w-full p-2 border rounded"
                            placeholder="Surname"
                          />
                          <input
                            type="text"
                            name="names"
                            value={editForm.names || ""}
                            onChange={handleEditChange}
                            className="w-full p-2 border rounded"
                            placeholder="Names"
                          />
                        </div>
                      ) : (
                        <div>
                          <div className="font-medium">{registration.surname}, {registration.names}</div>
                          <div className="text-sm text-gray-500">{registration.emergency_name} ({registration.emergency_phone})</div>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === registration.id ? (
                        <select
                          name="section"
                          value={editForm.section || ""}
                          onChange={handleEditChange}
                          className="w-full p-2 border rounded"
                        >
                          <option value="A">A Section</option>
                          <option value="B">B Section</option>
                          <option value="Junior">Junior Section</option>
                        </select>
                      ) : (
                        <Badge variant="outline">{registration.section}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === registration.id ? (
                        <input
                          type="number"
                          name="rating"
                          value={editForm.rating || ""}
                          onChange={handleEditChange}
                          className="w-full p-2 border rounded"
                          placeholder="Rating"
                        />
                      ) : (
                        registration.rating || 'Unrated'
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === registration.id ? (
                        <input
                          type="text"
                          name="chessa_id"
                          value={editForm.chessa_id || ""}
                          onChange={handleEditChange}
                          className="w-full p-2 border rounded"
                          placeholder="CHESSA ID"
                        />
                      ) : (
                        registration.chessa_id || '-'
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === registration.id ? (
                        <input
                          type="text"
                          name="phone"
                          value={editForm.phone || ""}
                          onChange={handleEditChange}
                          className="w-full p-2 border rounded"
                          placeholder="Phone"
                        />
                      ) : (
                        registration.phone
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {editingId === registration.id ? (
                        <div className="flex justify-end space-x-2">
                          <Button size="sm" onClick={handleSaveEdit}>Save</Button>
                          <Button size="sm" variant="outline" onClick={handleCancelEdit}>Cancel</Button>
                        </div>
                      ) : (
                        <div className="flex justify-end space-x-2">
                          <Button size="sm" variant="outline" onClick={() => handleEdit(registration)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleDelete(registration.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}