import { connectToDB } from "@/app/_utils/mongodb";
import Blog from "@/models/Blog";

export default async function handler(req, res) {
  await connectDB();
  
  const { id } = req.query;
  
  switch (req.method) {
    case "GET":
      try {
        const blog = await Blog.findById(id);
        if (!blog) {
          return res.status(404).json({ message: "Blog not found" });
        }
        res.status(200).json(blog);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
      break;
      
    case "PUT":
      try {
        const { title, metaTitle, metaDesc, slug, keywords, content } = req.body;
        
        const updatedBlog = await Blog.findByIdAndUpdate(
          id,
          {
            title,
            metaTitle,
            metaDesc,
            slug,
            keywords: keywords ? keywords.split(",").map(k => k.trim()) : [],
            content,
          },
          { new: true, runValidators: true }
        );
        
        if (!updatedBlog) {
          return res.status(404).json({ message: "Blog not found" });
        }
        
        res.status(200).json(updatedBlog);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
      break;
      
    case "DELETE":
      try {
        const deletedBlog = await Blog.findByIdAndDelete(id);
        if (!deletedBlog) {
          return res.status(404).json({ message: "Blog not found" });
        }
        res.status(200).json({ message: "Blog deleted successfully" });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
      break;
      
    default:
      res.setHeader("Allow", ["GET", "PUT", "DELETE"]);
      res.status(405).json({ message: `Method ${req.method} Not Allowed` });
  }
}