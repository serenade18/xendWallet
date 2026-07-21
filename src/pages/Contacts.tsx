import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useContacts } from "@/hooks/useContacts";
import { Users, Plus, Pencil, Trash2, Search, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";

const Contacts = () => {
  const { user, signOut } = useAuth();
  const { contacts, loading, addContact, deleteContact, updateContact } = useContacts(user?.id);

  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const filtered = contacts.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = async () => {
    if (!name.trim() || !email.trim()) return;
    try {
      await addContact(name, email);
      toast.success("Contact added!");
      setName("");
      setEmail("");
      setShowAdd(false);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleUpdate = async (id: string) => {
    if (!name.trim() || !email.trim()) return;
    try {
      await updateContact(id, name, email);
      toast.success("Contact updated!");
      setEditId(null);
      setName("");
      setEmail("");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (id: string, contactName: string) => {
    await deleteContact(id);
    toast.success(`${contactName} removed`);
  };

  const startEdit = (c: { id: string; name: string; email: string }) => {
    setEditId(c.id);
    setName(c.name);
    setEmail(c.email);
    setShowAdd(false);
  };

  const cancelEdit = () => {
    setEditId(null);
    setName("");
    setEmail("");
  };

  return (
    <div className="min-h-[100dvh] bg-background pb-20 md:pb-8">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 h-64 w-[90vw] max-w-[500px] rounded-full bg-primary/6 blur-[80px]" />
      </div>

      <AppHeader onSignOut={signOut} />

      <main className="relative z-10 mx-auto max-w-lg px-4 py-4 space-y-4">
        {/* Search + Add */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search contacts…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10 bg-secondary/30 border-border/40"
            />
          </div>
          <Button
            onClick={() => { setShowAdd(!showAdd); cancelEdit(); }}
            size="sm"
            className="h-10 px-3"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Add form */}
        {showAdd && (
          <div className="rounded-xl border border-border/60 bg-card/80 p-4 space-y-3 animate-slide-up">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">New Contact</p>
            <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} className="h-10 bg-secondary/30 border-border/40" />
            <Input placeholder="Email address" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-10 bg-secondary/30 border-border/40" />
            <div className="flex gap-2">
              <Button onClick={handleAdd} size="sm" className="flex-1"><Check className="h-3.5 w-3.5 mr-1.5" /> Save</Button>
              <Button variant="ghost" size="sm" onClick={() => { setShowAdd(false); setName(""); setEmail(""); }}><X className="h-3.5 w-3.5" /></Button>
            </div>
          </div>
        )}

        {/* Contact list */}
        <div className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm overflow-hidden">
          {loading ? (
            <div className="divide-y divide-border/30">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3">
                  <div className="h-10 w-10 rounded-full bg-muted animate-pulse shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 w-24 rounded bg-muted animate-pulse" />
                    <div className="h-3 w-32 rounded bg-muted animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 px-4">
              <Users className="mx-auto h-8 w-8 text-muted-foreground/20 mb-3" />
              <p className="text-sm text-muted-foreground">{search ? "No contacts match your search" : "No contacts yet"}</p>
              <p className="text-xs text-muted-foreground/60 mt-1">{search ? "Try a different search term" : "Add contacts to quickly send money"}</p>
            </div>
          ) : (
            <div className="divide-y divide-border/30">
              {filtered.map((c) => {
                const isEditing = editId === c.id;
                return (
                  <div key={c.id} className="px-4 py-3 hover:bg-secondary/20 transition-colors">
                    {isEditing ? (
                      <div className="space-y-2 animate-slide-up">
                        <Input value={name} onChange={(e) => setName(e.target.value)} className="h-9 bg-secondary/30 border-border/40 text-sm" placeholder="Name" />
                        <Input value={email} onChange={(e) => setEmail(e.target.value)} className="h-9 bg-secondary/30 border-border/40 text-sm" placeholder="Email" />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleUpdate(c.id)} className="h-8 text-xs flex-1"><Check className="h-3 w-3 mr-1" /> Save</Button>
                          <Button variant="ghost" size="sm" onClick={cancelEdit} className="h-8 text-xs"><X className="h-3 w-3" /></Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <div className="shrink-0 h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-xs font-bold text-primary uppercase">{c.name.slice(0, 2)}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{c.name}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{c.email}</p>
                        </div>
                        <div className="flex gap-0.5 shrink-0">
                          <Button variant="ghost" size="sm" onClick={() => startEdit(c)} className="h-8 w-8 p-0 text-muted-foreground hover:text-primary"><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(c.id, c.name)} className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default Contacts;
