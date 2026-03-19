"use client";

import * as React from "react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Save, Loader2 } from "lucide-react";
import type {
  TournamentClassification,
  TournamentWithClassification,
} from "../page";

interface EditClassificationDialogProps {
  tournament: TournamentWithClassification;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (
    tournamentId: string,
    classification: Partial<TournamentClassification>,
  ) => Promise<void>;
  saving: boolean;
}

export function EditClassificationDialog({
  tournament,
  open,
  onOpenChange,
  onSave,
  saving,
}: EditClassificationDialogProps) {
  const [classification, setClassification] = useState({
    classification_type:
      tournament.classification?.classification_type || "OTHER",
    is_cdc_accredited: tournament.classification?.is_cdc_accredited || false,
    is_capricorn_district:
      tournament.classification?.is_capricorn_district || false,
    meets_rating_requirement:
      tournament.classification?.meets_rating_requirement || false,
    average_top_rating: tournament.classification?.average_top_rating || null,
    min_rating_threshold:
      tournament.classification?.min_rating_threshold || null,
    age_groups: tournament.classification?.age_groups || [],
    admin_notes: tournament.classification?.admin_notes || "",
  });

  const handleSave = async () => {
    await onSave(tournament.id, classification);
  };

  const toggleAgeGroup = (ageGroup: string) => {
    const newGroups = classification.age_groups.includes(ageGroup)
      ? classification.age_groups.filter((g: string) => g !== ageGroup)
      : [...classification.age_groups, ageGroup];
    setClassification({ ...classification, age_groups: newGroups });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Classify Tournament</DialogTitle>
          <DialogDescription>
            {tournament.tournament_name} • {tournament.date || "No date"}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium mb-2">Tournament Details</h3>
              <div className="space-y-2 text-sm">
                <p>
                  <span className="font-medium">Organizer:</span>{" "}
                  {tournament.organizer || "N/A"}
                </p>
                <p>
                  <span className="font-medium">Location:</span>{" "}
                  {tournament.location || "N/A"}
                </p>
                <p>
                  <span className="font-medium">Federation:</span>{" "}
                  {tournament.federation || "N/A"}
                </p>
              </div>
            </div>

            {/* Classification Type */}
            <div>
              <Label className="mb-2 block">Classification Type *</Label>
              <Select
                value={classification.classification_type}
                onValueChange={(value: any) =>
                  setClassification({
                    ...classification,
                    classification_type: value,
                  })
                }
              >
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

            {/* CDC Accreditation */}
            <div className="flex items-center justify-between">
              <div>
                <Label className="mb-1 block">CDC Accredited</Label>
                <p className="text-sm text-muted-foreground">
                  Officially recognized by CDC
                </p>
              </div>
              <Switch
                checked={classification.is_cdc_accredited}
                onCheckedChange={(checked) =>
                  setClassification({
                    ...classification,
                    is_cdc_accredited: checked,
                  })
                }
              />
            </div>

            {/* Capricorn District */}
            <div className="flex items-center justify-between">
              <div>
                <Label className="mb-1 block">Capricorn District</Label>
                <p className="text-sm text-muted-foreground">
                  Played in Capricorn District
                </p>
              </div>
              <Switch
                checked={classification.is_capricorn_district}
                onCheckedChange={(checked) =>
                  setClassification({
                    ...classification,
                    is_capricorn_district: checked,
                  })
                }
              />
            </div>
          </div>

          {/* Rating Requirements */}
          <div className="space-y-4">
            {/* Meets Rating Requirement */}
            <div className="flex items-center justify-between">
              <div>
                <Label className="mb-1 block">Meets Rating Requirement</Label>
                <p className="text-sm text-muted-foreground">
                  Tournament meets minimum rating standards
                </p>
              </div>
              <Switch
                checked={classification.meets_rating_requirement}
                onCheckedChange={(checked) =>
                  setClassification({
                    ...classification,
                    meets_rating_requirement: checked,
                  })
                }
              />
            </div>

            {/* Average Top Rating */}
            <div>
              <Label className="mb-2 block">Average Top Rating</Label>
              <Input
                type="number"
                placeholder="e.g., 1450"
                value={classification.average_top_rating || ""}
                onChange={(e) =>
                  setClassification({
                    ...classification,
                    average_top_rating: e.target.value
                      ? Number(e.target.value)
                      : null,
                  })
                }
              />
            </div>

            {/* Minimum Rating Threshold */}
            <div>
              <Label className="mb-2 block">Minimum Rating Threshold</Label>
              <Select
                value={classification.min_rating_threshold?.toString() || ""}
                onValueChange={(value) =>
                  setClassification({
                    ...classification,
                    min_rating_threshold: value ? Number(value) : null,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select threshold" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1200">1200 (U8-U12)</SelectItem>
                  <SelectItem value="1400">1400 (U14-U20)</SelectItem>
                  <SelectItem value="1600">1600 (Advanced)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Age Groups */}
            <div>
              <Label className="mb-2 block">Age Groups</Label>
              <div className="grid grid-cols-3 gap-2">
                {["U10", "U12", "U14", "U16", "U18", "U20"].map((ageGroup) => (
                  <Button
                    key={ageGroup}
                    type="button"
                    variant={
                      classification.age_groups.includes(ageGroup)
                        ? "default"
                        : "outline"
                    }
                    size="sm"
                    onClick={() => toggleAgeGroup(ageGroup)}
                  >
                    {ageGroup}
                  </Button>
                ))}
              </div>
            </div>

            {/* Admin Notes */}
            <div>
              <Label className="mb-2 block">Admin Notes</Label>
              <textarea
                className="w-full min-h-[100px] p-2 border rounded-md text-sm"
                placeholder="Add any notes or comments about this classification..."
                value={classification.admin_notes}
                onChange={(e) =>
                  setClassification({
                    ...classification,
                    admin_notes: e.target.value,
                  })
                }
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Classification
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
