"use client";

import { Button } from "@/components/ui/button";
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
  Pencil,
  Trash,
  Plane,
  Barcode,
} from "lucide-react";
import { useEffect, useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";

const deleteAwb = async (trackingNumber) => {
  try {
    await axios.delete(`/api/awb/${trackingNumber}`, {
      withCredentials: true,
    });
  } catch (error) {
    console.error("Error Deleting AWB:", error);
  }
};

const ShowName = ({ id }) => {
  const [name, setName] = useState("Loading...");

  useEffect(() => {
    const fetchClient = async () => {
      try {
        const response = await axios.get(`/api/clients/id/${id}`);
        const data = response.data;
        setName(data?.name || "Unknown Client");
      } catch (err) {
        console.error("Error fetching client:", err);
        setName("Error");
      }
    };

    if (id) fetchClient();
  }, [id]);

  return <span>{name}</span>;
};

export const adminColumns = [
  {
    accessorKey: "date",
    header: "Date",
    cell: ({ row }) => {
      const date = row.original.date;
      return (
        <span>
          {date
            ? new Date(date).toLocaleDateString("en-GB")
            : "No date available"}
        </span>
      );
    },
  },
  {
    accessorKey: "invoiceNumber",
    header: ({ column }) => (
      <span
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="flex items-center gap-1 cursor-pointer"
      >
        INV <ArrowUpDown className="ml-2 h-4 w-4" />
      </span>
    ),
  },
  {
    accessorKey: "trackingNumber",
    header: ({ column }) => (
      <span
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="flex items-center gap-1 cursor-pointer"
      >
        Tracking <ArrowUpDown className="ml-2 h-4 w-4" />
      </span>
    ),
  },
  {
    accessorKey: "staffId",
    header: ({ column }) => (
      <span
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="flex items-center gap-1 cursor-pointer"
      >
        Client <ArrowUpDown className="ml-2 h-4 w-4" />
      </span>
    ),
    cell: ({ row }) => {
      const staffId = row.original.staffId;
      return staffId !== "admin" ? <ShowName id={staffId} /> : <span>Admin</span>;
    },
  },
  {
    accessorKey: "country",
    header: "Country",
    cell: ({ row }) => {
      const country = row.original.receiver?.country;
      return <span>{country ? country.slice(0, 20) : "Unknown"}</span>;
    },
  },
  {
    accessorKey: "senderName",
    header: "Sender Name",
    cell: ({ row }) => {
      const senderName = row.original.sender?.name;
      return <span>{senderName ? senderName.slice(0, 20) : "Unknown"}</span>;
    },
  },
  {
    accessorKey: "receiverName",
    header: "Receiver Name",
    cell: ({ row }) => {
      const receiverName = row.original.receiver?.name;
      return <span>{receiverName ? receiverName.slice(0, 20) : "Unknown"}</span>;
    },
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const router = useRouter(); // ✅ FIXED
      const { trackingNumber } = row.original;

      return (
        <div className="flex gap-2">
          <Button
            className="bg-green-800"
            onClick={() => router.push(`/awb/${trackingNumber}`)}
          >
            <Eye className="w-5 h-5" />
          </Button>
          <Button
            className="bg-blue-400"
            onClick={() => router.push(`/shipping-and-label/${trackingNumber}`)}
          >
            <Plane className="w-5 h-5" />
            <Barcode className="w-5 h-5" />
          </Button>
          <Button
            className="bg-blue-800"
            onClick={() => router.push(`/edit-awb/${trackingNumber}`)}
          >
            <Pencil className="w-5 h-5" />
          </Button>
          <Button
            onClick={() => router.push(`/awb/update-track/${trackingNumber}`)}
          >
            <LayoutDashboard className="w-5 h-5" />
          </Button>
          <Button
            onClick={() => router.push(`/shipping-invoice/${trackingNumber}`)}
          >
            <Plane className="w-5 h-5" />
          </Button>
          <Button onClick={() => router.push(`/label/${trackingNumber}`)}>
            <Barcode className="w-5 h-5" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost">
                <Trash className="w-5 h-5 text-red-500" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  Deleting AWB with Tracking Number: <strong>{trackingNumber}</strong> cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deleteAwb(trackingNumber)}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      );
    },
  },
];
