"use client";
import React, { useEffect, useState } from "react";
import io from "socket.io-client";
import { useSyncedStore } from "@syncedstore/react";
import { syncedStore, getYjsValue } from "@syncedstore/core";
import { WebrtcProvider } from "y-webrtc";
import { withTheme } from "@rjsf/core";
import { Theme as AntDTheme } from "@rjsf/antd";
import validator from "@rjsf/validator-ajv8";
import { Layout, Spin, Card, Typography, Button, Alert, Select } from "antd";
const { Header, Content, Footer } = Layout;
const { Title } = Typography;

interface FormData {
  [key: string]: any;
}

const store = syncedStore({ formData: {} as FormData });
const doc = getYjsValue(store);
const noOpValidator = {
  validateFormData: () => ({
    valid: true,
    errors: [],
    errorSchema: {},
  }),
  toErrorList: () => [],
  isValid: () => true,
  rawValidation: () => ({
    valid: true,
    errors: [],
    errorSchema: {},
  }),
};
new WebrtcProvider("your-room-id", doc as any);

interface AirtableIds {
  params: {
    baseId: string;
    tableId: string;
    viewId: string;
    recordId: string;
  };
}

const socket = io("http://localhost:3001");

const SingleSelectWidget = (props: any) => {
  const { options, value, onChange } = props;

  return (
    <Select
      value={value}
      onChange={(val) => onChange(val)}
      style={{ width: "100%" }}
      placeholder="Select an option"
    >
      {options.enumOptions.map((option: any) => (
        <Select.Option key={option.value} value={option.value}>
          {option.label}
        </Select.Option>
      ))}
    </Select>
  );
};

const SingleCollaboratorWidget = (props: any) => {
  const { value, onChange, options } = props;

  return (
    <Select
      value={value ? value.id : undefined}
      onChange={(id) =>
        onChange({
          id: id,
          ...options.collaborators.find((c: any) => c.id === id),
        })
      }
      style={{ width: "100%" }}
      placeholder="Select a collaborator"
    >
      {options.collaborators.map((collaborator: any) => (
        <Select.Option key={collaborator.id} value={collaborator.id}>
          {collaborator.name}
        </Select.Option>
      ))}
    </Select>
  );
};

const MultipleCollaboratorsWidget = (props: any) => {
  const { value = [], onChange, options } = props;

  return (
    <Select
      mode="multiple"
      value={value.map((collab: any) => collab.id)}
      onChange={(ids) => {
        const updatedCollaborators = ids.map(
          (id: string) =>
            options.collaborators.find((collab: any) => collab.id === id) || {
              id,
            }
        );
        onChange(updatedCollaborators);
      }}
      style={{ width: "100%" }}
      placeholder="Select collaborators"
    >
      {options.collaborators?.map((collaborator: any) => (
        <Select.Option key={collaborator.id} value={collaborator.id}>
          {collaborator.name}
        </Select.Option>
      ))}
    </Select>
  );
};

const Page = ({ params }: AirtableIds) => {
  const Form = withTheme(AntDTheme);
  const [uiSchema, setUISchema] = useState<any>({});
  const [jsonSchema, setJsonSchema] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const syncedFormData = useSyncedStore(store).formData;
  useEffect(() => {
    const config = { ...params };
    socket.emit("setConfig", config);
    socket.emit("joinRoom", params.recordId);

    const handleDataUpdate = (data: any) => {
      Object.assign(store.formData, data.fields);
      const customUISchema = Object.keys(data.schema.properties || {}).reduce(
        (acc: any, key) => {
          const field = data.schema.properties[key];
          if (field.type === "string" && field.enum) {
            acc[key] = { "ui:widget": SingleSelectWidget };
          } else if (
            field.type === "array" &&
            field.items &&
            field.items.enum
          ) {
            acc[key] = { "ui:widget": "select" };
          }
          return acc;
        },
        {}
      );
      setUISchema(customUISchema);
      setJsonSchema(data.schema);
      setLoading(false);
    };

    const handleError = (err: any) => {
      setError("Failed to fetch data.");
      setLoading(false);
      console.error(err);
    };

    socket.on("recordData", handleDataUpdate);
    socket.on("update", (fields) => {
      Object.assign(store.formData, fields);
    });
    socket.on("sync", (fields) => {
      if (fields) {
        Object.assign(store.formData, fields);
      }
    });
    socket.on("error", handleError);

    return () => {
      socket.off("recordData", handleDataUpdate);
      socket.off("update");
      socket.off("sync");
      socket.off("error", handleError);
      socket.disconnect();
    };
  }, [params]);

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Header className="header">
        <Title className="custom title" level={2}>
          Airtable Record Form
        </Title>
      </Header>
      <Content style={{ padding: "0 50px" }}>
        <div className="site-layout-content">
          <Card className="card">
            {loading && <Spin size="large" />}
            {error && <Alert message={error} type="error" showIcon />}
            {!loading && !error && (
              <Form
                schema={jsonSchema}
                uiSchema={uiSchema}
                formData={syncedFormData}
                validator={noOpValidator}
                widgets={{
                  collaborator: SingleCollaboratorWidget,
                  collaborators: MultipleCollaboratorsWidget,
                }}
                className="custom-form"
              />
            )}
          </Card>
        </div>
      </Content>
      <Footer style={{ textAlign: "center" }}></Footer>
    </Layout>
  );
};

export default Page;
