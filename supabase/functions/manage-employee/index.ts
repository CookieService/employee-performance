import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Employee = {
  id: string;
  auth_user_id: string | null;
  name: string;
  role: "admin" | "employee";
  status: "active" | "inactive";
  deleted_at: string | null;
};

function json(status: number, payload: Record<string, unknown>) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });
}

function getAdminKey() {
  const legacyKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (legacyKey) return legacyKey;

  const secretKeys = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (secretKeys) {
    const parsed = JSON.parse(secretKeys);
    if (parsed.default) return parsed.default;
  }

  throw new Error("服务端管理密钥未配置");
}

async function assertAnotherActiveAdmin(
  supabaseAdmin: ReturnType<typeof createClient>,
  employeeId: string,
) {
  const { count, error } = await supabaseAdmin
    .from("employees")
    .select("id", { count: "exact", head: true })
    .eq("role", "admin")
    .eq("status", "active")
    .is("deleted_at", null)
    .neq("id", employeeId);

  if (error) throw error;
  if (!count) throw new Error("不能停用或删除最后一个在职管理员");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") return json(405, { error: "仅支持 POST 请求" });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    if (!supabaseUrl) throw new Error("SUPABASE_URL 未配置");

    const authorization = req.headers.get("Authorization");
    const token = authorization?.replace(/^Bearer\s+/i, "");
    if (!token) return json(401, { error: "请先登录" });

    const supabaseAdmin = createClient(supabaseUrl, getAdminKey(), {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: authData, error: authError } =
      await supabaseAdmin.auth.getUser(token);
    if (authError || !authData.user) return json(401, { error: "登录已失效，请重新登录" });

    const { data: operator, error: operatorError } = await supabaseAdmin
      .from("employees")
      .select("id,auth_user_id,name,role,status,deleted_at")
      .eq("auth_user_id", authData.user.id)
      .maybeSingle<Employee>();

    if (operatorError) throw operatorError;
    if (
      !operator ||
      operator.role !== "admin" ||
      operator.status !== "active" ||
      operator.deleted_at
    ) {
      return json(403, { error: "只有在职管理员可以管理员工账号" });
    }

    const body = await req.json();
    const action = String(body?.action || "");
    const employeeId = String(body?.employee_id || "");
    if (!employeeId) return json(400, { error: "缺少员工编号" });

    const { data: target, error: targetError } = await supabaseAdmin
      .from("employees")
      .select("id,auth_user_id,name,role,status,deleted_at")
      .eq("id", employeeId)
      .maybeSingle<Employee>();

    if (targetError) throw targetError;
    if (!target || target.deleted_at) return json(404, { error: "员工账号不存在或已删除" });
    if (target.id === operator.id) return json(400, { error: "不能管理自己的账号" });

    if (action === "set_status") {
      const status = body?.status;
      if (status !== "active" && status !== "inactive") {
        return json(400, { error: "账号状态无效" });
      }
      if (target.role === "admin" && status === "inactive") {
        await assertAnotherActiveAdmin(supabaseAdmin, target.id);
      }

      const { error } = await supabaseAdmin
        .from("employees")
        .update({ status })
        .eq("id", target.id)
        .is("deleted_at", null);
      if (error) throw error;

      return json(200, {
        message: status === "active" ? "账号已恢复" : "账号已停用",
      });
    }

    if (action === "reset_password") {
      const newPassword = String(body?.new_password || "");
      if (newPassword.length < 6) return json(400, { error: "新密码至少需要 6 位" });
      if (!target.auth_user_id) return json(400, { error: "该员工没有可用的登录账号" });

      const { error } = await supabaseAdmin.auth.admin.updateUserById(
        target.auth_user_id,
        { password: newPassword },
      );
      if (error) throw error;
      return json(200, { message: "密码重置成功" });
    }

    if (action === "delete_account") {
      if (target.role === "admin") {
        await assertAnotherActiveAdmin(supabaseAdmin, target.id);
      }

      const deletedAt = new Date().toISOString();
      const { error: archiveError } = await supabaseAdmin
        .from("employees")
        .update({ status: "inactive", deleted_at: deletedAt })
        .eq("id", target.id)
        .is("deleted_at", null);
      if (archiveError) throw archiveError;

      if (target.auth_user_id) {
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(
          target.auth_user_id,
          true,
        );
        if (deleteError) {
          await supabaseAdmin
            .from("employees")
            .update({ status: target.status, deleted_at: null })
            .eq("id", target.id);
          throw deleteError;
        }
      }

      return json(200, {
        message: "登录账号已删除，历史业务记录已保留",
      });
    }

    return json(400, { error: "不支持的账号管理操作" });
  } catch (error) {
    console.error(error);
    return json(500, {
      error: error instanceof Error ? error.message : "账号管理操作失败",
    });
  }
});
