"use client";

import { useState, useEffect } from "react";
import {
  Search,
  Plus,
  Edit,
  Trash2,
  UserCheck,
  UserX,
  Shield,
  Star,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { useToast } from "@/components/ui/use-toast";
import { Person } from "@/types";

interface PeopleTabProps {
  onRefresh: () => void;
}

export default function PeopleTab({ onRefresh }: PeopleTabProps) {
  const [people, setPeople] = useState<Person[]>([]);
  const [filteredPeople, setFilteredPeople] = useState<Person[]>([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    isSoldier: true,
    isCommander: false,
    isOfficer: false,
    isActive: true,
    notes: "",
    blockedDates: "",
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchPeople();
  }, []);

  useEffect(() => {
    filterPeople();
  }, [people, search, roleFilter, statusFilter]);

  const fetchPeople = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/people?includeBlocked=true&activeOnly=false");
      const data = await response.json();
      if (data.success) {
        setPeople(data.data);
      }
    } catch (error) {
      toast({
        title: "שגיאה",
        description: "נכשל בטעינת רשימת האנשים",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filterPeople = () => {
    let filtered = [...people];

    if (search) {
      filtered = filtered.filter((p) =>
        p.name.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (roleFilter !== "all") {
      filtered = filtered.filter((p) => {
        if (roleFilter === "soldier") return p.isSoldier;
        if (roleFilter === "commander") return p.isCommander;
        if (roleFilter === "officer") return p.isOfficer;
        return true;
      });
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((p) =>
        statusFilter === "active" ? p.isActive : !p.isActive
      );
    }

    setFilteredPeople(filtered);
  };

  const openDialog = (person?: Person) => {
    if (person) {
      setSelectedPerson(person);
      setFormData({
        name: person.name,
        isSoldier: person.isSoldier,
        isCommander: person.isCommander,
        isOfficer: person.isOfficer,
        isActive: person.isActive,
        notes: person.notes || "",
        blockedDates: person.blockedDates?.map((b) => b.date).join("\n") || "",
      });
    } else {
      setSelectedPerson(null);
      setFormData({
        name: "",
        isSoldier: true,
        isCommander: false,
        isOfficer: false,
        isActive: true,
        notes: "",
        blockedDates: "",
      });
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "שגיאה",
        description: "יש להזין שם",
        variant: "destructive",
      });
      return;
    }

    const blockedDates = formData.blockedDates
      .split("\n")
      .map((d) => d.trim())
      .filter((d) => d && /^\d{4}-\d{2}-\d{2}$/.test(d));

    try {
      const url = selectedPerson
        ? `/api/people/${selectedPerson.id}`
        : "/api/people";
      const method = selectedPerson ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          blockedDates,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: selectedPerson ? "עודכן בהצלחה" : "נוסף בהצלחה",
          description: `${formData.name} ${selectedPerson ? "עודכן" : "נוסף"} למערכת`,
        });
        setIsDialogOpen(false);
        fetchPeople();
        onRefresh();
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast({
        title: "שגיאה",
        description: "נכשל בשמירת הנתונים",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!selectedPerson) return;

    try {
      const response = await fetch(`/api/people/${selectedPerson.id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "נמחק בהצלחה",
          description: `${selectedPerson.name} הוסר מהמערכת`,
        });
        setIsDeleteDialogOpen(false);
        setSelectedPerson(null);
        fetchPeople();
        onRefresh();
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast({
        title: "שגיאה",
        description: "נכשל במחיקה",
        variant: "destructive",
      });
    }
  };

  const getRoleBadges = (person: Person) => {
    const badges = [];
    if (person.isSoldier) {
      badges.push(
        <Badge key="soldier" variant="secondary" className="gap-1">
          <UserCheck className="h-3 w-3" />
          חייל
        </Badge>
      );
    }
    if (person.isCommander) {
      badges.push(
        <Badge key="commander" variant="default" className="gap-1">
          <Shield className="h-3 w-3" />
          מפקד
        </Badge>
      );
    }
    if (person.isOfficer) {
      badges.push(
        <Badge key="officer" variant="warning" className="gap-1">
          <Star className="h-3 w-3" />
          קצין
        </Badge>
      );
    }
    return badges;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            ניהול אנשים
          </CardTitle>
          <Button onClick={() => openDialog()} className="gap-2">
            <Plus className="h-4 w-4" />
            הוסף אדם
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="חיפוש לפי שם..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-10"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
            >
              <option value="all">כל התפקידים</option>
              <option value="soldier">חיילים</option>
              <option value="commander">מפקדים</option>
              <option value="officer">קצינים</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
            >
              <option value="all">כל הסטטוסים</option>
              <option value="active">פעילים</option>
              <option value="inactive">לא פעילים</option>
            </select>
          </div>
        </div>

        {/* People List */}
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">טוען...</div>
        ) : filteredPeople.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            לא נמצאו אנשים
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredPeople.map((person) => (
              <div
                key={person.id}
                className={`p-4 rounded-lg border transition-all hover:shadow-md ${
                  person.isActive
                    ? "bg-card"
                    : "bg-muted/50 opacity-70"
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold">{person.name}</h3>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {getRoleBadges(person)}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openDialog(person)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setSelectedPerson(person);
                        setIsDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                {person.blockedDates && person.blockedDates.length > 0 && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                    <Calendar className="h-3 w-3" />
                    {person.blockedDates.length} תאריכים חסומים
                  </div>
                )}
                {person.notes && (
                  <p className="text-xs text-muted-foreground mt-1 truncate">
                    {person.notes}
                  </p>
                )}
                {!person.isActive && (
                  <Badge variant="outline" className="mt-2">
                    <UserX className="h-3 w-3 ml-1" />
                    לא פעיל
                  </Badge>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Add/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {selectedPerson ? "עריכת אדם" : "הוספת אדם חדש"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>שם מלא</Label>
                <Input
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="הזן שם מלא"
                />
              </div>

              <div className="space-y-3">
                <Label>תפקידים</Label>
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="soldier"
                      checked={formData.isSoldier}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, isSoldier: !!checked })
                      }
                    />
                    <Label htmlFor="soldier" className="cursor-pointer">
                      חייל תורן
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="commander"
                      checked={formData.isCommander}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, isCommander: !!checked })
                      }
                    />
                    <Label htmlFor="commander" className="cursor-pointer">
                      מפקד תורן
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="officer"
                      checked={formData.isOfficer}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, isOfficer: !!checked })
                      }
                    />
                    <Label htmlFor="officer" className="cursor-pointer">
                      קצין תורן
                    </Label>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Label>פעיל</Label>
                <Switch
                  checked={formData.isActive}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isActive: checked })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>תאריכים חסומים (שורה לכל תאריך, פורמט YYYY-MM-DD)</Label>
                <Textarea
                  value={formData.blockedDates}
                  onChange={(e) =>
                    setFormData({ ...formData, blockedDates: e.target.value })
                  }
                  placeholder="2024-01-15&#10;2024-01-20"
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label>הערות</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder="הערות נוספות..."
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                ביטול
              </Button>
              <Button onClick={handleSave}>שמור</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>האם למחוק את {selectedPerson?.name}?</AlertDialogTitle>
              <AlertDialogDescription>
                פעולה זו תמחק את האדם וכל השיבוצים שלו. לא ניתן לבטל פעולה זו.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>ביטול</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive">
                מחק
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
