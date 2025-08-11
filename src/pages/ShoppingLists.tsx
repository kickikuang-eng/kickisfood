import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ShoppingList { id: string; name: string }
interface ShoppingItem {
  id: string;
  list_id: string;
  user_id: string;
  recipe_id: string | null;
  name: string;
  quantity: number | null;
  unit: string | null;
  notes: string | null;
  checked: boolean;
  created_at: string;
}

const normalizeName = (s: string) => s.toLowerCase().trim().replace(/\s+/g, " ");

const ShoppingLists = () => {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [currentListId, setCurrentListId] = useState<string | null>(null);
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [newListName, setNewListName] = useState("");
  const [newItemName, setNewItemName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // SEO meta
    document.title = "Shopping Lists | Kickisfood";
    const desc = "Manage your shopping lists and combine ingredients from recipes.";
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "description");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", desc);
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = `${window.location.origin}/shopping`;
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      window.location.href = "/auth";
    }
  }, [user, loading]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data, error } = await supabase
        .from("shopping_lists")
        .select("id,name")
        .order("created_at", { ascending: true });
      if (error) {
        toast({ title: "Error", description: "Failed to load lists", variant: "destructive" });
        return;
      }
      setLists(data || []);
      if (data && data.length > 0) {
        setCurrentListId((id) => id || data[0].id);
      }
    })();
  }, [user]);

  useEffect(() => {
    if (!currentListId) return;
    (async () => {
      const { data, error } = await supabase
        .from("shopping_list_items")
        .select("*")
        .eq("list_id", currentListId)
        .order("created_at", { ascending: true });
      if (error) {
        toast({ title: "Error", description: "Failed to load items", variant: "destructive" });
        return;
      }
      setItems(data || []);
    })();
  }, [currentListId]);

  const grouped = useMemo(() => {
    const map = new Map<string, { name: string; ids: string[]; checked: boolean; count: number }>();
    for (const it of items) {
      const key = normalizeName(it.name);
      const entry = map.get(key) || { name: it.name, ids: [], checked: true, count: 0 };
      entry.ids.push(it.id);
      entry.checked = entry.checked && it.checked;
      entry.count += 1;
      map.set(key, entry);
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [items]);

  const createList = async () => {
    if (!user || !newListName.trim()) return;
    setSaving(true);
    const { data, error } = await supabase
      .from("shopping_lists")
      .insert({ user_id: user.id, name: newListName.trim() })
      .select("id,name")
      .single();
    setSaving(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    setLists((prev) => [...prev, data]);
    setCurrentListId(data.id);
    setNewListName("");
    toast({ title: "List created", description: `Created ${data.name}` });
  };

  const addItem = async () => {
    if (!user || !currentListId || !newItemName.trim()) return;
    const name = newItemName.trim();
    setNewItemName("");
    const { data, error } = await supabase
      .from("shopping_list_items")
      .insert({ user_id: user.id, list_id: currentListId, name })
      .select('*')
      .single();
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    setItems((prev) => [...prev, data as ShoppingItem]);
  };

  const toggleGroup = async (ids: string[], next: boolean) => {
    if (!ids.length) return;
    setItems((prev) => prev.map((i) => (ids.includes(i.id) ? { ...i, checked: next } : i)));
    const { error } = await supabase
      .from("shopping_list_items")
      .update({ checked: next })
      .in("id", ids);
    if (error) {
      toast({ title: "Error", description: "Failed to update items", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-6 py-8 max-w-4xl">
        <h1 className="sr-only">Shopping Lists</h1>
        <section aria-labelledby="lists-heading" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle id="lists-heading">Manage Lists</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div className="md:col-span-2">
                  <label className="text-sm font-medium mb-2 block">Active list</label>
                  <Select value={currentListId || undefined} onValueChange={setCurrentListId}>
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
                <div className="flex gap-2">
                  <Input
                    placeholder="New list name"
                    value={newListName}
                    onChange={(e) => setNewListName(e.target.value)}
                  />
                  <Button variant="warm" onClick={createList} disabled={saving || !newListName.trim()}>
                    Create
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Items</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Add an item (e.g., 2 tomatoes)"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') addItem(); }}
                />
                <Button onClick={addItem} disabled={!newItemName.trim()}>Add</Button>
              </div>
              <Separator />
              <ul className="space-y-3">
                {grouped.length === 0 ? (
                  <p className="text-muted-foreground">No items yet. Add some or use "Add to Shopping List" on a recipe.</p>
                ) : (
                  grouped.map((g) => (
                    <li key={g.ids[0]} className="flex items-center gap-3">
                      <Checkbox checked={g.checked} onCheckedChange={(v) => toggleGroup(g.ids, Boolean(v))} />
                      <span className="flex-1">
                        {g.name}
                        {g.count > 1 && <span className="text-muted-foreground"> ×{g.count}</span>}
                      </span>
                    </li>
                  ))
                )}
              </ul>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
};

export default ShoppingLists;
