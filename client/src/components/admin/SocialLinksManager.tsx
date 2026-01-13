import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api";

type SocialLinks = {
  instagram: string;
  facebook: string;
  x: string;
};

export default function SocialLinksManager() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [links, setLinks] = useState<SocialLinks>({ instagram: "", facebook: "", x: "" });

  useEffect(() => {
    const fetchLinks = async () => {
      try {
        const res = await apiFetch("/api/site-settings/social-links");
        const data = await res.json();
        setLinks({
          instagram: data?.socialLinks?.instagram || "",
          facebook: data?.socialLinks?.facebook || "",
          x: data?.socialLinks?.x || "",
        });
      } catch {
        toast({
          title: "Error",
          description: "Failed to load social links.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchLinks();
  }, [toast]);

  const validateUrlOrEmpty = (value: string) => {
    const v = value.trim();
    if (!v) return true;
    try {
      const url = new URL(v);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  };

  const handleSave = async () => {
    if (!validateUrlOrEmpty(links.instagram) || !validateUrlOrEmpty(links.facebook) || !validateUrlOrEmpty(links.x)) {
      toast({
        title: "Invalid URL",
        description: "Please use full URLs starting with https:// (or leave blank).",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const res = await apiFetch("/api/site-settings/social-links", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instagram: links.instagram,
          facebook: links.facebook,
          x: links.x,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || "Save failed");
      }

      const data = await res.json();
      setLinks({
        instagram: data?.socialLinks?.instagram || "",
        facebook: data?.socialLinks?.facebook || "",
        x: data?.socialLinks?.x || "",
      });

      toast({
        title: "Saved",
        description: "Social links updated.",
      });
    } catch (e) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Failed to save social links.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="border shadow-sm">
      <CardHeader>
        <CardTitle>Social Media Links</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Loading...</div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="instagram">Instagram URL</Label>
              <Input
                id="instagram"
                placeholder="https://instagram.com/yourpage"
                value={links.instagram}
                onChange={(e) => setLinks((p) => ({ ...p, instagram: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="facebook">Facebook URL</Label>
              <Input
                id="facebook"
                placeholder="https://facebook.com/yourpage"
                value={links.facebook}
                onChange={(e) => setLinks((p) => ({ ...p, facebook: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="x">X (Twitter) URL</Label>
              <Input
                id="x"
                placeholder="https://x.com/yourpage"
                value={links.x}
                onChange={(e) => setLinks((p) => ({ ...p, x: e.target.value }))}
              />
            </div>

            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? "Saving..." : "Save Links"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
