"use client";

import { useState } from "react";
import slugify from "slugify";
import dynamic from "next/dynamic";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// ✅ Load react-simple-wysiwyg dynamically (to avoid SSR issues)
const ReactWysiwyg = dynamic(() => import("react-simple-wysiwyg"), {
  ssr: false,
});

export default function NewBlogPage() {
  const [form, setForm] = useState({
    title: "",
    metaTitle: "",
    metaDesc: "",
    slug: "",
    keywords: "",
    content: "",
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
      slug:
        name === "title"
          ? slugify(value, { lower: true, strict: true })
          : prev.slug,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const res = await fetch("/api/blogs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      alert("✅ Blog created successfully!");
      setForm({
        title: "",
        metaTitle: "",
        metaDesc: "",
        slug: "",
        keywords: "",
        content: "",
      });
    } else {
      alert("❌ Error creating blog");
    }

    setLoading(false);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">✍️ Create New Blog</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Title *</Label>
              <Input
                name="title"
                value={form.title}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <Label>Meta Title</Label>
              <Input
                name="metaTitle"
                value={form.metaTitle}
                onChange={handleChange}
              />
            </div>

            <div>
              <Label>Meta Description</Label>
              <textarea
                name="metaDesc"
                value={form.metaDesc}
                onChange={handleChange}
                className="w-full p-2 border rounded"
                rows={3}
              />
            </div>

            <div>
              <Label>Slug *</Label>
              <Input
                name="slug"
                value={form.slug}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <Label>Keywords (comma separated)</Label>
              <Input
                name="keywords"
                value={form.keywords}
                onChange={handleChange}
              />
            </div>

            <div>
              <Label>Content *</Label>
              <div className="border rounded p-2">
                <ReactWysiwyg
                  value={form.content}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, content: e.target.value }))
                  }
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {loading ? "Creating..." : "Create Blog"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
