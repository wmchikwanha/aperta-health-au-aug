import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify the caller is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Client with caller's JWT to check admin role
    const callerClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Admin client with service role
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Check caller is admin
    const { data: isAdmin } = await adminClient.rpc("has_role", {
      _user_id: caller.id,
      _role: "admin",
    });

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, target_user_id } = await req.json();

    if (!target_user_id || !action) {
      return new Response(JSON.stringify({ error: "Missing action or target_user_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Prevent self-action
    if (target_user_id === caller.id) {
      return new Response(JSON.stringify({ error: "Cannot perform this action on yourself" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Prevent action on other admins
    const { data: targetIsAdmin } = await adminClient.rpc("has_role", {
      _user_id: target_user_id,
      _role: "admin",
    });

    if (targetIsAdmin) {
      return new Response(JSON.stringify({ error: "Cannot modify another admin" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let result: Record<string, unknown> = {};

    switch (action) {
      case "deactivate": {
        // Ban the user in auth (prevents login)
        const { error } = await adminClient.auth.admin.updateUserById(target_user_id, {
          ban_duration: "876600h", // ~100 years
        });
        if (error) throw error;

        // Log audit event
        await adminClient.from("audit_events").insert({
          actor_id: caller.id,
          actor_role: "admin",
          action: "user_deactivated",
          resource_type: "user_account",
          resource_id: target_user_id,
          description: "User account deactivated by admin",
          outcome: "success",
        });

        result = { success: true, message: "User deactivated" };
        break;
      }

      case "reactivate": {
        // Unban the user
        const { error } = await adminClient.auth.admin.updateUserById(target_user_id, {
          ban_duration: "none",
        });
        if (error) throw error;

        await adminClient.from("audit_events").insert({
          actor_id: caller.id,
          actor_role: "admin",
          action: "user_reactivated",
          resource_type: "user_account",
          resource_id: target_user_id,
          description: "User account reactivated by admin",
          outcome: "success",
        });

        result = { success: true, message: "User reactivated" };
        break;
      }

      case "delete": {
        // Delete the user entirely from auth (cascades to profiles, roles)
        const { error } = await adminClient.auth.admin.deleteUser(target_user_id);
        if (error) throw error;

        await adminClient.from("audit_events").insert({
          actor_id: caller.id,
          actor_role: "admin",
          action: "user_deleted",
          resource_type: "user_account",
          resource_id: target_user_id,
          description: "User account permanently deleted by admin",
          outcome: "success",
        });

        result = { success: true, message: "User deleted" };
        break;
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("admin-manage-user error:", err);
    return new Response(JSON.stringify({ error: err.message || "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
