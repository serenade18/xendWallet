import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Contact {
  id: string;
  name: string;
  email: string;
  created_at: string;
}

export function useContacts(userId: string | undefined) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchContacts = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data } = await supabase
      .from("contacts")
      .select("id, name, email, created_at")
      .eq("user_id", userId)
      .order("name");
    setContacts((data as Contact[]) ?? []);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const addContact = async (name: string, email: string) => {
    if (!userId) throw new Error("Not authenticated");
    const { error } = await supabase
      .from("contacts")
      .insert({ user_id: userId, name: name.trim(), email: email.trim().toLowerCase() });
    if (error) {
      if (error.code === "23505") throw new Error("Contact already exists");
      throw new Error(error.message);
    }
    await fetchContacts();
  };

  const deleteContact = async (id: string) => {
    if (!userId) return;
    await supabase.from("contacts").delete().eq("id", id);
    await fetchContacts();
  };

  const updateContact = async (id: string, name: string, email: string) => {
    if (!userId) return;
    await supabase
      .from("contacts")
      .update({ name: name.trim(), email: email.trim().toLowerCase() })
      .eq("id", id);
    await fetchContacts();
  };

  return { contacts, loading, addContact, deleteContact, updateContact, refresh: fetchContacts };
}
