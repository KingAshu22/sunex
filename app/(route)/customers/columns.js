import { Button } from "@/components/ui/button";
import { ColumnDef } from "@tanstack/react-table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ArrowUpDown,
  Eye,
  LayoutDashboard,
  MoreHorizontal,
  Pencil,
  Trash,
} from "lucide-react";
import axios from "axios";
import { useEffect, useState } from "react";

const deleteClient = async (code) => {
  try {
    await axios.delete(
      `/api/customer/${code}`,
      { withCredentials: true }
    );
  } catch (error) {
    console.error("Error Deleting AWB:", error);
  }
};

const ShowName = ({ id }) => {
  const [name, setName] = useState("");

  useEffect(() => {
    const fetchClient = async () => {
      console.log(`Fetching client data for ID: ${id}`);
      try {
        const response = await axios.get(`/api/clients/id/${id}`);
        const data = response.data;
        if (data) {
          setName(data.name);
        } else {
          setName("Unknown Client");
        }
      } catch (err) {
        console.error("Error fetching client:", err);
        setName("Error");
      }
    };

    fetchClient();
  }, [id]);

  return <span>{name}</span>;
};

export const columns = [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <span
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="flex items-center gap-1"
      >
        Name
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </span>
    ),
  },
  {
    accessorKey: "contact",
    header: ({ column }) => (
      <span
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="flex items-center gap-1"
      >
        Contact
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </span>
    ),
  },
  {
    accessorKey: "owner",
    header: ({ column }) => (
      <span
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="flex items-center gap-1 cursor-pointer"
      >
        Owner <ArrowUpDown className="ml-2 h-4 w-4" />
      </span>
    ),
    cell: ({ row }) => {
      const owner = row.original.owner;
      return owner !== "admin" ? (
        <ShowName id={owner} />
      ) : (
        <span>Admin</span>
      );
    },
  },
  {
    accessorKey: "country",
    header: ({ column }) => (
      <span
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="flex items-center gap-1"
      >
        Country
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </span>
    ),
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const { _id, name } = row.original;
      return (
        <div className="flex flex-rows gap-2">
          <Button
            className="px-2 py-1 bg-blue-800"
            onClick={() => window.open(`/customers/edit/${_id}`)}
          >
            <Pencil className="w-[20px] h-[20px]" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger className="bg-primary rounded-lg px-2 py-1 text-white">
              <Trash className="w-[20px] h-[20px]" />
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete {name} and remove data completely from the servers.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    deleteClient(_id);
                  }}
                >
                  Continue
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      );
    },
  },
];
