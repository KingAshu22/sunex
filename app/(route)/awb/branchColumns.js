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
        let data = null;

        // Try franchise API
        try {
          const franchiseRes = await axios.get(`/api/franchises/${id}`);
          data = franchiseRes.data;
        } catch (err) {
          if (err.response && err.response.status === 404) {
            // If 404, fallback to clients API
            try {
              const clientRes = await axios.get(`/api/clients/${id}`);
              data = clientRes.data[0];
            } catch (clientErr) {
              if (clientErr.response && clientErr.response.status === 404) {
                setName("Error"); // not found in both
                return;
              } else {
                throw clientErr; // other error from clients API
              }
            }
          } else {
            throw err; // other error from franchises API
          }
        }

        setName(data?.companyName || data?.firmName.slice(0, 10) || data?.name || "Unknown Client");
      } catch (err) {
        console.error("Error fetching client:", err);
        setName("Error");
      }
    };

    if (id) fetchClient();
  }, [id]);

  return <span>{name}</span>;
};

export const branchColumns = [
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
    cell: ({ row }) => {
      const trackingNumber = row.original.trackingNumber;
      const hasForwardingInfo =
        row.original?.forwardingNumber?.length > 0 &&
        row.original?.forwardingLink?.length > 0;

      const handleClick = () => {
        window.location.href = `/awb/${trackingNumber}`;
      };

      return (
        <span
          className={`cursor-pointer ${hasForwardingInfo ? "text-black" : "text-red-500"}`}
          onClick={handleClick}
        >
          {trackingNumber}
        </span>
      );
    },
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
      const refCode = row.original.refCode;
      return refCode ? <ShowName id={refCode} /> : <span>Unknown</span>;
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
    accessorKey: "service",
    header: "Service",
    cell: ({ row }) => {
      const service = row.original?.rateInfo?.courier;
      return <span>{service}</span>;
    },
  },
  {
    accessorKey: "Weight",
    header: "Weight",
    cell: ({ row }) => {
      const weight = row.original?.boxes[0]?.chargeableWeight;
      return <span>{weight}</span>;
    },
  },
  {
    accessorKey: "Dim",
    header: "Dimensions",
    cell: ({ row }) => {
      const length = row.original?.boxes[0]?.length;
      const breadth = row.original?.boxes[0]?.breadth;
      const height = row.original?.boxes[0]?.height
      return <span>{length}x{breadth}x{height}</span>;
    },
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const router = useRouter();
      const { trackingNumber } = row.original;

      return (
        <div className="flex gap-2">
          <Button
            className="bg-blue-400"
            onClick={() => router.push(`/shipping-and-label/${trackingNumber}`)}
          >
            Docs
            <Barcode className="w-5 h-5" />
          </Button>
          <Button
            className="bg-blue-800"
            onClick={() => router.push(`/edit-awb/${trackingNumber}`)}
          >
            Edit
          </Button>
          <Button
            onClick={() => router.push(`/awb/update-track/${trackingNumber}`)}
          >
            Update
          </Button>
        </div>
      );
    },
  },
];
