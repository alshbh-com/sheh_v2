import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Database } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const fmt = (bytes: number) => {
  if (!bytes) return "0 B";
  const u = ["B", "KB", "MB", "GB"];
  let i = 0; let n = bytes;
  while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(2)} ${u[i]}`;
};

export default function Storage() {
  const navigate = useNavigate();
  const { data, isLoading, error } = useQuery({
    queryKey: ["storage_usage"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_storage_usage");
      if (error) throw error;
      return data as { db_bytes: number; limit_bytes: number; free_bytes: number; used_percent: number };
    },
    refetchInterval: 60000,
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-accent/20 py-8">
      <div className="container mx-auto px-4 max-w-3xl">
        <Button onClick={() => navigate("/admin")} variant="ghost" className="mb-4">
          <ArrowLeft className="ml-2 h-4 w-4" /> رجوع
        </Button>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <Database className="w-6 h-6" />
              </div>
              <div>
                <CardTitle>مساحة التخزين</CardTitle>
                <CardDescription>المساحة المستخدمة من الحصة المجانية (500 ميجا)</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {isLoading && <p className="text-muted-foreground">جاري الحساب...</p>}
            {error && <p className="text-destructive">حدث خطأ في حساب المساحة</p>}
            {data && (
              <>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>المستخدم</span>
                    <span className="font-bold">{fmt(data.db_bytes)} / {fmt(data.limit_bytes)}</span>
                  </div>
                  <Progress value={Math.min(data.used_percent, 100)} />
                  <p className="text-xs text-muted-foreground">{data.used_percent}% مستخدم</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Card className="bg-emerald-50 border-emerald-200">
                    <CardContent className="p-4 text-center">
                      <p className="text-xs text-muted-foreground mb-1">المتبقي</p>
                      <p className="text-2xl font-bold text-emerald-600">{fmt(data.free_bytes)}</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-amber-50 border-amber-200">
                    <CardContent className="p-4 text-center">
                      <p className="text-xs text-muted-foreground mb-1">المستخدم</p>
                      <p className="text-2xl font-bold text-amber-600">{fmt(data.db_bytes)}</p>
                    </CardContent>
                  </Card>
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  * هذه مساحة قاعدة البيانات فقط (Database). مساحة الملفات/الصور تُحسب بشكل منفصل من لوحة Supabase.
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
