import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("Function called");
    const body = await req.json();
    console.log("Body received:", JSON.stringify(body));

    const { action } = body;

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    // Verify caller is owner
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user: callingUser },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);

    if (authError || !callingUser) {
      return new Response(
        JSON.stringify({
          error: "Unauthorized: " + (authError?.message || "No user"),
        }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { data: callerData } = await supabaseAdmin
      .from("users")
      .select("role")
      .eq("auth_id", callingUser.id)
      .single();

    if (!callerData || callerData.role !== "owner") {
      return new Response(
        JSON.stringify({
          error:
            "Only owners can manage users. Found role: " + callerData?.role,
        }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // ==================== CREATE USER ====================
    if (!action || action === "create") {
      const { full_name, phone, password, role, email } = body;

      if (!full_name || !phone || !password || !role) {
        return new Response(
          JSON.stringify({ error: "Missing required fields" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      const authEmail = `${phone}@sheetal.auto`;
      console.log("Creating auth user:", authEmail);

      const { data: authData, error: createAuthError } =
        await supabaseAdmin.auth.admin.createUser({
          email: authEmail,
          password: password,
          email_confirm: true,
        });

      if (createAuthError) {
        return new Response(
          JSON.stringify({
            error: "Auth creation failed: " + createAuthError.message,
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      const { data: userData, error: insertError } = await supabaseAdmin
        .from("users")
        .insert([
          {
            full_name,
            phone,
            email: email || null,
            role,
            is_active: true,
            auth_id: authData.user.id,
          },
        ])
        .select()
        .single();

      if (insertError) {
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        return new Response(
          JSON.stringify({
            error: "User insert failed: " + insertError.message,
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      return new Response(JSON.stringify({ success: true, user: userData }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ==================== UPDATE USER ====================
    if (action === "update") {
      const { user_id, full_name, phone, email, password, role } = body;

      if (!user_id) {
        return new Response(
          JSON.stringify({ error: "user_id is required for update" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      // Get current user data to find auth_id and current phone
      const { data: existingUser, error: fetchError } = await supabaseAdmin
        .from("users")
        .select("auth_id, phone")
        .eq("id", user_id)
        .single();

      if (fetchError || !existingUser) {
        return new Response(
          JSON.stringify({
            error: "User not found: " + (fetchError?.message || "No user"),
          }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      // Update Supabase Auth if auth_id exists AND phone or password changed
      if (existingUser.auth_id) {
        const authUpdate = {};

        // If phone changed, update auth email
        if (phone && phone !== existingUser.phone) {
          authUpdate.email = `${phone}@sheetal.auto`;
          console.log("Updating auth email to:", authUpdate.email);
        }

        // If password provided, update auth password
        if (password) {
          authUpdate.password = password;
          console.log("Updating auth password");
        }

        if (Object.keys(authUpdate).length > 0) {
          const { error: authUpdateError } =
            await supabaseAdmin.auth.admin.updateUserById(
              existingUser.auth_id,
              authUpdate,
            );

          if (authUpdateError) {
            return new Response(
              JSON.stringify({
                error: "Auth update failed: " + authUpdateError.message,
              }),
              {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              },
            );
          }
          console.log("Auth updated successfully");
        }
      }

      // Update public.users table
      const updateData = {};
      if (full_name) updateData.full_name = full_name;
      if (phone) updateData.phone = phone;
      if (email !== undefined) updateData.email = email || null;
      if (role) updateData.role = role;

      const { data: updatedUser, error: updateError } = await supabaseAdmin
        .from("users")
        .update(updateData)
        .eq("id", user_id)
        .select()
        .single();

      if (updateError) {
        return new Response(
          JSON.stringify({
            error: "User update failed: " + updateError.message,
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      return new Response(
        JSON.stringify({ success: true, user: updatedUser }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action: " + action }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.log("Caught error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
