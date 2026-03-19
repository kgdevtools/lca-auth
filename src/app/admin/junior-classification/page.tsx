"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Search,
  Filter,
  Save,
  RotateCcw,
  Download,
  Upload,
  CheckCircle,
  XCircle,
  MapPin,
  Trophy,
  Award,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient } from "@/utils/supabase/client";
import { EditClassificationDialog } from "./components/EditClassificationDialog";

export type TournamentClassification = {
  id?: string;
  tournament_id: string;
  tournament_name: string;
  tournament_date: string | null;
  classification_type: "JUNIOR_QUALIFYING" | "OPEN" | "OTHER";
  is_cdc_accredited: boolean;
  is_capricorn_district: boolean;
  meets_rating_requirement: boolean;
  average_top_rating: number | null;
  field_size: number | null;
  min_rating_threshold: number | null;
  age_groups: string[];
  admin_notes: string | null;
  created_at?: string;
  updated_at?: string;
  classified_by?: string;
};

export type TournamentWithClassification = {
  id: string;
  tournament_name: string;
  date: string | null;
  organizer: string | null;
  location: string | null;
  federation: string | null;
  classification?: TournamentClassification;
};

export default function JuniorClassificationPage() {
  const [tournaments, setTournaments] = useState<
    TournamentWithClassification[]
  >([]);
  const [filteredTournaments, setFilteredTournaments] = useState<
    TournamentWithClassification[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [classificationFilter, setClassificationFilter] = useState("ALL");
  const [locationFilter, setLocationFilter] = useState("ALL");
  const [selectedTournament, setSelectedTournament] =
    useState<TournamentWithClassification | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    classified: 0,
    juniorQualifying: 0,
    open: 0,
    capricorn: 0,
    cdcAccredited: 0,
  });

  // Initialize Supabase client
  const supabase = createClient();

  // Load tournaments and classifications
  const loadData = async () => {
    setLoading(true);
    try {
      // Fetch tournaments
      const { data: tournamentsData, error: tournamentsError } = await supabase
        .from("tournaments")
        .select("id, tournament_name, date, organizer, location, federation")
        .order("date", { ascending: false })
        .limit(200);

      if (tournamentsError) throw tournamentsError;

      // Fetch existing classifications
      const { data: classificationsData, error: classificationsError } =
        await supabase.from("junior_tournament_classifications").select("*");

      if (classificationsError && classificationsError.code !== "PGRST116") {
        // PGRST116 is "no rows returned" - that's okay
        throw classificationsError;
      }

      const classificationsMap = new Map(
        (classificationsData || []).map((c) => [c.tournament_id, c]),
      );

      const tournamentList: TournamentWithClassification[] = (
        tournamentsData || []
      ).map((tournament) => ({
        id: tournament.id,
        tournament_name: tournament.tournament_name,
        date: tournament.date,
        organizer: tournament.organizer,
        location: tournament.location,
        federation: tournament.federation,
        classification: classificationsMap.get(tournament.id),
      }));

      setTournaments(tournamentList);
      setFilteredTournaments(tournamentList);
      updateStats(tournamentList);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Update statistics
  const updateStats = (tournamentList: TournamentWithClassification[]) => {
    const stats = {
      total: tournamentList.length,
      classified: 0,
      juniorQualifying: 0,
      open: 0,
      capricorn: 0,
      cdcAccredited: 0,
    };

    tournamentList.forEach((tournament) => {
      if (tournament.classification) {
        stats.classified++;
        if (
          tournament.classification.classification_type === "JUNIOR_QUALIFYING"
        ) {
          stats.juniorQualifying++;
        } else if (tournament.classification.classification_type === "OPEN") {
          stats.open++;
        }
        if (tournament.classification.is_capricorn_district) {
          stats.capricorn++;
        }
        if (tournament.classification.is_cdc_accredited) {
          stats.cdcAccredited++;
        }
      }
    });

    setStats(stats);
  };

  // Apply filters
  useEffect(() => {
    let filtered = tournaments;

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.tournament_name.toLowerCase().includes(term) ||
          (t.location?.toLowerCase().includes(term) ?? false) ||
          (t.organizer?.toLowerCase().includes(term) ?? false),
      );
    }

    // Apply classification filter
    if (classificationFilter !== "ALL") {
      if (classificationFilter === "UNCLASSIFIED") {
        filtered = filtered.filter((t) => !t.classification);
      } else {
        filtered = filtered.filter(
          (t) => t.classification?.classification_type === classificationFilter,
        );
      }
    }

    // Apply location filter (Capricorn district)
    if (locationFilter !== "ALL") {
      filtered = filtered.filter(
        (t) =>
          (locationFilter === "CAPRICORN" &&
            t.classification?.is_capricorn_district) ||
          (locationFilter === "NON_CAPRICORN" &&
            t.classification &&
            !t.classification.is_capricorn_district),
      );
    }

    setFilteredTournaments(filtered);
    updateStats(filtered);
  }, [searchTerm, classificationFilter, locationFilter, tournaments]);

  // Initial load
  useEffect(() => {
    loadData();
  }, []);

  // Handle classification save
  const handleSaveClassification = async (
    tournamentId: string,
    classification: Partial<TournamentClassification>,
  ) => {
    setSaving(true);
    try {
      // Check if classification exists
      const { data: existing } = await supabase
        .from("junior_tournament_classifications")
        .select("id")
        .eq("tournament_id", tournamentId)
        .single();

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from("junior_tournament_classifications")
          .update({
            ...classification,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);

        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from("junior_tournament_classifications")
          .insert([
            {
              tournament_id: tournamentId,
              ...classification,
            },
          ]);

        if (error) throw error;
      }

      // Refresh data
      await loadData();
      setEditDialogOpen(false);
    } catch (error) {
      console.error("Error saving classification:", error);
      alert("Failed to save classification. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // Handle bulk classification
  const handleBulkClassification = async (
    classification: Partial<TournamentClassification>,
  ) => {
    const selectedIds = filteredTournaments.map((t) => t.id);

    if (!selectedIds.length) {
      alert("No tournaments selected for bulk classification.");
      return;
    }

    if (
      !confirm(`Apply classification to ${selectedIds.length} tournaments?`)
    ) {
      return;
    }

    setSaving(true);
    try {
      // For each tournament, upsert classification
      for (const tournamentId of selectedIds) {
        const { data: existing } = await supabase
          .from("junior_tournament_classifications")
          .select("id")
          .eq("tournament_id", tournamentId)
          .single();

        if (existing) {
          await supabase
            .from("junior_tournament_classifications")
            .update({
              ...classification,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existing.id);
        } else {
          await supabase.from("junior_tournament_classifications").insert([
            {
              tournament_id: tournamentId,
              ...classification,
            },
          ]);
        }
      }

      await loadData();
      setBulkDialogOpen(false);
      alert(`Successfully classified ${selectedIds.length} tournaments.`);
    } catch (error) {
      console.error("Error in bulk classification:", error);
      alert("Failed to apply bulk classification. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // Classification badge component
  const ClassificationBadge = ({
    classification,
  }: {
    classification?: TournamentClassification;
  }) => {
    if (!classification) {
      return (
        <Badge variant="outline" className="bg-gray-100 text-gray-800">
          Unclassified
        </Badge>
      );
    }

    switch (classification.classification_type) {
      case "JUNIOR_QUALIFYING":
        return (
          <Badge className="bg-blue-100 text-blue-800 border-blue-200">
            <Trophy className="h-3 w-3 mr-1" />
            Junior Qualifying
          </Badge>
        );
      case "OPEN":
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            <Award className="h-3 w-3 mr-1" />
            Open
          </Badge>
        );
      default:
        return <Badge variant="outline">Other</Badge>;
    }
  };

  // Edit dialog content
  const renderEditDialog = () => {
    if (!selectedTournament) return null;

    return (
      <EditClassificationDialog
        tournament={selectedTournament}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSave={handleSaveClassification}
        saving={saving}
      />
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
              <p className="text-muted-foreground">
                Loading tournament data...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">
            Junior Tournament Classification
          </h1>
          <p className="text-muted-foreground mt-2">
            Classify tournaments for CDC junior eligibility criteria
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Total Tournaments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Classified</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.classified}</div>
              <p className="text-xs text-muted-foreground">
                {stats.total > 0
                  ? Math.round((stats.classified / stats.total) * 100)
                  : 0}
                %
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Junior Qualifying
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.juniorQualifying}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Open</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.open}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Capricorn</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.capricorn}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                CDC Accredited
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.cdcAccredited}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Actions */}
        <div className="bg-card border rounded-lg p-4 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search tournaments..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Select
                value={classificationFilter}
                onValueChange={setClassificationFilter}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Classification" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Classifications</SelectItem>
                  <SelectItem value="UNCLASSIFIED">Unclassified</SelectItem>
                  <SelectItem value="JUNIOR_QUALIFYING">
                    Junior Qualifying
                  </SelectItem>
                  <SelectItem value="OPEN">Open</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>

              <Select value={locationFilter} onValueChange={setLocationFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Locations</SelectItem>
                  <SelectItem value="CAPRICORN">Capricorn District</SelectItem>
                  <SelectItem value="NON_CAPRICORN">Non-Capricorn</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm("");
                  setClassificationFilter("ALL");
                  setLocationFilter("ALL");
                }}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>

              <Button
                onClick={() => setBulkDialogOpen(true)}
                disabled={filteredTournaments.length === 0}
              >
                <Upload className="h-4 w-4 mr-2" />
                Bulk Classify
              </Button>
            </div>
          </div>
        </div>

        {/* Tournaments Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tournament</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Classification</TableHead>
                    <TableHead>CDC Accredited</TableHead>
                    <TableHead>Capricorn</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTournaments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12">
                        <div className="text-muted-foreground">
                          {tournaments.length === 0
                            ? "No tournaments found"
                            : "No tournaments match your filters"}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTournaments.map((tournament) => (
                      <TableRow key={tournament.id}>
                        <TableCell className="font-medium">
                          {tournament.tournament_name}
                        </TableCell>
                        <TableCell>{tournament.date || "N/A"}</TableCell>
                        <TableCell>{tournament.location || "N/A"}</TableCell>
                        <TableCell>
                          <ClassificationBadge
                            classification={tournament.classification}
                          />
                        </TableCell>
                        <TableCell>
                          {tournament.classification?.is_cdc_accredited ? (
                            <Badge className="bg-green-100 text-green-800">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Yes
                            </Badge>
                          ) : (
                            <Badge variant="outline">No</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {tournament.classification?.is_capricorn_district ? (
                            <Badge className="bg-blue-100 text-blue-800">
                              <MapPin className="h-3 w-3 mr-1" />
                              Yes
                            </Badge>
                          ) : (
                            <Badge variant="outline">No</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedTournament(tournament);
                              setEditDialogOpen(true);
                            }}
                          >
                            Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Pagination Info */}
        <div className="mt-4 text-sm text-muted-foreground">
          Showing {filteredTournaments.length} of {tournaments.length}{" "}
          tournaments
        </div>

        {/* Edit Dialog */}
        {renderEditDialog()}

        {/* Bulk Classification Dialog */}
        <AlertDialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Bulk Classification</AlertDialogTitle>
              <AlertDialogDescription>
                Apply classification to {filteredTournaments.length} tournaments
                matching current filters.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4">
              <div className="space-y-4">
                <div>
                  <Label>Classification Type</Label>
                  <Select defaultValue="JUNIOR_QUALIFYING">
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="JUNIOR_QUALIFYING">
                        Junior Qualifying
                      </SelectItem>
                      <SelectItem value="OPEN">Open Tournament</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>CDC Accredited</Label>
                    <p className="text-sm text-muted-foreground">
                      Apply to all selected
                    </p>
                  </div>
                  <Switch defaultChecked={false} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Capricorn District</Label>
                    <p className="text-sm text-muted-foreground">
                      Apply to all selected
                    </p>
                  </div>
                  <Switch defaultChecked={false} />
                </div>
              </div>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() =>
                  handleBulkClassification({
                    classification_type: "JUNIOR_QUALIFYING",
                    is_cdc_accredited: false,
                    is_capricorn_district: false,
                    meets_rating_requirement: false,
                  })
                }
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Applying...
                  </>
                ) : (
                  "Apply to All"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
