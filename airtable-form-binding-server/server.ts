import dotenv from "dotenv";
dotenv.config();
import express from "express";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import axios from "axios";

const dns = require("dns");
dns.setDefaultResultOrder("ipv4first");

const PORT = process.env.PORT || 3001;

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.FRONTEND_URL,
    credentials: true,
  },
});
axios.defaults.proxy = false;
app.use(express.json());

let airtableConfig: {
  baseId: string;
  tableId: string;
  viewId?: string;
  recordId: string;
};

io.on("connection", (socket) => {
  console.log("Client connected: ", socket.id);

  socket.on("setConfig", (config) => {
    airtableConfig = config;
    console.log("Airtable configuration received :", airtableConfig);

    socket.on("joinRoom", async (recordId: string) => {
      socket.join(recordId);
      console.log(`Client ${socket.id} joined room ${recordId}`);

      await fetchRecordData(recordId, (data) => {
        socket.emit("recordData", data);
      });
    });

    socket.on("update", async (data) => {
      const { recordId, fields } = data;
      try {
        const response = await axios.patch(
          `https://api.airtable.com/v0/${airtableConfig.baseId}/${airtableConfig.tableId}/${recordId}`,
          { fields },
          {
            headers: {
              Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
            },
          }
        );
        if (response) {
          console.log(
            `Response from update recordID : ${recordId} in Airtable`
          );
          io.to(recordId).emit("update", fields);
        }
      } catch (error: any) {
        console.log(`Error updating Airtable record: ${error.message}`);
      }
    });
  });
  socket.on("disconnect", () => {
    console.log(`Client disconnected: ${socket.id} `);
  });
});
const fetchRecordData = async (
  recordId: string,
  callback: (data: any) => void
) => {
  try {
    const tableResponse = await axios.get(
      `https://api.airtable.com/v0/meta/bases/${airtableConfig.baseId}/tables`,
      {
        headers: {
          Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
        },
      }
    );

    const table = tableResponse.data.tables.find(
      (table: any) => table.id === airtableConfig.tableId
    );

    if (!table) {
      throw new Error("Table not found");
    }

    const recordResponse = await axios.get(
      `https://api.airtable.com/v0/${airtableConfig.baseId}/${airtableConfig.tableId}/${recordId}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
        },
      }
    );

    const recordFields = recordResponse.data.fields;

    let jsonSchema: any = {
      title: table.name,
      type: "object",
      properties: {},
    };

    let uiSchema: any = {};

    table.fields.forEach((field: any) => {
      switch (field.type) {
        case "singleCollaborator":
          jsonSchema.properties[field.name] = {
            type: "object",
            properties: {
              id: { type: "string" },
              email: { type: "string" },
              name: { type: "string" },
              permissionLevel: {
                type: "string",
                enum: ["none", "read", "comment", "edit", "create"],
              },
              profilePicUrl: { type: "string" },
            },
            title: field.name,
          };
          uiSchema[field.name] = { "ui:widget": "collaborator" };
          break;

        case "multipleCollaborators":
          jsonSchema.properties[field.name] = {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                email: { type: "string" },
                name: { type: "string" },
                permissionLevel: {
                  type: "string",
                  enum: ["none", "read", "comment", "edit", "create"],
                },
                profilePicUrl: { type: "string" },
              },
            },
            title: field.name,
          };
          uiSchema[field.name] = { "ui:widget": "collaborators" };
          break;
        case "singleSelect":
          jsonSchema.properties[field.name] = {
            type: "string",
            enum: field.options.choices.map((choice: any) => choice.name),
            title: field.name,
          };
          uiSchema[field.name] = { "ui:widget": "select" };
          break;

        case "checkbox":
          jsonSchema.properties[field.name] = {
            type: "boolean",
            title: field.name,
          };
          uiSchema[field.name] = { "ui:widget": "checkbox" };
          break;

        case "multipleSelects":
          jsonSchema.properties[field.name] = {
            type: "array",
            items: {
              type: "string",
              enum: field.options.choices.map((choice: any) => choice.name),
            },
            uniqueItems: true,
            title: field.name,
          };
          uiSchema[field.name] = { "ui:widget": "select" };
          break;

        default:
          jsonSchema.properties[field.name] = {
            type: "string",
            title: field.name,
          };
          uiSchema[field.name] = { "ui:widget": "text" };
      }
    });

    callback({
      fields: recordFields,
      schema: jsonSchema,
      uiSchema,
    });
  } catch (error) {
    console.log(`Error fetching record data`);
  }
};
// const pollAirtable = async () => {
//   try {
//     const response = await axios.get(
//       `https://api.airtable.com/v0/${airtableConfig.baseId}/${airtableConfig.tableId}/${airtableConfig.recordId}`,
//       {
//         headers: {
//           Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
//         },
//       }
//     );

//     const updatedData = response.data.fields;

//     io.to(airtableConfig.recordId).emit("sync", updatedData);
//   } catch (error: any) {
//     console.log(`Error polling Airtable: ${error}`);
//   }
// };

// setInterval(pollAirtable, 10000);

server.listen(PORT, () => {
  console.log(`Server is running on ${PORT}`);
});
