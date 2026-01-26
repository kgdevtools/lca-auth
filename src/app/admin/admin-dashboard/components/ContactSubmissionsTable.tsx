"use client";

import React, { useEffect, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trash2, Check, RefreshCw, X } from "lucide-react";
import { getContactSubmissions, deleteContactSubmission, updateContactSubmissionStatus } from "../server-actions";

interface ContactSubmission {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  subject?: string | null;
  message?: string | null;
  status?: string | null;
  created_at?: string | null;
}

export default function ContactSubmissionsTable() {
  const [submissions, setSubmissions] = useState<ContactSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<ContactSubmission | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const openModal = (s: ContactSubmission) => {
    setSelected(s);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setTimeout(() => setSelected(null), 200);
  };

  useEffect(() => {
    fetchSubmissions();
  }, []);

  async function fetchSubmissions() {
    setLoading(true);
    setError(null);

    try {
      const res = await getContactSubmissions();
      if (res.error) {
        setError(res.error);
      } else {
        setSubmissions((res.data || []) as ContactSubmission[]);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to fetch contact submissions");
    } finally {
      setLoading(false);
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this submission?")) return;
    try {
      const res = await deleteContactSubmission(id);
      if (res.success) {
        if (selected?.id === id) closeModal();
        await fetchSubmissions();
      } else {
        setError(res.error || "Failed to delete submission");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to delete submission");
    }
  };

  const handleMarkResolved = async (id: string) => {
    try {
      const res = await updateContactSubmissionStatus(id, "resolved");
      if (res.success) {
        await fetchSubmissions();
        if (selected?.id === id) setSelected({ ...selected, status: 'resolved' });
      } else {
        setError(res.error || "Failed to update status");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to update status");
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Contact Submissions</CardTitle>
          <CardDescription>Loading contact submissions...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-8 bg-gray-200 dark:bg-gray-700 rounded" />
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
          <CardTitle>Contact Submissions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-red-500">Error: {error}</div>
          <div className="mt-4 flex gap-2">
            <Button onClick={fetchSubmissions} variant="ghost" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" /> Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Contact Submissions</CardTitle>
          <CardDescription>Messages sent via the contact form — newest first</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-2/6">Sender</TableHead>
                  <TableHead className="w-2/6">Contact</TableHead>
                  <TableHead className="w-1/6">Subject</TableHead>
                  <TableHead className="w-2/6">Snippet</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {submissions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-4 text-gray-500 dark:text-gray-400">
                      No contact submissions found.
                    </TableCell>
                  </TableRow>
                ) : (
                  submissions.map((s) => {
                    const isNew = (s.status || 'new') === 'new';
                    return (
                      <TableRow
                        key={s.id}
                        className={`hover:bg-muted cursor-pointer ${isNew ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
                        onClick={() => openModal(s)}
                        role="button"
                        aria-pressed={selected?.id === s.id}
                      >
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-semibold text-sm">{s.name}</span>
                            <span className="text-xs text-muted-foreground">{s.phone || '—'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-sm">{s.email}</span>
                            <span className="text-xs text-muted-foreground truncate">{s.subject || '—'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm font-medium">{s.subject || '-'}</div>
                        </TableCell>
                        <TableCell className="max-w-xl truncate text-sm text-muted-foreground">{s.message || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={isNew ? "default" : "outline"}>
                            {s.status || 'new'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {s.created_at ? new Date(s.created_at).toLocaleString() : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); handleMarkResolved(s.id); }}>
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); handleDelete(s.id); }}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Modal */}
      {modalOpen && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative z-10 w-full max-w-2xl mx-4">
            <div className="bg-background rounded-lg shadow-lg overflow-hidden">
              <div className="flex items-start justify-between p-4 border-b">
                <div className="space-y-1">
                  <h3 className="text-lg font-bold">{selected.name}</h3>
                  <div className="text-sm text-muted-foreground">{selected.email} • {selected.phone || '—'}</div>
                </div>
                <div className="flex items-center gap-2">
                   <Badge variant={selected.status === 'resolved' ? "outline" : "default"}>
                    {selected.status || 'new'}
                  </Badge>
                  <button aria-label="Close" className="p-2 rounded hover:bg-muted" onClick={closeModal}>
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="p-6">
                <div className="mb-4 text-sm text-muted-foreground">Submitted: {selected.created_at ? new Date(selected.created_at).toLocaleString() : '—'}</div>
                <h4 className="text-sm font-medium mb-2">Subject</h4>
                <p className="mb-4 text-base">{selected.subject || '—'}</p>
                <h4 className="text-sm font-medium mb-2">Message</h4>
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{selected.message || '—'}</p>
              </div>
              <div className="flex items-center justify-end gap-2 p-4 border-t">
                <Button variant="ghost" onClick={closeModal}>Close</Button>
                <Button onClick={() => { handleMarkResolved(selected.id); }}>
                  Mark Resolved
                </Button>
                {/* Fixed destructive variant error by using default + custom class */}
                <Button 
                  variant="default" 
                  className="bg-red-600 hover:bg-red-700 text-white border-none"
                  onClick={() => { handleDelete(selected.id); }}
                >
                  Delete
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}