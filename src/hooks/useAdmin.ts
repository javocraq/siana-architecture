import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AdminState = {
  loading: boolean;
  user: User | null;
  isAdmin: boolean;
};

export function useAdmin(): AdminState {
  const [state, setState] = useState<AdminState>({ loading: true, user: null, isAdmin: false });

  useEffect(() => {
    let mounted = true;

    const checkRole = async (user: User | null) => {
      if (!user) {
        if (mounted) setState({ loading: false, user: null, isAdmin: false });
        return;
      }
      const { data } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
      if (mounted) setState({ loading: false, user, isAdmin: !!data });
    };

    // Set listener BEFORE getSession
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      // Defer the role check to avoid deadlocks
      setTimeout(() => checkRole(session?.user ?? null), 0);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      checkRole(session?.user ?? null);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return state;
}
