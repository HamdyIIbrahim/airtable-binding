"use client";
import { Form, Input, Button } from "antd";
import { useState } from "react";
import styles from "./page.module.css";
import { useRouter } from "next/navigation";
export default function Home() {
  const router = useRouter();
  const [form] = Form.useForm();
  const [formData, setFormData] = useState({});

  const onFinish = (values: {
    baseId: string;
    tableId: string;
    viewId: string;
    recordId: string;
  }) => {
    setFormData(values); // Capture form data
    console.log("Success:", values);
    router.push(
      `/rec-form/${values.baseId}/${values.tableId}/${values.viewId}/${values.recordId}`
    );
  };

  const onFinishFailed = (errorInfo: any) => {
    console.log("Failed:", errorInfo);
  };

  return (
    <main className={styles.main}>
      <div className={styles["airtable-info"]}>
        <h2>Simple Ant Design Form</h2>
        <Form
          form={form}
          name="basic"
          layout="vertical"
          initialValues={{ remember: true }}
          onFinish={onFinish}
          onFinishFailed={onFinishFailed}
          autoComplete="off"
        >
          {/* Input 1: BaseID */}
          <Form.Item
            label="BaseId"
            name="baseId"
            rules={[{ required: true, message: "Please enter your BaseId!" }]}
          >
            <Input />
          </Form.Item>

          {/* Input 2: TableId */}
          <Form.Item
            label="TableId"
            name="tableId"
            rules={[{ required: true, message: "Please input your TableId!" }]}
          >
            <Input />
          </Form.Item>

          {/* Input 3: viewId */}
          <Form.Item
            label="ViewId"
            name="viewId"
            rules={[{ required: true, message: "Please input your ViewId!" }]}
          >
            <Input />
          </Form.Item>

          {/* Input 4: recordId */}
          <Form.Item
            label="RecordId"
            name="recordId"
            rules={[{ required: true, message: "Please input your RecordId!" }]}
          >
            <Input />
          </Form.Item>

          {/* Submit Button */}
          <Form.Item>
            <Button type="primary" htmlType="submit">
              Submit
            </Button>
          </Form.Item>
        </Form>
      </div>
    </main>
  );
}
