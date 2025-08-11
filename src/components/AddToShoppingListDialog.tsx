import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface RecipeForAdd {
  id: string;
  title: string;
  ingredients: string[] | null;
}

interface ShoppingList { id: string; name: string }

export const AddToShoppingListDialog = ({ recipe }: { recipe: RecipeForAdd }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [newListName, setNewListName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    (async () => {
      const { data, error } = await supabase
        .from("shopping_lists")
        .select("id,name")
        .order("created_at", { ascending: true });
      if (!error && data) {
        setLists(data);
        if (data.length > 0) setSelectedListId(data[0].id);
      }
    })();
  }, [open, user]);

  const ingredientNames = useMemo(() => (recipe.ingredients || []).filter(Boolean), [recipe.ingredients]);

  const onConfirm = async () => {
    if (!user) {
      toast({ title: "Sign in required", description: "Please sign in to add items.", variant: "destructive" });
      return;
    }
    if (ingredientNames.length === 0) {
      toast({ title: "No ingredients", description: "This recipe has no ingredients to add." });
      return;
    }

    setIsSaving(true);
    try {
      let listId = selectedListId;
      if (!listId) {
        const name = newListName.trim() || "My Shopping List";
        const { data, error } = await supabase
          .from("shopping_lists")
          .insert({ user_id: user.id, name })
          .select("id")
          .single();
        if (error) throw error;
        listId = data.id;
      }

      const payload = ingredientNames.map((name) => ({
        user_id: user.id,
        list_id: listId!,
        recipe_id: recipe.id,
        name,
      }));

      const { error: insertErr } = await supabase
        .from("shopping_list_items")
        .insert(payload);
      if (insertErr) throw insertErr;

      toast({ title: "Added to list", description: `Added ${ingredientNames.length} item(s) to your list.` });
      setOpen(false);
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to add items", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="warm" size="sm">Add to Shopping List</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add ingredients to a list</DialogTitle>
          <DialogDescription>
            Choose an existing list or create a new one to add all ingredients from "{recipe.title}".
          </DialogDescription>
        </DialogHeader>
        {lists.length > 0 && (
          <div className="space-y-2">
            <Label>Existing lists</Label>
            <Select value={selectedListId || undefined} onValueChange={setSelectedListId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a list" />
              </SelectTrigger>
              <SelectContent>
                {lists.map((l) => (
                  <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="space-y-2">
          <Label>Create new</Label>
          <Input placeholder="New list name (optional)" value={newListName} onChange={(e) => setNewListName(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={onConfirm} disabled={isSaving}>
            {isSaving ? "Adding..." : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
